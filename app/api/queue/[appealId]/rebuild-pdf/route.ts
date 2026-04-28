import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";
import { mapAppealToDetail } from "@/lib/queue/serialize-appeal";

/**
 * Legacy endpoint: store-side PDF file path. Next.js uses on-demand PDF via /export; this bumps timestamps.
 */
export async function POST(_request: Request, context: { params: Promise<{ appealId: string }> }) {
  const r = await requireAuthenticatedUser();
  if (!r.ok) return r.response;
  const { appealId } = await context.params;
  const svc = createServiceRoleClient();
  const { data: a, error } = await svc
    .from("appeals")
    .select("*")
    .eq("appeal_id", appealId)
    .eq("user_id", r.userId)
    .maybeSingle();
  if (error || !a) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const row = a as Record<string, unknown>;
  await svc
    .from("appeals")
    .update({ last_generated_at: new Date().toISOString() })
    .eq("id", row.id as number);
  const { data: fresh } = await svc.from("appeals").select("*").eq("id", row.id as number).single();
  const { data: evs } = await svc
    .from("claim_status_events")
    .select("id, event_type, message, created_at")
    .eq("appeal_db_id", row.id as number)
    .order("created_at", { ascending: true });
  const events = (evs || []) as { id: number; event_type: string; message: string | null; created_at: string | null }[];
  const claim = mapAppealToDetail(fresh as Record<string, unknown>, events, false, "");
  return NextResponse.json({ claim }, { status: 200 });
}
