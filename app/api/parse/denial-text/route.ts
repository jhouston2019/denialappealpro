import { NextRequest, NextResponse } from "next/server";
import { runParseDenialTextLocal } from "@/lib/denial-parse/run-local-parse";

export const runtime = "nodejs";

/**
 * Forwards to Fly `/api/extract/text` when INTERNAL_FLASK_BASE_URL is set.
 * Anonymous /start is allowed; extraction does not require JWT on Flask.
 */
export async function POST(request: NextRequest) {
  try {
    let text = "";
    try {
      const j = (await request.json()) as { text?: string };
      text = (j.text || "").trim();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    const res = await runParseDenialTextLocal(text, null);
    return NextResponse.json(res.data, { status: res.status });
  } catch (e) {
    console.error("[api/parse/denial-text] unhandled", e);
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
