import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { generateQueueAppealLetter } from "@/lib/appeal/generate-queue-letter";
import { mapAppealToDetail } from "@/lib/queue/serialize-appeal";
import { appendClaimEvent } from "@/lib/queue/append-event";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ appealId: string }> }) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const { appealId } = await context.params;
  await request.json().catch(() => ({}));
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
  const billed = parseFloat(String(row.billed_amount ?? 0)) || 0;
  const text = await generateQueueAppealLetter(
    {
      payer: String(row.payer || ""),
      claim_number: String(row.claim_number || ""),
      patient_id: String(row.patient_id || ""),
      provider_name: String(row.provider_name || ""),
      provider_npi: String(row.provider_npi || ""),
      date_of_service: String(row.date_of_service || "").slice(0, 10),
      denial_reason: `Second-level (follow-up) appeal.\n\nPrior letter summary:\n${String(row.generated_letter_text || row.denial_reason || "").slice(0, 8000)}`,
      denial_code: (row.denial_code as string) || null,
      cpt_codes: (row.cpt_codes as string) || null,
      diagnosis_code: (row.diagnosis_code as string) || null,
      billed_amount: billed,
      appeal_level: "level_2",
    },
    "follow_up"
  );
  const now = new Date().toISOString();
  await svc
    .from("appeals")
    .update({
      generated_letter_text: text,
      appeal_generation_kind: "follow_up",
      queue_status: "generated",
      last_generated_at: now,
    })
    .eq("id", row.id as number);
  await appendClaimEvent(row.id as number, r.userId, "follow_up_generated", "Follow-up appeal draft created");
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
