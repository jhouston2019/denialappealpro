import type {
  DapPracticeProfileStored,
  DapPreviewPayloadStored,
} from "@/lib/dap/preview-flow";

function normalizeNpi10(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length === 10 ? d : "";
}

/**
 * Merges practice profile into preview payload claim_data and intake_snapshot.
 */
export function applyPracticeToDapPreviewPayload(
  stored: DapPreviewPayloadStored,
  practice: DapPracticeProfileStored
): DapPreviewPayloadStored {
  const name = String(practice.provider_name || "").trim();
  const npi = normalizeNpi10(String(practice.provider_npi || ""));
  const addr = (practice.provider_address && String(practice.provider_address).trim()) || "";
  const phone = (practice.provider_phone && String(practice.provider_phone).trim()) || "";
  return {
    ...stored,
    claim_data: {
      ...stored.claim_data,
      provider_name: name,
      provider_npi: npi,
    },
    intake_snapshot: {
      ...stored.intake_snapshot,
      providerName: name,
      providerNpi: npi,
      providerAddress: addr,
      providerPhone: phone,
    },
    practice_profile: {
      provider_name: name,
      provider_npi: npi,
      ...(addr ? { provider_address: addr } : {}),
      ...(phone ? { provider_phone: phone } : {}),
    },
  };
}

export { normalizeNpi10 };
