import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";

export async function GET() {
  const r = await requireAuthenticatedUser();
  if (!r.ok) return r.response;
  const svc = createServiceRoleClient();
  const { count, error } = await svc
    .from("appeals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", r.userId);
  if (error) {
    return NextResponse.json({ error: "Count failed" }, { status: 500 });
  }
  return NextResponse.json({ total: count ?? 0 }, { status: 200 });
}
