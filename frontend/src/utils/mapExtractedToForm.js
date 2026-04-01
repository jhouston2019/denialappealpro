/**
 * Map backend /api/parse/denial-letter JSON to wizard + AppealForm field shapes.
 */

function joinCodes(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr
    .map((x) => (typeof x === 'string' ? x.trim() : String(x)))
    .filter(Boolean)
    .join(', ');
}

function formatDenialCode(data) {
  const primary = (data.primary_denial_code || '').toString().trim();
  const rarc = joinCodes(data.rarc_codes);
  const denialCodes = joinCodes(data.denial_codes);
  const parts = [primary, rarc || denialCodes].filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.join(' / ');
}

/** Normalize common date strings to HTML input[type=date] format (YYYY-MM-DD). */
export function normalizeDateForInput(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

export function mapExtractedToForm(data) {
  if (!data || typeof data !== 'object') return {};

  const cpt = joinCodes(data.cpt_codes);
  const icd = joinCodes(data.icd_codes);
  const billed =
    data.billed_amount != null && data.billed_amount !== ''
      ? String(data.billed_amount)
      : '';
  const payer = (data.payer_name || '').trim();
  const claim = (data.claim_number || '').trim();
  const dos = normalizeDateForInput(data.service_date || data.date_of_service);
  const denialCode = formatDenialCode(data);
  const denialReason = (data.denial_reason_text || data.denial_reason || '').trim();
  const providerNpi = (data.provider_npi || '').toString().trim();

  return {
    payer,
    payer_name: payer,
    claim_number: claim,
    date_of_service: dos,
    denial_code: denialCode,
    denial_reason: denialReason,
    cpt_codes: cpt,
    diagnosis_code: icd,
    billed_amount: billed,
    provider_npi: providerNpi,
    provider_name: (data.provider_name || '').trim(),
    patient_id: (data.patient_id || '').trim(),
  };
}
