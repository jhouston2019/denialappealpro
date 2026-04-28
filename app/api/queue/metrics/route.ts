import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidAppUser } from "@/lib/api/require-authenticated-user";
import { buildUsageStats } from "@/lib/auth/build-usage-stats";

/**
 * Summary metrics for DenialQueue (legacy GET /api/queue/metrics).
 * Retention dashboard slice is stubbed until retention tables are wired in Next.
 */
export async function GET() {
  const r = await requirePaidAppUser();
  if (!r.ok) return r.response;
  const svc = createServiceRoleClient();
  const uid = r.userId;

  const { data: all, error: e1 } = await svc.from("appeals").select("id, billed_amount, outcome_amount_recovered").eq("user_id", uid);
  if (e1) return NextResponse.json({ error: "Metrics failed" }, { status: 500 });

  const rows = all || [];
  const total = rows.length;
  const atRisk = rows.reduce((s, x) => s + (parseFloat(String((x as { billed_amount: unknown }).billed_amount || 0)) || 0), 0);
  const recovered = rows.reduce(
    (s, x) => s + (parseFloat(String((x as { outcome_amount_recovered: unknown }).outcome_amount_recovered || 0)) || 0),
    0
  );

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const todayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0)).toISOString();

  const { count: addedToday } = await svc
    .from("appeals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .gte("created_at", todayStart)
    .lt("created_at", todayEnd);

  const { count: processedToday } = await svc
    .from("appeals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .gte("last_generated_at", todayStart)
    .lt("last_generated_at", todayEnd);

  const usage = await buildUsageStats(uid);

  const est = rows
    .filter(
      (x) =>
        ["generated", "submitted"].includes(String((x as { queue_status?: string }).queue_status || "")) &&
        (!(x as { outcome_amount_recovered: unknown }).outcome_amount_recovered ||
          parseFloat(String((x as { outcome_amount_recovered: unknown }).outcome_amount_recovered)) === 0)
    )
    .reduce((s, x) => s + 0.35 * (parseFloat(String((x as { billed_amount: unknown }).billed_amount || 0)) || 0), 0);

  const displayRecovered = recovered > 0 ? round2(recovered) : round2(est);

  return NextResponse.json(
    {
      total_in_queue: total,
      processed_today: processedToday ?? 0,
      added_today: addedToday ?? 0,
      dollar_value_at_risk: round2(atRisk),
      total_recovered: round2(recovered),
      total_recovered_estimated: round2(est),
      total_recovered_display: displayRecovered,
      revenue_at_risk: 0,
      revenue_recovered: 0,
      appeals_processed: 0,
      success_rate: 0,
      usage,
    },
    { status: 200 }
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
