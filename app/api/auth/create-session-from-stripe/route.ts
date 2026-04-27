import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getStripeSessionBootstrapPassword,
  requireStripeBootstrapSecret,
} from "@/lib/auth/stripe-bootstrap-password";
import { applyPaidStateFromCheckoutSession } from "@/lib/stripe/apply-checkout-session-to-user";
import { STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const JSON_HDR = { "Content-Type": "application/json" } as const;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  requireStripeBootstrapSecret();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500, headers: JSON_HDR });
  }

  let body: { session_id?: string };
  try {
    body = (await request.json()) as { session_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: JSON_HDR });
  }
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400, headers: JSON_HDR });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500, headers: JSON_HDR });
  }

  const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.error("[create-session-from-stripe] retrieve failed:", e);
    return NextResponse.json({ error: "Invalid checkout session" }, { status: 400, headers: JSON_HDR });
  }

  const applied = await applyPaidStateFromCheckoutSession(session);
  if (!applied.ok) {
    return NextResponse.json(
      { error: applied.error },
      { status: applied.code === "metadata" ? 400 : 500, headers: JSON_HDR }
    );
  }

  const supabaseSvc = createServiceRoleClient();
  const { data: urow, error: rowErr } = await supabaseSvc
    .from("users")
    .select("id, email, is_paid")
    .eq("id", applied.userId)
    .maybeSingle();
  if (rowErr || !urow) {
    return NextResponse.json({ error: "User not found" }, { status: 500, headers: JSON_HDR });
  }
  if (urow.is_paid !== true) {
    return NextResponse.json({ error: "Entitlement not applied" }, { status: 500, headers: JSON_HDR });
  }

  const customerEmail = (
    (session.customer_email || session.customer_details?.email || "") as string
  )
    .trim()
    .toLowerCase();
  if (customerEmail && urow.email.trim().toLowerCase() !== customerEmail) {
    return NextResponse.json({ error: "Session email does not match user" }, { status: 400, headers: JSON_HDR });
  }

  const email = (urow.email as string).trim().toLowerCase();
  const password = getStripeSessionBootstrapPassword(urow.id as string);

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* ignore if cookie store is read-only in this context */
        }
      },
    },
  });

  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) {
    console.error("[create-session-from-stripe] signInWithPassword:", signErr);
    return NextResponse.json({ error: "Could not establish session" }, { status: 500, headers: JSON_HDR });
  }

  return NextResponse.json({ ok: true } as const, { status: 200, headers: JSON_HDR });
}
