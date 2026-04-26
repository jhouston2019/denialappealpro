/** Ported from frontend/src/utils/stripe.js */

export function formatPlanName(plan: string | null | undefined) {
  const names: Record<string, string> = {
    starter: "Starter",
    core: "Growth",
    scale: "Scale",
  };
  return plan ? (names[plan.toLowerCase()] ?? plan) : "—";
}

export function getPlanDetails(plan: string | null | undefined) {
  const plans: Record<string, { name: string; price: number; appeals: number; description: string }> = {
    starter: {
      name: "Starter",
      price: 199,
      appeals: 15,
      description: "Perfect for small practices",
    },
    core: {
      name: "Growth",
      price: 399,
      appeals: 40,
      description: "Most popular for billing teams",
    },
    scale: {
      name: "Scale",
      price: 799,
      appeals: 120,
      description: "For high-volume operations",
    },
  };
  if (!plan) return null;
  return plans[plan.toLowerCase()] ?? null;
}
