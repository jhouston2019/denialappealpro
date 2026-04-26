import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { mapAppealToQueueRow } from "@/lib/queue/serialize-appeal";

/**
 * List appeals for the queue (subset of legacy GET /api/queue).
 */
export async function GET(request: NextRequest) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25));
  const offset = (page - 1) * limit;

  const svc = createServiceRoleClient();
  const { data: rows, error } = await svc
    .from("appeals")
    .select(
      "id, appeal_id, claim_number, payer, billed_amount, denial_reason, queue_status, payment_status, status, created_at, appeal_letter_path, generated_letter_text, last_generated_at, date_of_service, appeal_tracking_status, tracking_updated_at, payer_fax, appeal_generation_kind, submitted_to_payer_at, denial_prediction_score, fix_status, resubmission_ready"
    )
    .eq("user_id", r.userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: "Queue query failed" }, { status: 500 });
  }

  const list = (rows || []).map((a) => mapAppealToQueueRow(a as Record<string, unknown>));

  return NextResponse.json(
    {
      claims: list,
      page,
      limit,
      total: null,
    },
    { status: 200 }
  );
}
