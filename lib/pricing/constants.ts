/**
 * DAP subscription tiers (Next /api/pricing/plans). Amounts align with product pricing page.
 */
export const RETAIL_PRICE = 79.0;

export const SUBSCRIPTION_TIERS: Record<
  "essential" | "professional" | "enterprise",
  { name: string; monthly_price: number; included_appeals: number; overage_price: number }
> = {
  essential: {
    name: "Essential",
    monthly_price: 399.0,
    included_appeals: 10,
    overage_price: 15.0,
  },
  professional: {
    name: "Professional",
    monthly_price: 699.0,
    included_appeals: 25,
    overage_price: 12.0,
  },
  enterprise: {
    name: "Enterprise",
    monthly_price: 1499.0,
    included_appeals: 75,
    overage_price: 10.0,
  },
};
