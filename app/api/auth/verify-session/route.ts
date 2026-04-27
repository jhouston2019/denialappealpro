import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";

const JSON_HDR = { "Content-Type": "application/json" } as const;

export const runtime = "nodejs";

type GenerateLinkData = {
  properties?: { action_link?: string };
};

export async function POST(request: NextRequest) {
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

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500, headers: JSON_HDR });
  }

  const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.error("[verify-session] Stripe retrieve failed:", e);
    return NextResponse.json({ error: "Invalid or unknown checkout session" }, { status: 400, headers: JSON_HDR });
  }

  if (session.status !== "complete") {
    return NextResponse.json({ error: "Checkout is not complete" }, { status: 400, headers: JSON_HDR });
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400, headers: JSON_HDR });
  }

  const email = (`${session.customer_email || ""}`.trim() || `${session.customer_details?.email || ""}`.trim())
    .toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "No email on checkout session" }, { status: 400, headers: JSON_HDR });
  }

  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    console.error("[verify-session] Supabase service role not configured", e);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500, headers: JSON_HDR });
  }

  const { data, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) {
    console.error("[verify-session] generateLink failed:", linkErr);
    return NextResponse.json(
      { error: linkErr.message || "Could not start sign-in" },
      { status: 500, headers: JSON_HDR }
    );
  }

  const link = (data as GenerateLinkData | null)?.properties?.action_link;
  if (!link || typeof link !== "string") {
    return NextResponse.json({ error: "No action link from auth" }, { status: 500, headers: JSON_HDR });
  }

  return NextResponse.json({ link } as const, { status: 200, headers: JSON_HDR });
}
