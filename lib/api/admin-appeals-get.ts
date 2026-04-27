import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** GET /api/admin/appeals — list */
export async function getAppealsList(request: NextRequest) {
  const auth = await getAdminFromRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "50", 10) || 50));
  const status = searchParams.get("status");
  const outcomeStatus = searchParams.get("outcome_status");

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createServiceRoleClient();
  let q = supabase
    .from("appeals")
    .select(
      "id, appeal_id, payer, claim_number, patient_id, provider_name, denial_code, billed_amount, status, payment_status, ai_quality_score, ai_citation_count, ai_model_used, outcome_status, outcome_amount_recovered, created_at, paid_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status) {
    q = q.eq("status", status);
  }
  if (outcomeStatus) {
    q = q.eq("outcome_status", outcomeStatus);
  }

  const { data: rows, error, count } = await q.range(from, to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appeals = (rows || []).map((a) => ({
    id: a.id,
    appeal_id: a.appeal_id,
    payer: a.payer,
    claim_number: a.claim_number,
    patient_id: a.patient_id,
    provider_name: a.provider_name,
    denial_code: a.denial_code,
    billed_amount: a.billed_amount != null ? parseFloat(String(a.billed_amount)) : null,
    status: a.status,
    payment_status: a.payment_status,
    ai_quality_score: a.ai_quality_score,
    ai_citation_count: a.ai_citation_count,
    ai_model_used: a.ai_model_used,
    outcome_status: a.outcome_status,
    outcome_amount_recovered:
      a.outcome_amount_recovered != null ? parseFloat(String(a.outcome_amount_recovered)) : null,
    created_at: a.created_at,
    paid_at: a.paid_at,
  }));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  return NextResponse.json(
    {
      appeals,
      pagination: {
        page,
        per_page: perPage,
        total,
        pages,
      },
    },
    { status: 200 }
  );
}

/** GET /api/admin/appeals/:appealId */
export async function getAppealDetail(request: NextRequest, appealId: string) {
  const auth = await getAdminFromRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createServiceRoleClient();
  const { data: appeal, error } = await supabase
    .from("appeals")
    .select(
      "appeal_id, payer, claim_number, patient_id, provider_name, provider_npi, date_of_service, denial_reason, denial_code, diagnosis_code, cpt_codes, billed_amount, appeal_level, status, payment_status, ai_quality_score, ai_citation_count, ai_word_count, ai_model_used, ai_generation_method, outcome_status, outcome_date, outcome_amount_recovered, outcome_notes, created_at, paid_at, completed_at"
    )
    .eq("appeal_id", appealId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!appeal) {
    return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      appeal_id: appeal.appeal_id,
      payer: appeal.payer,
      claim_number: appeal.claim_number,
      patient_id: appeal.patient_id,
      provider_name: appeal.provider_name,
      provider_npi: appeal.provider_npi,
      date_of_service: appeal.date_of_service,
      denial_reason: appeal.denial_reason,
      denial_code: appeal.denial_code,
      diagnosis_code: appeal.diagnosis_code,
      cpt_codes: appeal.cpt_codes,
      billed_amount: appeal.billed_amount != null ? parseFloat(String(appeal.billed_amount)) : null,
      appeal_level: appeal.appeal_level,
      status: appeal.status,
      payment_status: appeal.payment_status,
      ai_quality_score: appeal.ai_quality_score,
      ai_citation_count: appeal.ai_citation_count,
      ai_word_count: appeal.ai_word_count,
      ai_model_used: appeal.ai_model_used,
      ai_generation_method: appeal.ai_generation_method,
      outcome_status: appeal.outcome_status,
      outcome_date: appeal.outcome_date,
      outcome_amount_recovered:
        appeal.outcome_amount_recovered != null
          ? parseFloat(String(appeal.outcome_amount_recovered))
          : null,
      outcome_notes: appeal.outcome_notes,
      created_at: appeal.created_at,
      paid_at: appeal.paid_at,
      completed_at: appeal.completed_at,
    },
    { status: 200 }
  );
}
