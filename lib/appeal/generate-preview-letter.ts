import { getOpenAI, getOpenAIModel } from "@/lib/openai/server-client";

export type PreviewLetterContext = {
  payer: string;
  claim_number: string;
  patient_name: string;
  provider_name: string;
  provider_npi: string;
  date_of_service: string;
  denial_reason: string;
  billed_amount: number;
  cpt_codes: string | null;
  diagnosis_code: string | null;
};

export async function generateAppealPreviewLetter(ctx: PreviewLetterContext): Promise<string> {
  const oa = getOpenAI();
  if (!oa) {
    return [
      "Basis for appeal (preview) — set OPENAI_API_KEY on the server for a full AI-drafted letter.",
      "",
      `Payer: ${ctx.payer}`,
      `Claim: ${ctx.claim_number}`,
      `Patient: ${ctx.patient_name}`,
      `Provider: ${ctx.provider_name} (NPI ${ctx.provider_npi})`,
      `Date of service: ${ctx.date_of_service}`,
      `Billed amount: $${ctx.billed_amount.toFixed(2)}`,
      ctx.cpt_codes ? `CPT: ${ctx.cpt_codes}` : null,
      ctx.diagnosis_code ? `ICD-10: ${ctx.diagnosis_code}` : null,
      "",
      "Denial summary:",
      ctx.denial_reason.slice(0, 8000),
    ]
      .filter(Boolean)
      .join("\n");
  }
  const user = `Draft a professional healthcare claim appeal letter (Level 1) using these facts. Use clear sections. Cite the denial and request reconsideration. Do not fabricate policy numbers; use placeholders like [Payer policy] if needed.

Payer: ${ctx.payer}
Claim number: ${ctx.claim_number}
Patient: ${ctx.patient_name}
Provider: ${ctx.provider_name}
Provider NPI: ${ctx.provider_npi}
Date of service: ${ctx.date_of_service}
Billed amount: $${ctx.billed_amount.toFixed(2)}
CPT codes: ${ctx.cpt_codes || "N/A"}
ICD-10: ${ctx.diagnosis_code || "N/A"}

Denial / documentation narrative:
${ctx.denial_reason.slice(0, 12000)}`;
  const res = await oa.chat.completions.create({
    model: getOpenAIModel(),
    messages: [
      {
        role: "system",
        content:
          "You write concise, professional medical claim appeal letters for US providers. Be factual. Output plain text only.",
      },
      { role: "user", content: user },
    ],
    temperature: 0.35,
  });
  const t = res.choices[0]?.message?.content?.trim();
  if (!t) {
    return `Appeal draft (preview)\n\nPayer: ${ctx.payer}\nClaim: ${ctx.claim_number}\n\n${ctx.denial_reason.slice(0, 8000)}`;
  }
  return t;
}
