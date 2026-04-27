import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { planLimitForCheckout } from "@/lib/billing/plan-limit";
import { ensureStripeBootstrapAuth } from "@/lib/auth/ensure-stripe-bootstrap-auth";
import { requireStripeBootstrapSecret } from "@/lib/auth/stripe-bootstrap-password";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

function jsonResponse(data: Record<string, string>, status: number) {
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
 * Stripe Checkout: `metadata.user_id` is the only post-payment identity key.
 * Auth + public.users exist before the Stripe session; session bootstrap password is
 * set so `/api/auth/create-session-from-stripe` can `signInWithPassword` immediately.
 */
export async function POST(request: NextRequest) {
  try {
    requireStripeBootstrapSecret();
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return jsonResponse({ error: "Stripe is not configured" }, 500);
    }

    let body: {
      price_id?: string;
      plan?: string;
      email?: string;
      mode?: "subscription" | "payment";
      type?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    let priceId = (body.price_id || "").trim();
    const plan = (body.plan || "").trim();
    const mode: "subscription" | "payment" =
      body.mode === "payment" || body.type === "payment" ? "payment" : "subscription";

    if (!plan) {
      return jsonResponse({ error: "plan is required" }, 400);
    }

    const email = (body.email || "").trim().toLowerCase();
    if (!email) {
      return jsonResponse({ error: "email is required" }, 400);
    }

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

    if (mode !== "subscription" && mode !== "payment") {
      return jsonResponse({ error: "mode must be subscription or payment" }, 400);
    }

    const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });

    let supabase: ReturnType<typeof createServiceRoleClient>;
    try {
      supabase = createServiceRoleClient();
    } catch (e) {
      console.error("[create-checkout-session] Supabase service role not configured", e);
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const { data: rowByEmail, error: exErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (exErr) {
      console.error("[create-checkout-session] users lookup", exErr);
      return jsonResponse({ error: "Could not prepare checkout" }, 500);
    }

    let userId: string;
    if (rowByEmail?.id) {
      userId = await ensureStripeBootstrapAuth(supabase, rowByEmail.id, email);
    } else {
      const proposed = randomUUID();
      userId = await ensureStripeBootstrapAuth(supabase, proposed, email);
      const { data: urow } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
      if (!urow) {
        const { error: insErr } = await supabase.from("users").insert({
          id: userId,
          email,
          is_paid: false,
          subscription_tier: plan,
          plan_limit: planLimitForCheckout(plan, mode),
        });
        if (insErr) {
          if (insErr.code === "23505") {
            const { data: again } = await supabase
              .from("users")
              .select("id")
              .eq("email", email)
              .maybeSingle();
            if (again?.id) {
              userId = await ensureStripeBootstrapAuth(supabase, again.id, email);
            } else {
              console.error("[create-checkout-session] insert public.users", insErr);
              return jsonResponse({ error: "Could not prepare checkout" }, 500);
            }
          } else {
            console.error("[create-checkout-session] insert public.users", insErr);
            return jsonResponse({ error: "Could not prepare checkout" }, 500);
          }
        }
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        user_id: userId,
        email,
        plan,
      },
    };

    if (mode === "subscription" && !sessionParams.subscription_data) {
      sessionParams.subscription_data = {
        metadata: {
          user_id: userId,
          email,
          plan,
        },
      };
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
