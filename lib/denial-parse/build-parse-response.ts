import type { ExtractedFields } from "./extract-with-openai";

type Level = "high" | "medium" | "low";

function asStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function overallConfidence(merged: ExtractedFields): Level {
  let score = 0;
  if (merged.payer_name) score += 20;
  if (merged.claim_number) score += 20;
  if (merged.patient_name) score += 10;
  if (merged.service_date || merged.denial_date) score += 15;
  if (merged.cpt_codes?.length) score += 10;
  if (merged.icd_codes?.length) score += 7;
  if (merged.denial_codes?.length) score += 8;
  if (merged.billed_amount) score += 5;
  if (merged.denial_reason_text) score += 5;
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function fieldLevel(has: boolean, overall: Level): "high" | "low" {
  if (overall === "low") return "low";
  return has ? "high" : "low";
}

/**
 * Onboarding + drop zone: shape matches Flask /api/parse and applyExtractionData().
 */
export function buildParseApiResponse(
  merged: ExtractedFields,
  rawText: string,
  llmUsed: boolean,
  llmError: string | null
) {
  const icd = asStrArr(merged.icd_codes);
  const cpt = asStrArr(merged.cpt_codes);
  const rarc = asStrArr(merged.rarc_codes);
  const carc = asStrArr(merged.denial_codes);
  const modStr = asStrArr(merged.modifiers);
  merged = {
    ...merged,
    icd_codes: icd,
    cpt_codes: cpt,
    rarc_codes: rarc,
    denial_codes: carc,
    modifiers: modStr,
  };
  const conf = overallConfidence(merged);
  const fc = {
    claimNumber: fieldLevel(!!merged.claim_number, conf),
    dateOfService: fieldLevel(!!(merged.service_date || merged.denial_date), conf),
    payer: fieldLevel(!!merged.payer_name, conf),
    patientName: fieldLevel(!!merged.patient_name, conf),
    carcCodes: fieldLevel(carc.length > 0, conf),
    rarcCodes: fieldLevel(rarc.length > 0, conf),
    cptCodes: fieldLevel(cpt.length > 0, conf),
    icdCodes: fieldLevel(icd.length > 0, conf),
    billedAmount: fieldLevel(merged.billed_amount != null && merged.billed_amount !== "", conf),
    paidAmount: fieldLevel(merged.paid_amount != null && merged.paid_amount !== "", conf),
    denialReasonText: fieldLevel(!!merged.denial_reason_text, conf),
  };

  const out: Record<string, unknown> = {
    success: true,
    denial_codes: carc,
    primary_denial_code: carc[0] ?? null,
    rarc_codes: rarc,
    cpt_codes: cpt,
    icd_codes: icd,
    icd10_codes: icd,
    modifiers: merged.modifiers || [],
    claim_number: merged.claim_number ?? null,
    payer_name: merged.payer_name ?? null,
    patient_name: merged.patient_name ?? null,
    denial_date: merged.denial_date ?? null,
    service_date: merged.service_date ?? null,
    billed_amount: merged.billed_amount ?? null,
    denied_amount: merged.denied_amount ?? null,
    paid_amount: merged.paid_amount ?? null,
    provider_npi: merged.provider_npi ?? null,
    provider_name: merged.provider_name ?? null,
    patient_id: merged.patient_id ?? null,
    denial_reason_text: merged.denial_reason_text ?? null,
    confidence: conf,
    field_confidence: fc,
    fieldConfidence: fc,
    raw_text: (rawText || "").slice(0, 500),
    extraction_engine: llmUsed ? "llm+regex" : "regex",
    llm_error: llmError || "",
  };
  if (conf === "low") {
    out.warning = "Low confidence extraction - please review all fields carefully";
  }
  return out;
}
