import { randomBytes } from "crypto";
import type Stripe from "stripe";
import { planLimitForPaidTier } from "@/lib/billing/plan-limit";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { normalizeSubscriptionTier } from "@/lib/billing/subscription-tier";

const STRIPE_VERSION = "2025-02-24.acacia" as const;

type ProcessResult = { statusCode: number; body: Record<string, unknown> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Idempotent: checkout.session.completed → update public.users by session.metadata.user_id
 * and provision auth. Post-payment sign-in is handled on /welcome via verify-session.
 */
export async function processCheckoutSessionCompletedEvent(
  stripeEvent: Stripe.Event,
  _stripe: Stripe
): Promise<ProcessResult> {
  if (stripeEvent.type !== "checkout.session.completed") {
    return { statusCode: 200, body: { received: true, skipped: true } };
  }

  const supabase = createServiceRoleClient();

  const { data: existingEv } = await supabase
    .from("processed_webhook_events")
    .select("id")
    .eq("event_id", stripeEvent.id)
    .maybeSingle();
  if (existingEv) {
    return { statusCode: 200, body: { received: true, duplicate: true } };
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session;
  if (session.status !== "complete") {
    return { statusCode: 200, body: { received: true, ignored: "incomplete" } };
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { statusCode: 200, body: { received: true, ignored: "payment" } };
  }

  const metadata = session.metadata || {};
  const userId = `${metadata.user_id || ""}`.trim();
  const linkEmail = `${metadata.email || ""}`.trim().toLowerCase();
  if (!userId || !UUID_RE.test(userId) || !linkEmail) {
    console.error("Missing or invalid user_id / email in session metadata", session.id);
    return { statusCode: 400, body: { error: "Missing user_id or email in session metadata" } };
  }

  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subId = typeof session.subscription === "string" ? session.subscription : null;
  const isSubscription = session.mode === "subscription" || subId != null;
  const rawPlan = `${metadata.plan || ""}`.toLowerCase().trim();
  const subscriptionTier = normalizeSubscriptionTier(rawPlan) ?? (rawPlan ? rawPlan : null);
  const planLimit = planLimitForPaidTier(subscriptionTier, isSubscription);

  const { data: updatedRows, error: upErr } = await supabase
    .from("users")
    .update({
      is_paid: true,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
      plan_limit: planLimit,
      subscription_tier: subscriptionTier,
      payment_verification_status: null,
    })
    .eq("id", userId)
    .select("id");
  if (upErr) {
    console.error("[webhook] users update failed:", upErr);
    return { statusCode: 500, body: { error: "Users update failed" } };
  }
  if (!updatedRows?.length) {
    console.error("[webhook] no public.users row for id", userId, session.id);
    return { statusCode: 500, body: { error: "User profile not found" } };
  }

  const { data: getData, error: gErr } = await supabase.auth.admin.getUserById(userId);
  if (gErr) {
    console.error("[webhook] getUserById:", gErr);
  }
  if (!getData?.user) {
    const tempPassword = randomBytes(32).toString("base64url");
    const { error: cErr } = await supabase.auth.admin.createUser({
      id: userId,
      email: linkEmail,
      email_confirm: true,
      password: tempPassword,
      app_metadata: { source: "stripe_checkout" },
    });
    if (cErr) {
      const { data: retry } = await supabase.auth.admin.getUserById(userId);
      if (!retry?.user) {
        console.error("[webhook] createUser failed:", cErr);
        return { statusCode: 500, body: { error: "Auth user create failed" } };
      }
    }
  } else {
    const { error: uErr } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (uErr) {
      console.error("[webhook] updateUserById (confirm) failed:", uErr);
    }
  }

  const { error: peErr } = await supabase.from("processed_webhook_events").insert({
    event_id: stripeEvent.id,
    event_type: stripeEvent.type,
  });
  if (peErr) {
    if (peErr.code === "23505") {
      return { statusCode: 200, body: { received: true, idempotent: true } };
    }
    console.error("Record webhook event failed:", peErr);
    return { statusCode: 500, body: { error: "Failed to record event" } };
  }

  return { statusCode: 200, body: { received: true, ok: true } };
}

export { STRIPE_VERSION };
