import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { processCheckoutSessionCompletedEvent, STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhooks (e.g. Netlify/Vercel without the separate function).
 * Configure endpoint URL in Stripe Dashboard: `/api/webhooks/stripe`
 */
export async function POST(request: NextRequest) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!whSecret || !stripeKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_VERSION });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, skipped: true });
  }

  const result = await processCheckoutSessionCompletedEvent(event, stripe);
  return NextResponse.json(result.body, { status: result.statusCode });
}
