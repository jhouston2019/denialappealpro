import { normalizeSubscriptionTier, type SubscriptionTierSlug } from "./subscription-tier";

const DISPLAY: Record<SubscriptionTierSlug, string> = {
  essential: "Essential",
  professional: "Professional",
  enterprise: "Enterprise",
};

export function formatPlanName(plan: string | null | undefined) {
  if (!plan) return "—";
  const n = normalizeSubscriptionTier(plan);
  if (n) return DISPLAY[n];
  return plan;
}

export function getPlanDetails(plan: string | null | undefined) {
  const n = plan ? normalizeSubscriptionTier(plan) : null;
  const plans: Record<
    SubscriptionTierSlug,
    { name: string; price: number; appeals: number; description: string }
  > = {
    essential: {
      name: "Essential",
      price: 399,
      appeals: 10,
      description: "Core monthly capacity for small billing teams",
    },
    professional: {
      name: "Professional",
      price: 699,
      appeals: 25,
      description: "Batch tools and higher volume for growing practices",
    },
    enterprise: {
      name: "Enterprise",
      price: 1499,
      appeals: 75,
      description: "Maximum volume, dedicated support, and custom templates",
    },
  };
  if (!n) return null;
  return plans[n] ?? null;
}
