import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Stripe-first checkout. Does not create or touch public.users.
 * Request JSON: { price_id: string, plan: string, email?: string, mode?: "subscription" | "payment" }
 * Metadata on session: price_id, plan (and optional extra keys).
 */
export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  let body: {
    price_id?: string;
    plan?: string;
    email?: string;
    mode?: "subscription" | "payment";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const priceId = (body.price_id || "").trim();
  const plan = (body.plan || "").trim();
  if (!priceId || !plan) {
    return NextResponse.json({ error: "price_id and plan are required" }, { status: 400 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl?.origin || new URL(request.url).origin;
  if (!baseUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is not set" }, { status: 500 });
  }

  const successUrl = `${baseUrl.replace(/\/$/, "")}/welcome?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl.replace(/\/$/, "")}/pricing`;

  const mode = body.mode || "subscription";
  if (mode !== "subscription" && mode !== "payment") {
    return NextResponse.json({ error: "mode must be subscription or payment" }, { status: 400 });
  }

  const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  const email = (body.email || "").trim().toLowerCase();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      price_id: priceId,
      plan,
    },
  };

  if (email) {
    sessionParams.customer_email = email;
  }

  if (mode === "subscription" && !sessionParams.subscription_data) {
    sessionParams.subscription_data = {
      metadata: {
        price_id: priceId,
        plan,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return NextResponse.json({ session_id: session.id });
}
