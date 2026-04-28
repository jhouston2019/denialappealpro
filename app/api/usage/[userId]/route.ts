import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";
import { buildUsageStats } from "@/lib/auth/build-usage-stats";

type Ctx = { params: Promise<{ userId: string }> };

/** GET /api/usage/:userId — current user only (port of Flask /api/usage/<int:user_id>). */
export async function GET(_request: NextRequest, context: Ctx) {
  const { userId } = await context.params;
  const r = await requireAuthenticatedUser();
  if (!r.ok) return r.response;
  if (userId !== r.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const stats = await buildUsageStats(userId);
  if (!stats) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(stats, { status: 200 });
}
