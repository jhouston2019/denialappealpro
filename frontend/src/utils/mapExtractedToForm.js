export function normalizeDateForInput(dateStr) {
  if (!dateStr) return '';

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';

  return d.toISOString().split('T')[0];
}

function normalizeCodeList(input) {
  if (!input) return '';

  if (Array.isArray(input)) {
    return input
      .map((x) => String(x).trim())
      .filter(Boolean)
      .join(', ');
  }

  return String(input)
    .replace(/\//g, ',')
    .replace(/\s+/g, '')
    .split(',')
    .filter(Boolean)
    .join(', ');
}

export function mapExtractedToForm(data) {
  if (!data || typeof data !== 'object') return {};

  const denialCodes = [];

  if (data.primary_denial_code) denialCodes.push(String(data.primary_denial_code).trim());
  if (Array.isArray(data.rarc_codes)) denialCodes.push(...data.rarc_codes.map((x) => String(x).trim()));
  if (Array.isArray(data.denial_codes)) denialCodes.push(...data.denial_codes.map((x) => String(x).trim()));

  const cleanCodes = [...new Set(denialCodes)].filter(Boolean);

  const payerName = data.payer_name || data.payer || '';
  const icdNorm = normalizeCodeList(data.icd_codes);

  return {
    payer_name: payerName,
    payer: payerName,

    claim_number: data.claim_number || '',

    date_of_service: normalizeDateForInput(data.service_date || data.date_of_service),

    denial_code: cleanCodes.join(' / '),

    denial_reason: data.denial_reason_text || data.note || data.remark || '',

    cpt_codes: normalizeCodeList(data.cpt_codes),

    icd_codes: icdNorm,
    diagnosis_code: icdNorm,

    billed_amount: data.billed_amount != null && data.billed_amount !== '' ? String(data.billed_amount) : '',

    provider_npi: data.provider_npi != null ? String(data.provider_npi) : '',

    provider_name: data.provider_name || '',

    patient_id: data.patient_id || '',
  };
}
