import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

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
 * Stripe Checkout — returns hosted checkout URL only (no auth, no user metadata).
 */
export async function POST(request: NextRequest) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return jsonResponse({ error: "Stripe is not configured" }, 500);
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const customerEmail = user?.email?.toLowerCase().trim() || undefined;

    let body: {
      price_id?: string;
      plan?: string;
      mode?: "subscription" | "payment";
      type?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

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

    const root = baseUrl.replace(/\/$/, "");
    const successUrl = `${root}/login?paid=true`;
    const cancelUrl = `${root}/pricing`;

    const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    });

    if (!session.url) {
      return jsonResponse({ error: "Stripe did not return a checkout URL" }, 500);
    }

    return jsonResponse({ url: session.url }, 200);
  } catch (error) {
    console.error("[create-checkout-session] error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
