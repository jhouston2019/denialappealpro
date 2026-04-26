/**
 * Canonical subscription tier slugs (Stripe checkout `plan` + public.users.subscription_tier).
 * Legacy: starter, core, scale (normalized on webhook and in displays).
 */
export type SubscriptionTierSlug = "essential" | "professional" | "enterprise";

const LEGACY: Record<string, SubscriptionTierSlug> = {
  starter: "essential",
  core: "professional",
  scale: "enterprise",
  essential: "essential",
  professional: "professional",
  enterprise: "enterprise",
};

/** Map checkout metadata or DB value to a canonical tier, or null if unknown. */
export function normalizeSubscriptionTier(raw: string | null | undefined): SubscriptionTierSlug | null {
  const k = (raw || "").toLowerCase().trim();
  if (!k) return null;
  return LEGACY[k] ?? null;
}
