import type { SubscriptionTierSlug } from "@/lib/billing/subscription-tier";
import { normalizeSubscriptionTier } from "@/lib/billing/subscription-tier";

/** Monthly appeal allowance per tier; one-time payment mode uses 1. */
export function planLimitForCheckout(
  rawPlan: string,
  mode: "subscription" | "payment"
): number {
  if (mode === "payment") {
    return 1;
  }
  return planLimitForTierKey(normalizeSubscriptionTier(rawPlan) ?? (rawPlan || "").toLowerCase().trim());
}

function planLimitForTierKey(tier: string | SubscriptionTierSlug | null | undefined): number {
  const k = (tier || "").toLowerCase();
  if (k === "essential" || k === "starter") return 25;
  if (k === "professional" || k === "core") return 100;
  if (k === "enterprise" || k === "scale") return 500;
  return 0;
}

export function planLimitForPaidTier(
  rawTier: string | null,
  isSubscription: boolean
): number {
  if (!isSubscription) {
    return 1;
  }
  const t = `${rawTier || ""}`.toLowerCase().trim();
  return planLimitForTierKey(normalizeSubscriptionTier(t) ?? t);
}
