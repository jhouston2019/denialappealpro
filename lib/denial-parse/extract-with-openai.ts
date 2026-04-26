import { getOpenAI, getOpenAIModel } from "@/lib/openai/server-client";

const SYSTEM = `You extract structured data from a healthcare payer denial, EOB, or remittance text.
Return a JSON object with these keys (use null or empty array when unknown):
- payer_name: string or null
- claim_number: string or null
- patient_name: string or null
- patient_id: string or null
- service_date: YYYY-MM-DD or null
- denial_date: YYYY-MM-DD or null
- cpt_codes: string[] (5-digit procedure codes)
- icd_codes: string[] (ICD-10 diagnosis codes, may include period)
- rarc_codes: string[] (e.g. N123)
- denial_codes: string[] (CARC / reason codes as strings, e.g. 97, 16)
- billed_amount: string or null (numeric as string)
- paid_amount: string or null
- denied_amount: string or null
- provider_npi: 10 digit string or null
- provider_name: string or null
- modifiers: string[] (e.g. 25, 59)
- denial_reason_text: short plain summary of the denial or null
Only output valid JSON, no markdown.`;

export type ExtractedFields = {
  payer_name?: string | null;
  claim_number?: string | null;
  patient_name?: string | null;
  patient_id?: string | null;
  service_date?: string | null;
  denial_date?: string | null;
  cpt_codes?: string[];
  icd_codes?: string[];
  rarc_codes?: string[];
  denial_codes?: string[];
  billed_amount?: string | null;
  paid_amount?: string | null;
  denied_amount?: string | null;
  provider_npi?: string | null;
  provider_name?: string | null;
  modifiers?: string[];
  denial_reason_text?: string | null;
};

export async function extractWithOpenAI(
  text: string
): Promise<{ fields: ExtractedFields | null; error: string | null }> {
  const oa = getOpenAI();
  if (!oa) {
    return { fields: null, error: "no_openai" };
  }
  const t = (text || "").trim();
  if (t.length < 20) {
    return { fields: null, error: "insufficient_text" };
  }
  try {
    const res = await oa.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: t.slice(0, 50_000) },
      ],
      temperature: 0.1,
    });
    const raw = res.choices[0]?.message?.content;
    if (!raw) return { fields: null, error: "empty_model" };
    const parsed = JSON.parse(raw) as ExtractedFields;
    return { fields: parsed, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { fields: null, error: msg };
  }
}
