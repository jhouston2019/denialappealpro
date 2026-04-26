import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * /api/admin/dashboard/stats + users_by_tier (plan breakdown).
 */
export async function GET(request: NextRequest) {
  const auth = await getAdminFromRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createServiceRoleClient();
  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 30);

  const [
    appealsTotal,
    usersTotal,
    paidRows,
    recent30,
    qrows,
    crows,
    outcomeAny,
    outcomeApproved,
    recoveredRows,
    allUsersTiers,
  ] = await Promise.all([
    supabase.from("appeals").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("appeals").select("price_charged").eq("payment_status", "paid"),
    supabase
      .from("appeals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirty.toISOString()),
    supabase
      .from("appeals")
      .select("ai_quality_score")
      .not("ai_quality_score", "is", null)
      .limit(5000),
    supabase
      .from("appeals")
      .select("ai_citation_count")
      .not("ai_citation_count", "is", null)
      .limit(5000),
    supabase
      .from("appeals")
      .select("id", { count: "exact", head: true })
      .not("outcome_status", "is", null),
    supabase
      .from("appeals")
      .select("id", { count: "exact", head: true })
      .eq("outcome_status", "approved"),
    supabase
      .from("appeals")
      .select("outcome_amount_recovered")
      .not("outcome_amount_recovered", "is", null)
      .limit(5000),
    supabase.from("users").select("subscription_tier").limit(5000),
  ]);

  let totalRevenue = 0;
  for (const r of (paidRows.data || []) as { price_charged: number | null }[]) {
    totalRevenue += parseFloat(String(r.price_charged ?? 0)) || 0;
  }

  const appealsWithOutcomes = outcomeAny.count ?? 0;
  const approved = outcomeApproved.count ?? 0;
  const successRate = appealsWithOutcomes > 0 ? (approved / appealsWithOutcomes) * 100 : 0;

  let totalRecovered = 0;
  for (const r of (recoveredRows.data || []) as { outcome_amount_recovered: number | null }[]) {
    totalRecovered += parseFloat(String(r.outcome_amount_recovered ?? 0)) || 0;
  }

  const qr = (qrows.data || []) as { ai_quality_score: number | null }[];
  const avgQ =
    qr.length > 0
      ? round1(
          qr.reduce((a, b) => a + (parseFloat(String(b.ai_quality_score)) || 0), 0) / qr.length
        )
      : null;

  const cr = (crows.data || []) as { ai_citation_count: number | null }[];
  const avgC =
    cr.length > 0
      ? round1(
          cr.reduce((a, b) => a + (parseFloat(String(b.ai_citation_count)) || 0), 0) / cr.length
        )
      : null;

  const tierMap: Record<string, number> = {
    essential: 0,
    professional: 0,
    enterprise: 0,
    other: 0,
  };
  for (const u of (allUsersTiers.data || []) as { subscription_tier: string | null }[]) {
    const t = (u.subscription_tier || "").toLowerCase();
    if (!t) {
      tierMap.other += 1;
      continue;
    }
    if (t === "starter" || t === "essential") tierMap.essential += 1;
    else if (t === "core" || t === "professional") tierMap.professional += 1;
    else if (t === "scale" || t === "enterprise") tierMap.enterprise += 1;
    else tierMap.other += 1;
  }

  return NextResponse.json(
    {
      totals: {
        appeals: appealsTotal.count ?? 0,
        users: usersTotal.count ?? 0,
        revenue: totalRevenue,
        recovered: totalRecovered,
      },
      recent: {
        appeals_30d: recent30.count ?? 0,
      },
      ai_quality: {
        avg_quality_score: avgQ,
        avg_citation_count: avgC,
      },
      outcomes: {
        total_with_outcomes: appealsWithOutcomes,
        approved,
        success_rate: round1(successRate),
      },
      users_by_tier: tierMap,
    },
    { status: 200 }
  );
}
