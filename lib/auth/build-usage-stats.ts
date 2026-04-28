import { normalizeUserEmail } from "@/lib/auth/normalize-user-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Minimal /api/queue/metrics `usage` object for UpgradeModal / 402 responses. */
export async function buildUsageStats(userEmail: string): Promise<Record<string, unknown> | null> {
  const email = normalizeUserEmail(userEmail);
  if (!email) return null;
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("users")
    .select(
      "id, email, subscription_tier, plan_limit, appeals_generated_monthly, appeals_generated_weekly, appeals_generated_today, overage_count, billing_status, subscription_credits, bulk_credits, free_trial_generations_used"
    )
    .eq("email", email)
    .maybeSingle();
  if (error || !data) return null;
  const u = data as {
    id: string;
    email: string;
    subscription_tier: string | null;
    plan_limit: number;
    appeals_generated_monthly: number;
    appeals_generated_weekly: number;
    appeals_generated_today: number;
    overage_count: number;
    billing_status: string | null;
    subscription_credits: number;
    bulk_credits: number;
    free_trial_generations_used: number;
  };
  const planLimit = u.plan_limit || 0;
  const used = u.appeals_generated_monthly || 0;
  const usagePercentage = planLimit > 0 ? Math.min(100, (used / planLimit) * 100) : 0;
  const pctRounded = Math.round(usagePercentage * 10) / 10;
  let upgrade_status: "limit_reached" | "approaching_limit" | "warning" | null = null;
  if (planLimit > 0) {
    if (usagePercentage >= 100) upgrade_status = "limit_reached";
    else if (usagePercentage >= 90) upgrade_status = "approaching_limit";
    else if (usagePercentage >= 70) upgrade_status = "warning";
  }
  return {
    user_id: u.id,
    email: u.email,
    subscription_tier: u.subscription_tier,
    plan_limit: planLimit,
    appeals_generated_monthly: used,
    appeals_generated_weekly: u.appeals_generated_weekly,
    appeals_generated_today: u.appeals_generated_today,
    usage_percentage: pctRounded,
    overage_count: u.overage_count,
    billing_status: u.billing_status,
    can_generate: true,
    plan_usage_label: planLimit > 0 ? `${used}/${planLimit}` : "—",
    upgrade_status,
  };
}
