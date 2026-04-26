import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";

const RETAIL_PRICE = 79.0;

type Row = Record<string, unknown>;

function gval(row: Row, key: string, altKeys: string[], defaults: Row): unknown {
  if (row[key] != null && row[key] !== "") return row[key];
  for (const k of altKeys) {
    if (row[k] != null && row[k] !== "") return row[k];
  }
  return defaults[key];
}

function parseDos(raw: unknown, defaults: Row): string {
  const dosRaw = raw ?? defaults.date_of_service;
  if (!dosRaw) {
    return new Date().toISOString().slice(0, 10);
  }
  const s = String(dosRaw).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    const m = String(dosRaw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const mm = m[1]!.padStart(2, "0");
      const dd = m[2]!.padStart(2, "0");
      return `${m[3]}-${mm}-${dd}`;
    }
  } catch {
    /* fall through */
  }
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;

  const ct = (request.headers.get("content-type") || "").toLowerCase();
  let defaults: Row = {};
  let rows: Row[] = [];

  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const dr = form.get("defaults");
    if (dr && typeof dr === "string") {
      try {
        defaults = JSON.parse(dr) as Row;
      } catch {
        defaults = {};
      }
    }
    const f = form.get("file");
    if (!f || !(f instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const raw = await f.text();
    rows = parseCsvSimple(raw);
  } else {
    let body: { defaults?: Row; rows?: Row[] };
    try {
      body = (await request.json()) as { defaults?: Row; rows?: Row[] };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    defaults = body.defaults || {};
    rows = body.rows || [];
  }

  if (!rows.length) {
    return NextResponse.json({ error: "No rows" }, { status: 400 });
  }

  const svc = createServiceRoleClient();
  const created: string[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const claim_number = String(
      gval(row as Row, "claim_number", ["claim_id", "Claim ID", "claim"], defaults) || ""
    ).trim();
    const payer = String(gval(row as Row, "payer", ["Payer", "insurance"], defaults) || "").trim();
    const denial_reason = String(
      gval(row as Row, "denial_reason", ["Denial Reason", "reason"], defaults) || ""
    ).trim();

    if (!claim_number || !payer || !denial_reason) {
      errors.push({ row: i + 1, error: "claim_number, payer, denial_reason required" });
      continue;
    }

    const patient_id = String(
      gval(row as Row, "patient_id", ["Patient ID"], defaults) || "TBD"
    ).trim();
    const provider_name = String(
      gval(row as Row, "provider_name", ["Provider"], defaults) || "TBD"
    ).trim();
    let provider_npi = String(
      gval(row as Row, "provider_npi", ["NPI"], defaults) || "0000000000"
    ).trim();
    provider_npi = (provider_npi.replace(/\D/g, "") + "0000000000").slice(0, 10);

    const dos = parseDos(gval(row as Row, "date_of_service", ["Date of Service", "dos", "service_date"], defaults), defaults);

    let billed = 0;
    try {
      const amtRaw = gval(row as Row, "billed_amount", ["Amount", "amount", "Billed Amount"], defaults);
      billed = amtRaw != null && amtRaw !== "" ? parseFloat(String(amtRaw)) : 0;
    } catch {
      billed = 0;
    }

    const paidRaw = gval(row as Row, "paid_amount", ["Paid", "paid", "Paid Amount"], defaults);
    const paid_note =
      paidRaw != null && paidRaw !== "" ? `Paid amount (import): ${paidRaw}` : "";

    const { data: dupRows } = await svc
      .from("appeals")
      .select("id")
      .eq("user_id", r.userId)
      .eq("claim_number", claim_number)
      .eq("payer", payer)
      .in("status", ["pending", "paid", "completed"])
      .limit(1);

    if (dupRows && dupRows.length > 0) {
      errors.push({ row: i + 1, error: `Duplicate claim ${claim_number} for payer` });
      continue;
    }

    const appDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const idSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const appeal_id = `APP-${appDate}-${idSuffix}`;

    const denial_code = String(gval(row as Row, "denial_code", ["Denial Code"], defaults) || "").slice(0, 50) || null;
    const diagnosis_code = String(
      gval(row as Row, "diagnosis_code", ["ICD", "diagnosis"], defaults) || ""
    ).slice(0, 100) || null;
    const cpt_codes = String(gval(row as Row, "cpt_codes", ["CPT"], defaults) || "").slice(0, 200) || null;
    const appeal_level = String(
      (defaults as { appeal_level?: string }).appeal_level ||
        gval(row as Row, "appeal_level", [], defaults) ||
        "level_1"
    );

    const { error: insErr } = await svc.from("appeals").insert({
      appeal_id,
      user_id: r.userId,
      payer,
      claim_number,
      patient_id: patient_id.slice(0, 100),
      provider_name: provider_name.slice(0, 200),
      provider_npi: provider_npi,
      date_of_service: dos,
      denial_reason,
      denial_code,
      diagnosis_code,
      cpt_codes,
      billed_amount: billed,
      appeal_level: appeal_level.slice(0, 50),
      status: "pending",
      payment_status: "unpaid",
      price_charged: RETAIL_PRICE,
      credit_used: false,
      queue_status: "pending",
      queue_notes: paid_note || null,
    });
    if (insErr) {
      errors.push({ row: i + 1, error: insErr.message || "insert failed" });
      continue;
    }
    created.push(appeal_id);
  }

  return NextResponse.json(
    { created, errors, created_count: created.length },
    { status: 201 }
  );
}

function parseCsvSimple(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts: string[] = [];
    let cur = "";
    let inQ = false;
    for (const c of lines[i]!) {
      if (c === '"') inQ = !inQ;
      else if (!inQ && c === ",") {
        parts.push(cur.trim().replace(/^"|"$/g, ""));
        cur = "";
      } else cur += c;
    }
    parts.push(cur.trim().replace(/^"|"$/g, ""));
    const row: Row = {};
    headers.forEach((h, j) => {
      row[h] = parts[j] ?? "";
    });
    if (Object.values(row).some((v) => String(v).trim())) out.push(row);
  }
  return out;
}
