import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidAppUser } from "@/lib/api/require-authenticated-user";
import { generateQueueAppealLetter } from "@/lib/appeal/generate-queue-letter";
import { mapAppealToDetail } from "@/lib/queue/serialize-appeal";
import { appendClaimEvent } from "@/lib/queue/append-event";
import { buildUsageStats } from "@/lib/auth/build-usage-stats";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ appealId: string }> }) {
  const r = await requirePaidAppUser();
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
  if (row.retail_token_used && row.status === "completed") {
    return NextResponse.json({ error: "Already generated" }, { status: 400 });
  }
  if (row.status === "completed") {
    return NextResponse.json({ error: "Appeal already completed" }, { status: 400 });
  }

  const billed = parseFloat(String(row.billed_amount ?? 0)) || 0;
  const text = await generateQueueAppealLetter(
    {
      payer: String(row.payer || ""),
      claim_number: String(row.claim_number || ""),
      patient_id: String(row.patient_id || ""),
      provider_name: String(row.provider_name || ""),
      provider_npi: String(row.provider_npi || ""),
      date_of_service: String(row.date_of_service || "").slice(0, 10),
      denial_reason: String(row.denial_reason || ""),
      denial_code: (row.denial_code as string) || null,
      cpt_codes: (row.cpt_codes as string) || null,
      diagnosis_code: (row.diagnosis_code as string) || null,
      billed_amount: billed,
      appeal_level: (row.appeal_level as string) || "level_1",
    },
    "initial"
  );

  const now = new Date().toISOString();
  const { error: upErr } = await svc
    .from("appeals")
    .update({
      generated_letter_text: text,
      queue_status: "generated",
      status: "completed",
      last_generated_at: now,
      completed_at: now,
      generation_count: (Number(row.generation_count) || 0) + 1,
      credit_used: true,
      payment_status: row.payment_status || "unpaid",
      appeal_tracking_status: "generated",
      tracking_updated_at: now,
    })
    .eq("id", row.id as number);
  if (upErr) {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  await appendClaimEvent(row.id as number, r.userId, "generated", "Appeal letter generated (Next.js)");

  const { data: fresh } = await svc.from("appeals").select("*").eq("id", row.id as number).single();
  const { data: evs } = await svc
    .from("claim_status_events")
    .select("id, event_type, message, created_at")
    .eq("appeal_db_id", row.id as number)
    .order("created_at", { ascending: true });
  const events = (evs || []) as { id: number; event_type: string; message: string | null; created_at: string | null }[];
  const claim = mapAppealToDetail(fresh as Record<string, unknown>, events, false, "");
  const usage = await buildUsageStats(r.row.email);
  return NextResponse.json(
    {
      claim,
      post_generation: {
        claim_amount: billed,
        recovery_potential_estimate: round2(billed * 0.35),
        free_trial_remaining: null as number | null,
      },
      usage,
    },
    { status: 200 }
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
