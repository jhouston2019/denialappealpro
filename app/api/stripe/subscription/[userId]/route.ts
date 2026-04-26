import { NextRequest, NextResponse } from "next/server";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ userId: string }> };

/**
 * Port of legacy GET /api/stripe/subscription/:userId for BillingManagement.
 * Returns plan + status from public.users (no live Stripe fetch).
 */
export async function GET(_request: NextRequest, context: Ctx) {
  const { userId } = await context.params;
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  if (userId !== r.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("users")
    .select("subscription_tier, billing_status")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const row = data as { subscription_tier: string | null; billing_status: string | null };
  if (!row.subscription_tier) {
    return NextResponse.json(null, { status: 200 });
  }
  return NextResponse.json(
    {
      plan: row.subscription_tier,
      status: row.billing_status || "active",
      cancel_at_period_end: false,
    },
    { status: 200 }
  );
}
