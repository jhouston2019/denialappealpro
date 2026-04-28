import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";

const MAX_BATCH_ROWS = 100;

export async function POST(request: NextRequest) {
  const r = await requireAuthenticatedUser();
  if (!r.ok) return r.response;

  const ct = (request.headers.get("content-type") || "").toLowerCase();
  const svc = createServiceRoleClient();

  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const f = form.get("file");
    if (!f || !(f instanceof File) || !f.name) {
      return NextResponse.json({ error: "CSV file required (field name: file)" }, { status: 400 });
    }
    const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
    if (!["csv", "txt"].includes(ext)) {
      return NextResponse.json({ error: "Upload a .csv file" }, { status: 400 });
    }
  } else {
    let data: { rows?: unknown[] };
    try {
      data = (await request.json()) as { rows?: unknown[] };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const rows = data.rows;
    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json({ error: 'JSON body must include non-empty "rows" array' }, { status: 400 });
    }
    if (rows.length > MAX_BATCH_ROWS) {
      return NextResponse.json({ error: `Maximum ${MAX_BATCH_ROWS} rows per batch` }, { status: 400 });
    }
  }

  const jobId = crypto.randomUUID();
  const { error } = await svc.from("batch_appeal_jobs").insert({
    job_id: jobId,
    user_id: r.userId,
    status: "error",
    job_kind: "csv",
    total: 0,
    current: 0,
    ok_count: 0,
    error:
      "Batch appeal generation (CSV) is not wired in the Next worker yet — Phase F will add the background job + OpenAI.",
    summary_rows: [],
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ job_id: jobId, max_rows: MAX_BATCH_ROWS, job_kind: "csv" }, { status: 202 });
}
