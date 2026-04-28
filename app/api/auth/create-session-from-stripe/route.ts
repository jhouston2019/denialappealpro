import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e || null;
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = (body.session_id || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

  let stripeSession: Stripe.Checkout.Session;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });
  } catch (err) {
    console.error("[create-session-from-stripe] Stripe retrieve failed", err);
    return NextResponse.json({ error: "Could not retrieve Stripe session" }, { status: 400 });
  }

  const email = normalizeEmail(
    stripeSession.customer_details?.email || stripeSession.customer_email
  );
  if (!email) {
    return NextResponse.json({ error: "No email found in Stripe session" }, { status: 400 });
  }

  let svc: ReturnType<typeof createServiceRoleClient>;
  try {
    svc = createServiceRoleClient();
  } catch (err) {
    console.error("[create-session-from-stripe] service role failed", err);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Find or create Supabase auth user
  let authUserId: string | null = null;

  const { data: existingRow } = await svc
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingRow?.id) {
    authUserId = String(existingRow.id);
  } else {
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (!createErr && created.user?.id) {
      authUserId = created.user.id;
    } else {
      // User already exists in auth but not in public.users — find them
      const msg = (createErr?.message || "").toLowerCase();
      const isDuplicate =
        createErr?.status === 422 ||
        msg.includes("already") ||
        msg.includes("registered");
      if (isDuplicate) {
        const { data: page1 } = await svc.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const found = page1?.users?.find(
          (u) => (u.email || "").toLowerCase() === email
        );
        if (found?.id) authUserId = found.id;
      }
    }
  }

  if (!authUserId) {
    console.error("[create-session-from-stripe] could not resolve auth user for", email);
    return NextResponse.json({ error: "Could not resolve user account" }, { status: 500 });
  }

  // Upsert public.users row — do NOT set is_paid here
  // is_paid is set exclusively by /api/verify-payment after polling confirms webhook fired
  const { error: upsertErr } = await svc.from("users").upsert(
    { id: authUserId, email },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (upsertErr) {
    console.error("[create-session-from-stripe] upsert failed", upsertErr);
    return NextResponse.json({ error: "Failed to create user record" }, { status: 500 });
  }

  // Generate a one-time sign-in token for silent browser session establishment
  let signInToken: string | null = null;
  let signInEmail: string | null = null;
  try {
    const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (!linkErr && linkData?.properties?.hashed_token) {
      signInToken = linkData.properties.hashed_token;
      signInEmail = email;
    }
  } catch {
    // non-fatal — browser will fall back to verify-payment poll
  }

  return NextResponse.json({
    ok: true,
    email,
    sign_in_token: signInToken,
    sign_in_email: signInEmail,
  });
}
