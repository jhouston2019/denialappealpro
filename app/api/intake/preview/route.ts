import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";
import { getInternalFlaskBaseUrl } from "@/lib/engine/forward-internal";
import { getEngineAccessToken } from "@/lib/supabase/engine-access-token";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const PREVIEW_CHARS = 900;

function normalizeDenialCodes(codes: string[]): string[] {
  const valid: string[] = [];
  for (const c of codes) {
    const s = c.trim().toUpperCase();
    if (s && /^\d+$/.test(s) && parseInt(s, 10) > 0) valid.push(s);
    else if (s.startsWith("N") && s.length > 1 && /^\d+$/.test(s.slice(1))) valid.push(s);
  }
  return [...new Set(valid)];
}

function normalizeCodeField(val: unknown, maxJoin = 200): string {
  if (val == null) return "";
  if (Array.isArray(val)) {
    const parts = val.map((c) => String(c).trim()).filter(Boolean);
    return parts.join(",").slice(0, maxJoin);
  }
  const s = String(val).trim();
  if (!s) return "";
  return s
    .replace(/;/g, ",")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .join(",")
    .slice(0, maxJoin);
}

function parseBilled(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceRoleClient();
  await svc.from("users").upsert(
    {
      id: user.id,
      email: user.email!.toLowerCase().trim(),
      is_paid: false,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  let intake_mode = "paste";
  let payer = "";
  let patient_name = "";
  let provider_name_in = "";
  let provider_npi_in = "";
  let denial_reason = "";
  let billed = 0;
  let cpt_part = "";
  let icd_part = "";
  let claim_number_in = "";
  let date_of_service_raw: string | null = null;
  const raw_denial_codes: string[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    intake_mode = (form.get("intake_mode") as string) || "paste";
    payer = String(form.get("payer") || form.get("payer_name") || "");
    patient_name = String(form.get("patient_name") || form.get("patient") || "");
    provider_name_in = String(form.get("provider_name") || "");
    provider_npi_in = String(form.get("provider_npi") || "");
    denial_reason = String(form.get("denial_reason") || "");
    const raw_amt = form.get("billed_amount") || form.get("amount");
    billed = parseBilled(raw_amt);
    const cptIcd = String(form.get("cpt_icd") || "");
    cpt_part = normalizeCodeField(form.get("cpt_codes"), 200);
    if (cptIcd) {
      const parts = cptIcd
        .replace(/;/g, ",")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length) {
        cpt_part = parts[0]!.slice(0, 200);
        if (parts.length > 1) icd_part = parts.slice(1).join(",").slice(0, 100);
      }
    }
    const paste_extra = String(form.get("paste_details") || "");
    if (paste_extra) {
      denial_reason = (denial_reason ? `${denial_reason}\n\n${paste_extra}` : paste_extra).trim();
    }
    claim_number_in = String(form.get("claim_number") || "");
    date_of_service_raw = form.get("date_of_service") != null ? String(form.get("date_of_service")) : null;
    cpt_part = normalizeCodeField(form.get("cpt_codes"), 200) || cpt_part;
    icd_part =
      normalizeCodeField(
        form.get("diagnosis_code") || form.get("icd10_codes") || form.get("icd_codes"),
        200
      ) || icd_part;
    const dcStr = String(form.get("denial_code") || "");
    for (const part of dcStr.split(/[;,]/)) {
      if (part.trim()) raw_denial_codes.push(part.trim());
    }
  } else {
    let j: Record<string, unknown>;
    try {
      j = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Missing or invalid JSON body" }, { status: 400 });
    }
    if (j == null || typeof j !== "object") {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }
    intake_mode = (j.intake_mode as string) || "paste";
    payer = String(j.payer || j.payer_name || "").trim();
    patient_name = String(j.patient_name || j.patient || "").trim();
    provider_name_in = String(j.provider_name || "").trim();
    provider_npi_in = String(j.provider_npi || "").trim();
    denial_reason = String(j.denial_reason || "").trim();
    billed = parseBilled(j.billed_amount ?? j.amount);
    cpt_part = normalizeCodeField(j.cpt_codes, 200);
    const cpt_icd = String(j.cpt_icd || "").trim();
    if (cpt_icd) {
      const parts = cpt_icd
        .replace(/;/g, ",")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length) {
        cpt_part = parts[0]!.slice(0, 200);
        if (parts.length > 1) icd_part = parts.slice(1).join(",").slice(0, 100);
      }
    }
    const paste_extra = String(j.paste_details || "").trim();
    if (paste_extra) {
      denial_reason = (denial_reason ? `${denial_reason}\n\n${paste_extra}` : paste_extra).trim();
    }
    claim_number_in = String(j.claim_number || "")
      .trim()
      .slice(0, 100);
    date_of_service_raw = j.date_of_service != null ? String(j.date_of_service) : null;
    icd_part = normalizeCodeField(j.diagnosis_code || j.icd10_codes || j.icd_codes, 200) || icd_part;
    const denial_codes_payload = j.denial_codes;
    if (Array.isArray(denial_codes_payload)) {
      for (const x of denial_codes_payload) {
        if (x != null) raw_denial_codes.push(String(x).trim());
      }
    } else if (typeof denial_codes_payload === "string" && denial_codes_payload.trim()) {
      for (const part of denial_codes_payload.split(/[;,]/)) {
        if (part.trim()) raw_denial_codes.push(part.trim());
      }
    }
    for (const part of String(j.denial_code || "")
      .split(/[;,]/)) {
      if (part.trim()) raw_denial_codes.push(part.trim());
    }
    if (!payer) {
      return NextResponse.json({ error: "Missing payer" }, { status: 400 });
    }
  }

  if (!provider_name_in.trim() || !provider_npi_in.trim() || !patient_name.trim()) {
    return NextResponse.json(
      { error: "Patient name, provider name, and NPI are required" },
      { status: 400 }
    );
  }

  if (!denial_reason || !String(denial_reason).trim()) {
    denial_reason =
      "Denial details from uploaded or pasted documentation. " +
      "Review the generated appeal and attach supporting records as needed.";
  }
  if (!payer || !String(payer).trim()) {
    payer = "Unknown payer";
  }

  let denial_codes = normalizeDenialCodes(raw_denial_codes);
  if (!denial_codes.length) denial_codes = ["97"];
  const denial_code_stored = denial_codes.join(" / ").slice(0, 50);

  const today = new Date();
  const claim_number =
    claim_number_in ||
    `ONB-${String(today.getUTCHours()).padStart(2, "0")}${String(today.getUTCMinutes()).padStart(2, "0")}${String(
      today.getUTCSeconds()
    ).padStart(2, "0")}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;

  let dos = today.toISOString().slice(0, 10);
  if (date_of_service_raw) {
    const ds = String(date_of_service_raw).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) dos = ds;
  }

  const npi10 = (provider_npi_in.replace(/\D/g, "") + "0000000000").slice(0, 10);

  const accessToken = await getEngineAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = getInternalFlaskBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        error: "Intake engine not configured",
        message: "Set INTERNAL_FLASK_BASE_URL or NEXT_PUBLIC_FLASK_API_URL to the Fly.io engine URL.",
      },
      { status: 503 }
    );
  }

  const res = await fetch(`${base}/api/generate/appeal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      payer: payer.slice(0, 200),
      claim_number,
      patient_name: patient_name.slice(0, 100),
      provider_name: provider_name_in.slice(0, 200),
      provider_npi: npi10,
      date_of_service: dos,
      denial_reason: denial_reason.slice(0, 12000),
      denial_codes: denial_codes,
      denial_code: denial_code_stored,
      billed_amount: billed,
      cpt_codes: cpt_part || null,
      diagnosis_code: icd_part || null,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    return NextResponse.json(
      { error: errBody.error || "Preview generation failed", details: res.statusText },
      { status: res.status }
    );
  }

  const out = (await res.json()) as { appeal_id: string; letter_text: string; pdf_url?: string };
  const { appeal_id: createdAppealId, letter_text: text } = out;
  const appeal_id = createdAppealId;
  const excerpt = text.slice(0, PREVIEW_CHARS);
  const total_len = text.length;

  return NextResponse.json(
    {
      appeal_id,
      revenue_at_risk: billed,
      revenue_message: `This claim represents $${billed.toFixed(2)} in denied revenue`,
      preview_excerpt: excerpt,
      preview_total_length: total_len,
      preview_truncated: total_len > PREVIEW_CHARS,
      intake_mode,
    },
    { status: 201 }
  );
}
