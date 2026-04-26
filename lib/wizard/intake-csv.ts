// @ts-nocheck
/**
 * Parse CSV / Excel exports into row objects with normalized keys.
 * All rows are returned (not limited to the first).
 */

import { emptyIntake, normalizeCarcToken, normalizeRarcToken } from "./denial-intake-engine";

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
    } else if (!inQ && (c === ',' || c === '\t')) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

const HEADER_ALIASES = {
  claim_number: ['claim_number', 'claim', 'claim_id', 'claimid', 'clm'],
  payer: ['payer', 'insurance', 'payor', 'carrier'],
  denial_reason: ['denial_reason', 'reason', 'denial', 'remark', 'remarks'],
  denial_code: ['denial_code', 'carc', 'carc_codes'],
  rarc: ['rarc', 'rarc_codes', 'remittance', 'remittance_code'],
  date_of_service: ['date_of_service', 'dos', 'service_date', 'date_of_serv'],
  cpt_codes: ['cpt_codes', 'cpt', 'procedure', 'proc_code'],
  diagnosis_code: ['diagnosis_code', 'icd10', 'icd_10', 'icd', 'dx'],
  billed_amount: ['billed_amount', 'billed', 'charge', 'amount', 'billed_amt'],
  paid_amount: ['paid_amount', 'paid', 'payment', 'paid_amt'],
  provider_name: ['provider_name', 'provider', 'facility'],
  patient_id: ['patient_id', 'patient', 'mrn'],
};

function resolveCanonicalKey(norm) {
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(norm)) return canonical;
  }
  return norm;
}

export function normalizeRowKeys(row) {
  const out = {};
  Object.entries(row).forEach(([k, v]) => {
    const nk = resolveCanonicalKey(normalizeHeader(k));
    if (nk && v != null && String(v).trim() !== '') {
      out[nk] = typeof v === 'number' ? String(v) : String(v).trim();
    }
  });
  return out;
}

export function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => normalizeHeader(h.replace(/^"|"$/g, '')));
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const parts = splitCsvLine(lines[i]).map((c) => c.replace(/^"|"$/g, ''));
    if (!parts.some((p) => p.trim())) continue;
    const obj = {};
    headers.forEach((h, j) => {
      if (!h) return;
      const canon = resolveCanonicalKey(h);
      obj[canon] = parts[j] != null ? parts[j].trim() : '';
    });
    rows.push(normalizeRowKeys(obj));
  }
  return rows;
}

export async function parseExcelFile(file) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return json.map((row) => normalizeRowKeys(row));
}

function normalizeDosCell(s) {
  if (s == null || s === '') return '';
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  return str;
}

function splitCodeCell(s) {
  return String(s || '')
    .split(/[,\s;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Map CSV/Excel row → structured intake (see denialIntakeEngine.emptyIntake) */
export function rowToStructuredIntake(row) {
  const x = normalizeRowKeys(row);
  const carcRaw = splitCodeCell(x.denial_code);
  const carcCodes = carcRaw.map((c) => normalizeCarcToken(c)).filter(Boolean);
  const rarcCodes = splitCodeCell(x.rarc)
    .map((c) => normalizeRarcToken(c))
    .filter(Boolean);
  const cptCodes = splitCodeCell(x.cpt_codes);
  const icdCodes = splitCodeCell(x.diagnosis_code);
  return {
    ...emptyIntake(),
    claimNumber: x.claim_number || '',
    dateOfService: normalizeDosCell(x.date_of_service),
    payer: x.payer || '',
    planType: 'Commercial',
    carcCodes,
    rarcCodes,
    cptCodes,
    icdCodes,
    billedAmount: x.billed_amount != null && x.billed_amount !== '' ? String(x.billed_amount) : '',
    paidAmount: x.paid_amount != null && x.paid_amount !== '' ? String(x.paid_amount) : '',
    treatmentProvided: '',
    medicalNecessity: x.denial_reason || '',
    specialCircumstances: '',
  };
}

export function rowsToBatchPayload(rows) {
  return rows.map((r) => {
    const x = normalizeRowKeys(r);
    return {
      claim_number: x.claim_number || '',
      payer: x.payer || '',
      denial_reason: x.denial_reason || '',
      date_of_service: x.date_of_service || '',
      cpt_codes: x.cpt_codes || '',
      diagnosis_code: x.diagnosis_code || '',
      denial_code: x.denial_code || '',
      billed_amount: x.billed_amount || '',
      paid_amount: x.paid_amount || '',
    };
  });
}

/** Rows shaped for backend batch appeal worker (all CSV / Excel rows). */
export function rowsToWorkerBatchPayload(rows) {
  return rows.map((r) => {
    const x = normalizeRowKeys(r);
    return {
      claim_number: x.claim_number || '',
      payer: x.payer || '',
      denial_reason: x.denial_reason || '',
      date_of_service: x.date_of_service || '',
      cpt_codes: x.cpt_codes || '',
      diagnosis_code: x.diagnosis_code || '',
      icd_codes: x.diagnosis_code || '',
      denial_code: x.denial_code || '',
      carc_codes: x.denial_code || '',
      rarc_codes: x.rarc || '',
      billed_amount: x.billed_amount || '',
      paid_amount: x.paid_amount || '',
    };
  });
}
