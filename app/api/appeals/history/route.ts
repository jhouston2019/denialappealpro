import { NextResponse } from "next/server";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Logged-in user's appeals for Appeal History (replaces legacy GET /api/appeals/history for current user).
 */
export async function GET() {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("appeals")
    .select("id, appeal_id, claim_number, payer, status")
    .eq("user_id", r.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: "Failed to load appeals" }, { status: 500 });
  }
  const rows = (data || []) as {
    id: string;
    appeal_id: string;
    claim_number: string | null;
    payer: string | null;
    status: string | null;
  }[];
  return NextResponse.json(
    {
      appeals: rows.map((a) => ({
        id: a.id,
        appeal_id: a.appeal_id,
        claim_number: a.claim_number,
        payer_name: a.payer,
        status: a.status,
      })),
    },
    { status: 200 }
  );
}
