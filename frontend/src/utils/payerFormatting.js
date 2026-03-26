/**
 * Client-side payer profile + style summary (mirrors backend/payer_formatting.py).
 * Used for badges and UI hints; generation uses server-side rules.
 */
const PROFILES = {
  medicare: 'Medicare/CMS: strict compliance tone',
  aetna: 'Aetna-style: structured sections, medical necessity focus',
  unitedhealthcare: 'UHC-style: formal, policy-driven, strong rebuttal',
  blue_cross_blue_shield: 'BCBS-style: balanced clinical + coding',
  general: 'General commercial payer formatting',
};

export function detectPayerProfile(payerName) {
  const p = (payerName || '').toUpperCase();
  if (/(MEDICARE|CMS|PALMETTO|NORIDIAN|NOVITAS)/.test(p)) return 'medicare';
  if (/(AETNA|MERITAIN)/.test(p)) return 'aetna';
  if (/(UNITED|UHC|OPTUM)/.test(p)) return 'unitedhealthcare';
  if (/(BLUE CROSS|BLUE SHIELD|BCBS|ANTHEM)/.test(p)) return 'blue_cross_blue_shield';
  return 'general';
}

/**
 * applyPayerFormatting(appealData, payer?)
 * @returns {{ profile: string, styleSummary: string, instructionBlock: string }}
 */
export function applyPayerFormatting(appealData, payer) {
  const label = payer || appealData?.payer || appealData?.payer_name || '';
  const profile = detectPayerProfile(label);
  return {
    profile,
    payerLabel: String(label).trim(),
    styleSummary: PROFILES[profile] || PROFILES.general,
    instructionBlock:
      'See server payer_formatting for full prompt instructions used at generation time.',
  };
}
