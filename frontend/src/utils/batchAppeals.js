import api from '../api/axios';

/**
 * Start server-side batch appeal generation from a CSV file (returns job_id for polling).
 * See POST /api/queue/batch-appeals — columns: claim_number, payer, date_of_service, cpt_codes,
 * icd_codes, modifiers, carc_codes, rarc_codes, billed_amount, paid_amount.
 */
export async function processBatchAppeals(csvFile, defaults = {}) {
  const fd = new FormData();
  fd.append('file', csvFile);
  fd.append('defaults', JSON.stringify(defaults));
  const { data } = await api.post('/api/queue/batch-appeals', fd);
  return data;
}
