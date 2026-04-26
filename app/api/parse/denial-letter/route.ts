import { NextRequest, NextResponse } from "next/server";
import { runParseDenialLetterLocal } from "@/lib/denial-parse/run-local-parse";

export const runtime = "nodejs";

/**
 * Forwards to Fly `/api/extract/file` when INTERNAL_FLASK_BASE_URL is set.
 * Anonymous /start is allowed; extraction does not require a Supabase user JWT on Flask.
 */
export async function POST(request: NextRequest) {
  try {
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
    const res = await runParseDenialLetterLocal(file, null);
    return NextResponse.json(res.data, { status: res.status });
  } catch (e) {
    console.error("[api/parse/denial-letter] unhandled", e);
    return NextResponse.json(
      {
        success: false,
        error: "parse_route_failed",
        message: e instanceof Error ? e.message : String(e),
        allow_manual: true,
      },
      { status: 500 }
    );
  }
}
