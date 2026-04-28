import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";
import { runIntelligenceAnalysis } from "@/lib/intelligence/coding-intelligence";

/**
 * Port of backend /api/intelligence/analyze (coding_intelligence.run_intelligence_analysis).
 */
export async function POST(request: NextRequest) {
  const r = await requireAuthenticatedUser();
  if (!r.ok) return r.response;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* allow empty */
  }
  return NextResponse.json(runIntelligenceAnalysis(body), { status: 200 });
}
