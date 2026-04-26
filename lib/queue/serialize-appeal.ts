import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Shapes for GET /api/queue list rows and GET/PATCH /api/queue/:appealId detail.
 * Aligns with Flask _appeal_to_queue_row + _appeal_detail (subset / simplified).
 */

export function mapAppealToQueueRow(a: Record<string, unknown>, followUpEligible = false) {
  const denial = String(a.denial_reason || "");
  const preview = denial.length > 120 ? `${denial.slice(0, 120)}…` : denial;
  const amt = parseFloat(String(a.billed_amount ?? 0)) || 0;
  return {
    id: a.id,
    appeal_id: a.appeal_id,
    claim_id: a.claim_number,
    payer: a.payer,
    amount: amt,
    denial_reason: denial,
    denial_reason_preview: preview,
    queue_status: a.queue_status || "pending",
    payment_status: String(a.payment_status || "unpaid").toLowerCase(),
    status: a.status,
    created_at: a.created_at,
    has_letter: Boolean(a.appeal_letter_path) || Boolean(String(a.generated_letter_text || "").trim()),
    appeal_date: a.last_generated_at,
    date_of_service: a.date_of_service,
    appeal_tracking_status: a.appeal_tracking_status || "pending",
    tracking_updated_at: a.tracking_updated_at,
    payer_fax: a.payer_fax,
    appeal_generation_kind: a.appeal_generation_kind || "initial",
    submitted_to_payer_at: a.submitted_to_payer_at,
    denial_prediction_score: a.denial_prediction_score,
    fix_status: a.fix_status || "none",
    resubmission_ready: Boolean(a.resubmission_ready),
    follow_up_eligible: followUpEligible,
  };
}

type HistoryEvent = { id: number; event_type: string; message: string | null; created_at: string | null };

export function mapAppealToDetail(
  a: Record<string, unknown>,
  events: HistoryEvent[],
  followUpEligible: boolean,
  followUpReason: string
) {
  const row = mapAppealToQueueRow(a, followUpEligible) as Record<string, unknown>;
  return {
    ...row,
    patient_id: a.patient_id,
    provider_name: a.provider_name,
    provider_npi: a.provider_npi,
    date_of_service: a.date_of_service,
    denial_code: a.denial_code,
    diagnosis_code: a.diagnosis_code,
    cpt_codes: a.cpt_codes,
    timely_filing_deadline: a.timely_filing_deadline,
    appeal_level: a.appeal_level,
    generated_letter_text: a.generated_letter_text,
    queue_notes: a.queue_notes,
    outcome_status: a.outcome_status,
    outcome_amount_recovered: a.outcome_amount_recovered != null ? parseFloat(String(a.outcome_amount_recovered)) : null,
    outcome_notes: a.outcome_notes,
    prior_submission_date: a.prior_submission_date,
    follow_up_eligible: followUpEligible,
    follow_up_reason: followUpReason,
    history: events.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      message: e.message,
      created_at: e.created_at,
    })),
  };
}

export function isPostgrestError(e: unknown): e is PostgrestError {
  return typeof e === "object" && e != null && "code" in e;
}
