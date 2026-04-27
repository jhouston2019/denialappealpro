import type Stripe from "stripe";
import { planLimitForPaidTier } from "@/lib/billing/plan-limit";
import { normalizeSubscriptionTier } from "@/lib/billing/subscription-tier";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Idempotent: apply paid entitlement from a completed, paid Checkout Session to `public.users`
 * by `metadata.user_id` (the only post-payment identity key).
 */
export async function applyPaidStateFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<{ ok: true; userId: string } | { ok: false; error: string; code: "metadata" | "db" }> {
  if (session.status !== "complete") {
    return { ok: false, error: "Checkout is not complete", code: "metadata" };
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { ok: false, error: "Payment not complete", code: "metadata" };
  }

  const metadata = session.metadata || {};
  const userId = `${metadata.user_id || ""}`.trim();
  const metaEmail = `${metadata.email || ""}`.trim().toLowerCase();
  if (!userId || !UUID_RE.test(userId) || !metaEmail) {
    return { ok: false, error: "Invalid or missing user_id in session metadata", code: "metadata" };
  }

  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subId = typeof session.subscription === "string" ? session.subscription : null;
  const isSubscription = session.mode === "subscription" || subId != null;
  const rawPlan = `${metadata.plan || ""}`.toLowerCase().trim();
  const subscriptionTier = normalizeSubscriptionTier(rawPlan) ?? (rawPlan ? rawPlan : null);
  const planLimit = planLimitForPaidTier(subscriptionTier, isSubscription);

  const supabase = createServiceRoleClient();
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
    .eq("email", metaEmail)
    .select("id, email");

  if (upErr) {
    console.error("[apply-checkout] users update failed:", upErr);
    return { ok: false, error: "User update failed", code: "db" };
  }
  if (!updatedRows?.length) {
    return { ok: false, error: "User profile not found for this checkout", code: "db" };
  }

  return { ok: true, userId };
}
