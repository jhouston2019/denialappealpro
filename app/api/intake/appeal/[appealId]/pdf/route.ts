import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { textToPdfBytes } from "@/lib/appeal/render-letter-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ appealId: string }> }
) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const { appealId } = await context.params;
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("appeals")
    .select("appeal_id, claim_number, generated_letter_text")
    .eq("appeal_id", appealId)
    .eq("user_id", r.userId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const text = (data as { generated_letter_text: string | null }).generated_letter_text || "";
  if (!text.trim()) {
    return NextResponse.json({ error: "No appeal text yet" }, { status: 400 });
  }
  const claim = (data as { claim_number: string }).claim_number || "appeal";
  const safe = String(claim).replace(/[^a-z0-9_-]/gi, "_");
  const bytes = await textToPdfBytes(text);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="appeal_${safe}.pdf"`,
    },
  });
}
