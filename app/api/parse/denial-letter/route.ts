import { NextRequest, NextResponse } from "next/server";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { runParseDenialLetterLocal } from "@/lib/denial-parse/run-local-parse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File) || !file.size) {
    return NextResponse.json(
      { success: false, error: "No file uploaded", allow_manual: true, message: "No file uploaded" },
      { status: 400 }
    );
  }
  if (!/\.pdf$/i.test(file.name) && file.type && file.type !== "application/pdf") {
    return NextResponse.json(
      { success: false, error: "Invalid file", allow_manual: true, message: "Upload a PDF denial letter" },
      { status: 400 }
    );
  }
  const res = await runParseDenialLetterLocal(file);
  return NextResponse.json(res.data, { status: res.status });
}
