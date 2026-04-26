import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { mapAppealToDetail } from "@/lib/queue/serialize-appeal";
import { appendClaimEvent } from "@/lib/queue/append-event";

const TRACKING = new Set(["generated", "submitted", "pending", "approved", "denied"]);
const QUEUE_STATUS = new Set(["pending", "in_progress", "generated", "submitted"]);
const PAYMENT_STATUS = new Set(["pending", "unpaid", "submitted", "paid"]);

async function loadAppeal(userId: string, appealId: string) {
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("appeals")
    .select("*")
    .eq("appeal_id", appealId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { appeal: data as Record<string, unknown>, svc };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ appealId: string }> }) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const { appealId } = await context.params;
  const loaded = await loadAppeal(r.userId, appealId);
  if ("error" in loaded && loaded.error) return loaded.error;
  const a = loaded.appeal!;
  const svc = createServiceRoleClient();
  const { data: evs } = await svc
    .from("claim_status_events")
    .select("id, event_type, message, created_at")
    .eq("appeal_db_id", a.id as number)
    .order("created_at", { ascending: true });
  const events = (evs || []) as { id: number; event_type: string; message: string | null; created_at: string | null }[];
  const claim = mapAppealToDetail(a, events, false, "Not yet evaluated in Next.js");
  return NextResponse.json({ claim }, { status: 200 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ appealId: string }> }) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const { appealId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const loaded = await loadAppeal(r.userId, appealId);
  if ("error" in loaded && loaded.error) return loaded.error;
  const a = loaded.appeal!;
  const appealDbId = a.id as number;
  const svc = createServiceRoleClient();
  const patch: Record<string, unknown> = {};

  if ("queue_notes" in body) {
    patch.queue_notes = String(body.queue_notes ?? "");
    await appendClaimEvent(appealDbId, r.userId, "note_updated", "Notes saved");
  }
  if ("generated_letter_text" in body) {
    patch.generated_letter_text = body.generated_letter_text;
    await appendClaimEvent(appealDbId, r.userId, "draft_edited", "Appeal text updated");
  }
  if ("queue_status" in body) {
    const newS = String(body.queue_status || "").toLowerCase();
    if (QUEUE_STATUS.has(newS)) {
      patch.queue_status = newS;
      if (newS === "submitted") {
        patch.submitted_to_payer_at = new Date().toISOString();
      }
      await appendClaimEvent(appealDbId, r.userId, "status_change", newS);
    }
  }
  if ("payment_status" in body) {
    const ps = String(body.payment_status || "").toLowerCase();
    if (PAYMENT_STATUS.has(ps)) {
      patch.payment_status = ps;
      await appendClaimEvent(appealDbId, r.userId, "payment_status", ps);
    }
  }
  if ("payer_fax" in body) {
    const raw = String(body.payer_fax || "").trim();
    patch.payer_fax = raw ? raw.slice(0, 50) : null;
    await appendClaimEvent(appealDbId, r.userId, "payer_fax_updated", "Fax number saved");
  }
  if ("appeal_tracking_status" in body) {
    const nt = String(body.appeal_tracking_status || "")
      .toLowerCase()
      .trim();
    if (TRACKING.has(nt)) {
      patch.appeal_tracking_status = nt;
      patch.tracking_updated_at = new Date().toISOString();
      if (nt === "submitted") {
        patch.submitted_to_payer_at = new Date().toISOString();
      }
      await appendClaimEvent(appealDbId, r.userId, "tracking_status", nt);
    }
  }

  if (Object.keys(patch).length) {
    const { error } = await svc.from("appeals").update(patch).eq("id", appealDbId);
    if (error) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  }

  const { data: fresh } = await svc.from("appeals").select("*").eq("id", appealDbId).single();
  const { data: evs } = await svc
    .from("claim_status_events")
    .select("id, event_type, message, created_at")
    .eq("appeal_db_id", appealDbId)
    .order("created_at", { ascending: true });
  const events = (evs || []) as { id: number; event_type: string; message: string | null; created_at: string | null }[];
  const claim = mapAppealToDetail(fresh as Record<string, unknown>, events, false, "Not yet evaluated in Next.js");
  return NextResponse.json({ claim }, { status: 200 });
}
