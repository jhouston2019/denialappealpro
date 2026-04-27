import { NextRequest } from "next/server";
import Stripe from "stripe";
import { STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

function jsonResponse(data: Record<string, string | number | boolean>, status: number) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function resolvePriceIdFromPlan(
  plan: string,
  mode: "subscription" | "payment"
): string | null {
  const p = plan.toLowerCase();
  if (mode === "payment") {
    return process.env.STRIPE_PRICE_SINGLE?.trim() || null;
  }
  if (p === "essential" || p === "starter") {
    return process.env.STRIPE_PRICE_ESSENTIAL_SUBSCRIPTION?.trim() || null;
  }
  if (p === "professional" || p === "core") {
    return process.env.STRIPE_PRICE_PROFESSIONAL_SUBSCRIPTION?.trim() || null;
  }
  if (p === "enterprise" || p === "scale") {
    return process.env.STRIPE_PRICE_ENTERPRISE_SUBSCRIPTION?.trim() || null;
  }
  return null;
}

/**
 * Stripe Checkout — anonymous; account is created on /success after payment.
 */
export async function POST(request: NextRequest) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return jsonResponse({ error: "Stripe is not configured" }, 500);
    }

    let body: {
      price_id?: string;
      plan?: string;
      mode?: "subscription" | "payment";
      type?: string;
      email?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const bodyEmail = (body.email || "").trim().toLowerCase();
    const plan = (body.plan || "").trim();
    const mode: "subscription" | "payment" =
      body.mode === "payment" || body.type === "payment" ? "payment" : "subscription";

    if (!plan) {
      return jsonResponse({ error: "plan is required" }, 400);
    }

    let priceId = (body.price_id || "").trim();
    if (!priceId) {
      const resolved = resolvePriceIdFromPlan(plan, mode);
      if (!resolved) {
        return jsonResponse(
          {
            error:
              "Missing or invalid price: pass price_id or set STRIPE_PRICE_SINGLE (one-time) or STRIPE_PRICE_ESSENTIAL_SUBSCRIPTION, STRIPE_PRICE_PROFESSIONAL_SUBSCRIPTION, STRIPE_PRICE_ENTERPRISE_SUBSCRIPTION (subscriptions).",
          },
          400
        );
      }
      priceId = resolved;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl?.origin || new URL(request.url).origin;
    if (!baseUrl) {
      return jsonResponse({ error: "NEXT_PUBLIC_SITE_URL is not set" }, 500);
    }

    const successUrl = `${baseUrl.replace(/\/$/, "")}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl.replace(/\/$/, "")}/pricing`;

    const metadata: Record<string, string> = { plan };
    if (bodyEmail) {
      metadata.email = bodyEmail;
    }

    const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    };
    if (bodyEmail) {
      sessionParams.customer_email = bodyEmail;
    }

    if (mode === "subscription" && !sessionParams.subscription_data) {
      const subMetadata: Record<string, string> = { plan };
      if (bodyEmail) {
        subMetadata.email = bodyEmail;
      }
      sessionParams.subscription_data = { metadata: subMetadata };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return jsonResponse({ session_id: session.id }, 200);
  } catch (error) {
    console.error("[create-checkout-session] error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
