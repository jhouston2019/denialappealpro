import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";

const MAX_PDF_BATCH_FILES = 100;

export async function POST(request: NextRequest) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: 'multipart/form-data with field "files" required' }, { status: 400 });
  }
  const form = await request.formData();
  const files = form.getAll("files");
  const pdfs = files.filter(
    (f) => f instanceof File && f.name && f.name.toLowerCase().endsWith(".pdf")
  ) as File[];
  if (!pdfs.length) {
    return NextResponse.json(
      { error: 'No files uploaded (use input name="files" multiple)' },
      { status: 400 }
    );
  }
  if (pdfs.length > MAX_PDF_BATCH_FILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PDF_BATCH_FILES} PDFs per batch` },
      { status: 400 }
    );
  }
  const svc = createServiceRoleClient();
  const jobId = crypto.randomUUID();
  const { error } = await svc.from("batch_appeal_jobs").insert({
    job_id: jobId,
    user_id: r.userId,
    status: "error",
    job_kind: "pdf",
    total: 0,
    current: 0,
    ok_count: 0,
    error: "Multi-PDF batch is not wired in the Next worker yet (Phase F).",
    summary_rows: [],
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    {
      job_id: jobId,
      max_files: MAX_PDF_BATCH_FILES,
      job_kind: "pdf",
      file_count: pdfs.length,
    },
    { status: 202 }
  );
}
