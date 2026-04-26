import { getOpenAI, getOpenAIModel } from "@/lib/openai/server-client";

type AppealRow = {
  payer: string;
  claim_number: string;
  patient_id: string;
  provider_name: string;
  provider_npi: string;
  date_of_service: string;
  denial_reason: string;
  denial_code: string | null;
  cpt_codes: string | null;
  diagnosis_code: string | null;
  billed_amount: number;
  appeal_level?: string | null;
};

/**
 * Full appeal letter for queue /generate (replaces advanced_ai_generator for Next).
 */
export async function generateQueueAppealLetter(a: AppealRow, kind: "initial" | "follow_up" = "initial"): Promise<string> {
  const oa = getOpenAI();
  const header =
    kind === "follow_up"
      ? "Draft a second-level (follow-up) appeal letter, referencing prior submission and adding new information."
      : "Draft a professional first-level health insurance claim appeal letter.";

  if (!oa) {
    return [
      header.replace("Draft", "Basis for appeal"),
      "— set OPENAI_API_KEY for a full AI-drafted letter.",
      "",
      `Payer: ${a.payer}`,
      `Claim: ${a.claim_number}`,
      `Patient/Member: ${a.patient_id}`,
      `Provider: ${a.provider_name} (NPI ${a.provider_npi})`,
      `DOS: ${a.date_of_service}`,
      `Amount: $${a.billed_amount.toFixed(2)}`,
      a.denial_code ? `Denial code(s): ${a.denial_code}` : null,
      a.cpt_codes ? `CPT: ${a.cpt_codes}` : null,
      a.diagnosis_code ? `ICD-10: ${a.diagnosis_code}` : null,
      "",
      "Denial / clinical context:",
      a.denial_reason.slice(0, 12000),
    ]
      .filter(Boolean)
      .join("\n");
  }

  const user = `${header}

Facts:
- Payer: ${a.payer}
- Claim: ${a.claim_number}
- Patient ID: ${a.patient_id}
- Provider: ${a.provider_name}
- NPI: ${a.provider_npi}
- Date of service: ${a.date_of_service}
- Billed: $${a.billed_amount.toFixed(2)}
- Denial code(s): ${a.denial_code || "N/A"}
- CPT: ${a.cpt_codes || "N/A"}
- ICD-10: ${a.diagnosis_code || "N/A"}
- Level: ${a.appeal_level || "level_1"}

Denial narrative:
${a.denial_reason.slice(0, 14000)}`;

  const res = await oa.chat.completions.create({
    model: getOpenAIModel(),
    messages: [
      {
        role: "system",
        content:
          "You write U.S. medical claim appeal letters for provider offices. Be professional, specific, and structured with headings. Output plain text only (no markdown code fences).",
      },
      { role: "user", content: user },
    ],
    temperature: 0.35,
  });
  return (
    res.choices[0]?.message?.content?.trim() ||
    `Appeal draft\n\nPayer: ${a.payer}\nClaim: ${a.claim_number}\n\n${a.denial_reason.slice(0, 4000)}`
  );
}
