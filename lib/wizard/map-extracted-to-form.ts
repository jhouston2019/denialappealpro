export function normalizeDateForInput(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function normalizeCodeList(input: unknown) {
  if (!input) return "";
  if (Array.isArray(input)) {
    return input
      .map((x) => String(x).trim())
      .filter(Boolean)
      .join(", ");
  }
  return String(input)
    .replace(/\//g, ",")
    .replace(/\s+/g, "")
    .split(",")
    .filter(Boolean)
    .join(", ");
}

export function mapExtractedToForm(data: Record<string, unknown> | null | undefined) {
  if (!data || typeof data !== "object") return {};

  const denialCodes: string[] = [];
  if (data.primary_denial_code) denialCodes.push(String(data.primary_denial_code).trim());
  if (Array.isArray(data.rarc_codes)) {
    denialCodes.push(...data.rarc_codes.map((x) => String(x).trim()));
  }
  if (Array.isArray(data.denial_codes)) {
    denialCodes.push(...data.denial_codes.map((x) => String(x).trim()));
  }
  const cleanCodes = [...new Set(denialCodes)].filter(Boolean);
  const payerName = (data.payer_name as string) || (data.payer as string) || "";
  const icdNorm = normalizeCodeList(data.icd10_codes || data.icd_codes);

  return {
    payer_name: payerName,
    payer: payerName,
    claim_number: data.claim_number || "",
    date_of_service: normalizeDateForInput((data.service_date as string) || (data.date_of_service as string)),
    denial_code: cleanCodes.join(" / "),
    denial_reason: (data.denial_reason_text as string) || (data.note as string) || (data.remark as string) || "",
    cpt_codes: normalizeCodeList(data.cpt_codes),
    icd_codes: icdNorm,
    diagnosis_code: icdNorm,
    billed_amount:
      data.billed_amount != null && data.billed_amount !== "" ? String(data.billed_amount) : "",
    provider_npi: data.provider_npi != null ? String(data.provider_npi) : "",
    provider_name: (data.provider_name as string) || "",
    patient_id: (data.patient_id as string) || "",
  };
}
