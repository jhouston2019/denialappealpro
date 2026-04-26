import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Body = {
  user_id?: string;
  appeal_id?: string;
  generated_at?: string;
};

/**
 * After successful appeal generation, the internal engine POSTs here with the
 * same Supabase JWT. We verify the user and increment usage in public.users.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const authId = userData.user.id;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = (body.user_id || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  if (userId !== authId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = createServiceRoleClient();
  const { data: row, error: selErr } = await svc
    .from("users")
    .select("appeals_generated_monthly")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) {
    console.error("record-usage select", selErr);
    return NextResponse.json({ error: "Failed to read user" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const current = parseInt(String((row as { appeals_generated_monthly: number | null }).appeals_generated_monthly ?? 0), 10) || 0;
  const { error: upErr } = await svc
    .from("users")
    .update({ appeals_generated_monthly: current + 1 })
    .eq("id", userId);

  if (upErr) {
    console.error("record-usage update", upErr);
    return NextResponse.json({ error: "Failed to update usage" }, { status: 500 });
  }

  return NextResponse.json({ success: true, appeal_id: body.appeal_id ?? null });
}
