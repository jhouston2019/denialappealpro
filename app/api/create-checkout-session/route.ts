import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";

function resolvePriceIdFromPlan(
  plan: string,
  mode: "subscription" | "payment"
): string | null {
  const p = plan.toLowerCase();
  if (mode === "payment" || p === "retail" || p === "payg") {
    const id = process.env.STRIPE_RETAIL_PRICE_ID?.trim();
    return id || null;
  }
  if (p === "essential" || p === "starter") {
    return (
      process.env.STRIPE_ESSENTIAL_PRICE_ID?.trim() ||
      process.env.STRIPE_STARTER_PRICE_ID?.trim() ||
      null
    );
  }
  if (p === "professional" || p === "core") {
    return (
      process.env.STRIPE_PROFESSIONAL_PRICE_ID?.trim() || process.env.STRIPE_CORE_PRICE_ID?.trim() || null
    );
  }
  if (p === "enterprise" || p === "scale") {
    return (
      process.env.STRIPE_ENTERPRISE_PRICE_ID?.trim() || process.env.STRIPE_SCALE_PRICE_ID?.trim() || null
    );
  }
  return null;
}

/**
 * Stripe checkout.
 *
 * New: { price_id, plan, email?, mode? }
 * { email, plan: "essential"|"professional"|"enterprise", type: "subscription" } — legacy starter/core/scale still resolve.
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
    /** CRA compatibility */
    type?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let priceId = (body.price_id || "").trim();
  const plan = (body.plan || "").trim();
  const mode: "subscription" | "payment" =
    body.mode === "payment" || body.type === "payment" ? "payment" : "subscription";

  if (!plan) {
    return NextResponse.json({ error: "plan is required" }, { status: 400 });
  }

  if (!priceId) {
    const resolved = resolvePriceIdFromPlan(plan, mode);
    if (!resolved) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid price: pass price_id or set STRIPE_ESSENTIAL_PRICE_ID, STRIPE_PROFESSIONAL_PRICE_ID, STRIPE_ENTERPRISE_PRICE_ID (legacy STRIPE_*_PRICE_ID aliases supported; STRIPE_RETAIL_PRICE_ID for pay-as-you-go).",
        },
        { status: 400 }
      );
    }
    priceId = resolved;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl?.origin || new URL(request.url).origin;
  if (!baseUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is not set" }, { status: 500 });
  }

  const successUrl = `${baseUrl.replace(/\/$/, "")}/welcome?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl.replace(/\/$/, "")}/pricing`;

  if (mode !== "subscription" && mode !== "payment") {
    return NextResponse.json({ error: "mode must be subscription or payment" }, { status: 400 });
  }

  const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });
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
