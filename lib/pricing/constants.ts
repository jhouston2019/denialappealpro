/**
 * Matches backend/credit_manager.PricingManager (Flask /api/pricing/plans).
 */
export const RETAIL_PRICE = 79.0;

export const SUBSCRIPTION_TIERS: Record<
  "starter" | "core" | "scale",
  { name: string; monthly_price: number; included_appeals: number; overage_price: number }
> = {
  starter: {
    name: "Starter",
    monthly_price: 199.0,
    included_appeals: 15,
    overage_price: 15.0,
  },
  core: {
    name: "Growth",
    monthly_price: 399.0,
    included_appeals: 40,
    overage_price: 12.0,
  },
  scale: {
    name: "Scale",
    monthly_price: 799.0,
    included_appeals: 120,
    overage_price: 10.0,
  },
};
