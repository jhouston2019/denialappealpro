import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidAppUser } from "@/lib/api/require-authenticated-user";

const PREVIEW_CHARS = 900;

export async function GET(
  _request: Request,
  context: { params: Promise<{ appealId: string }> }
) {
  const r = await requirePaidAppUser();
  if (!r.ok) return r.response;
  const { appealId } = await context.params;
  if (!appealId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("appeals")
    .select(
      "appeal_id, payer, claim_number, billed_amount, generated_letter_text, payment_status, status, user_id"
    )
    .eq("appeal_id", appealId)
    .eq("user_id", r.userId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const text = (data as { generated_letter_text: string | null }).generated_letter_text || "";
  const billed = parseFloat(String((data as { billed_amount: unknown }).billed_amount || 0)) || 0;
  const excerpt = text.slice(0, PREVIEW_CHARS);

  return NextResponse.json(
    {
      appeal_id: (data as { appeal_id: string }).appeal_id,
      payer: (data as { payer: string }).payer,
      claim_number: (data as { claim_number: string }).claim_number,
      billed_amount: billed,
      revenue_message: `This claim represents $${billed.toFixed(2)} in denied revenue`,
      preview_excerpt: excerpt,
      preview_total_length: text.length,
      preview_truncated: text.length > PREVIEW_CHARS,
      payment_status: (data as { payment_status: string | null }).payment_status,
      status: (data as { status: string }).status,
      account_linked: true,
    },
    { status: 200 }
  );
}
