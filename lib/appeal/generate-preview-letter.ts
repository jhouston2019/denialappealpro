import { getOpenAI, getOpenAIModel } from "@/lib/openai/server-client";

const NEUTRAL_PRACTICE = "Your Practice";

export type PreviewLetterContext = {
  payer: string;
  claim_number: string;
  patient_name: string;
  provider_name: string;
  provider_npi: string;
  provider_address: string;
  date_of_service: string;
  denial_reason: string;
  billed_amount: number;
  paid_amount: number;
  carc_codes: string;
  rarc_codes: string;
  cpt_codes: string;
  icd10_codes: string;
};

function formatNpi(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length === 10 ? d : "";
}

function joinCodesList(v: unknown): string {
  if (Array.isArray(v)) {
    return v
      .map((x) => String(x).trim())
      .filter(Boolean)
      .join(", ");
  }
  if (v != null && String(v).trim()) return String(v).trim();
  return "";
}

function parseMoney(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  const n = parseFloat(String(raw).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Strips "—" style sentinels so the model is not steered into [bracket] placeholders.
 */
function displayScalar(s: string, fallback: string): string {
  const t = String(s ?? "").trim();
  if (!t || t === "—" || t === "-") return fallback;
  return t;
}

function buildFallbackLetter(ctx: PreviewLetterContext): string {
  const lines: (string | null)[] = [
    "Basis for appeal (preview) — set OPENAI_API_KEY on the server for a full AI-drafted letter.",
    "",
    `Payer: ${ctx.payer}`,
    `Claim: ${ctx.claim_number}`,
    `Patient: ${ctx.patient_name}`,
    `Provider: ${ctx.provider_name || NEUTRAL_PRACTICE}` + (ctx.provider_npi ? ` (NPI ${ctx.provider_npi})` : ""),
    ctx.provider_address ? `Provider address: ${ctx.provider_address}` : null,
    `Date of service: ${ctx.date_of_service}`,
    `Billed amount: $${ctx.billed_amount.toFixed(2)}`,
    ctx.paid_amount > 0 ? `Paid amount: $${ctx.paid_amount.toFixed(2)}` : null,
    ctx.carc_codes ? `CARC: ${ctx.carc_codes}` : null,
    ctx.rarc_codes ? `RARC: ${ctx.rarc_codes}` : null,
    ctx.cpt_codes ? `CPT: ${ctx.cpt_codes}` : null,
    ctx.icd10_codes ? `ICD-10: ${ctx.icd10_codes}` : null,
    "",
    "Denial summary:",
    ctx.denial_reason.slice(0, 8000),
  ];
  return lines.filter((x) => x != null).join("\n");
}

function buildModelUserPrompt(ctx: PreviewLetterContext): string {
  return `Draft a professional healthcare claim appeal letter (Level 1) using ONLY the facts below. Use clear sections. Cite the denial and request reconsideration. Do not fabricate policy numbers; you may use a generic phrase like "per the payer's medical policy" if needed.

Use the real values given. Do NOT use square-bracket placeholders (such as [Patient name], [NPI], or [Date])—write natural prose with the actual facts, or leave an optional line out if a field is empty. For a missing practice name only, you may use "${NEUTRAL_PRACTICE}".

Structure facts (plain text, use as-is):
- Payer: ${ctx.payer}
- Claim number: ${ctx.claim_number}
- Patient: ${ctx.patient_name}
- Provider / practice: ${ctx.provider_name || NEUTRAL_PRACTICE}
- Provider NPI: ${ctx.provider_npi || "(not on file—omit the NPI line in the letter if empty)"}
- Practice address: ${ctx.provider_address || "(not on file—omit if empty)"}
- Date of service: ${ctx.date_of_service}
- Billed amount: $${ctx.billed_amount.toFixed(2)}
- Paid amount: ${ctx.paid_amount > 0 ? `$${ctx.paid_amount.toFixed(2)}` : "not provided or $0.00—omit a paid line if not applicable"}
- CARC code(s): ${ctx.carc_codes || "not specified"}
- RARC / remark code(s): ${ctx.rarc_codes || "not specified"}
- CPT: ${ctx.cpt_codes || "not specified"}
- ICD-10: ${ctx.icd10_codes || "not specified"}

Denial / documentation narrative (primary source for appeal arguments):
${ctx.denial_reason.slice(0, 12000)}`;
}

export async function generateAppealPreviewLetter(ctx: PreviewLetterContext): Promise<string> {
  const oa = getOpenAI();
  if (!oa) {
    return buildFallbackLetter(ctx);
  }
  const res = await oa.chat.completions.create({
    model: getOpenAIModel(),
    messages: [
      {
        role: "system",
        content:
          "You write U.S. medical claim appeal letters for provider offices. Be professional and factual. Output plain text only. Never use [square brackets] as fill-in-the-blank placeholders—use the provided values or the phrase Your Practice for an unnamed practice when appropriate.",
      },
      { role: "user", content: buildModelUserPrompt(ctx) },
    ],
    temperature: 0.35,
  });
  const t = res.choices[0]?.message?.content?.trim();
  if (!t) {
    return `Appeal draft (preview)\n\nPayer: ${ctx.payer}\nClaim: ${ctx.claim_number}\n\n${ctx.denial_reason.slice(0, 8000)}`;
  }
  return t;
}

export type BuildPreviewLetterContextInput = {
  claim_data: import("@/lib/dap/preview-flow").DapClaimDataForPreview | null;
  intake_snapshot: import("@/lib/dap/preview-flow").DapIntakeSnapshot | null;
  /** Merged profile from public.users when session exists; else omit or pass empty. */
  profile: {
    provider_name: string;
    provider_npi: string;
    provider_address: string;
  };
  /** When true, avoid practice-identifying strings from the wizard; use Your Practice for empty name. */
  isAnonymous: boolean;
};

/**
 * Merges wizard claim_data, intake snapshot, and optional DB profile for preview letter generation.
 */
export function buildPreviewLetterContextFromPreviewPayload(input: BuildPreviewLetterContextInput): PreviewLetterContext | null {
  const { claim_data: c, intake_snapshot: snap, profile, isAnonymous } = input;
  if (!c && !snap) return null;

  const claim = c ?? ({} as import("@/lib/dap/preview-flow").DapClaimDataForPreview);
  const s = snap;

  let denial = [claim.denial_reason, claim.paste_details].filter((x) => String(x || "").trim()).join("\n\n");
  if (!String(denial).trim() && s) {
    denial = [s.medicalNecessity, s.treatmentProvided, s.specialCircumstances]
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .join("\n\n");
  }
  if (!String(denial).trim()) return null;

  const carc = joinCodesList(s?.carcCodes) || String(claim.denial_code || "").trim();
  const rarc = joinCodesList(s?.rarcCodes);
  const cpt = (claim.cpt_codes && String(claim.cpt_codes).trim()) || joinCodesList(s?.cptCodes);
  const icd =
    (claim.icd10_codes && String(claim.icd10_codes).trim()) ||
    (claim.diagnosis_code && String(claim.diagnosis_code).trim()) ||
    joinCodesList(s?.icdCodes);

  const patient = displayScalar(
    (claim.patient_name && String(claim.patient_name).trim()) || (s?.patientName && String(s.patientName).trim()) || "",
    ""
  );
  const claimNo = displayScalar(
    (claim.claim_number && String(claim.claim_number).trim()) || (s?.claimNumber && String(s.claimNumber).trim()) || "",
    ""
  );
  const dos = displayScalar(
    (claim.date_of_service && String(claim.date_of_service).trim()) || (s?.dateOfService && String(s.dateOfService).trim()) || "",
    ""
  );
  const payer = displayScalar(
    (claim.payer && String(claim.payer).trim()) || (s?.payer && String(s.payer).trim()) || "",
    "Unknown payer"
  );

  const billed = parseMoney(claim.billed_amount ?? s?.billedAmount);
  const paid = parseMoney(s?.paidAmount);

  let provider_name = "";
  let provider_npi = "";
  let provider_address = "";

  if (isAnonymous) {
    provider_name =
      (claim.provider_name && String(claim.provider_name).trim()) ||
      (s?.providerName && String(s.providerName).trim()) ||
      "";
    const npiWiz = (claim.provider_npi && String(claim.provider_npi)) || (s?.providerNpi && String(s.providerNpi)) || "";
    provider_npi = formatNpi(npiWiz);
    provider_address = (s?.providerAddress && String(s.providerAddress).trim()) || "";
  } else {
    const fromDb = profile.provider_name || "";
    const fromClaim = (claim.provider_name && String(claim.provider_name).trim()) || (s?.providerName && String(s.providerName).trim()) || "";
    provider_name = fromDb || fromClaim;
    if (!provider_name) provider_name = NEUTRAL_PRACTICE;
    const npiDb = formatNpi(profile.provider_npi);
    const npiWiz = formatNpi((claim.provider_npi && String(claim.provider_npi)) || (s?.providerNpi && String(s.providerNpi)) || "");
    provider_npi = npiDb || npiWiz;
    const addrDb = (profile.provider_address && String(profile.provider_address).trim()) || "";
    const addrWiz = (s?.providerAddress && String(s.providerAddress).trim()) || "";
    provider_address = addrDb || addrWiz;
  }

  return {
    payer,
    claim_number: claimNo,
    patient_name: patient,
    provider_name,
    provider_npi,
    provider_address,
    date_of_service: dos,
    denial_reason: denial.slice(0, 12_000),
    billed_amount: billed,
    paid_amount: paid,
    carc_codes: carc,
    rarc_codes: rarc,
    cpt_codes: cpt,
    icd10_codes: icd,
  };
}
