import { NextRequest, NextResponse } from "next/server";
import { getAppealDetail } from "@/lib/api/admin-appeals-get";

type Ctx = { params: Promise<{ segments: string[] }> };

/**
 * GET /api/admin/appeals/:appealId (one segment) — multi-segment → 404
 */
export async function GET(request: NextRequest, context: Ctx) {
  const { segments } = await context.params;
  if (segments.length > 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return getAppealDetail(request, segments[0]!);
}
