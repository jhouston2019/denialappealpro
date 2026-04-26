import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";

/**
 * Self-service billing portal (manage plan, payment method). Requires Stripe customer on file.
 */
export async function POST(request: NextRequest) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const svc = createServiceRoleClient();
  const { data: row, error } = await svc
    .from("users")
    .select("stripe_customer_id")
    .eq("id", r.userId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  const customerId = (row as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "No billing account on file" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl?.origin || new URL(request.url).origin;
  const returnUrl = `${String(baseUrl).replace(/\/$/, "")}/account`;

  const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  if (!session.url) {
    return NextResponse.json({ error: "Portal URL missing" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url }, { status: 200 });
}
