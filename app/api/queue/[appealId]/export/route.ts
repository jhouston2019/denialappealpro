import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";
import { textToPdfBytes } from "@/lib/appeal/render-letter-pdf";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ appealId: string }> }) {
  const r = await requireAuthenticatedUser();
  if (!r.ok) return r.response;
  const { appealId } = await context.params;
  const mode = (request.nextUrl.searchParams.get("mode") || "appeal").toLowerCase();
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
    return NextResponse.json({ error: "No appeal text to export" }, { status: 400 });
  }
  const claim = (data as { claim_number: string }).claim_number || "export";
  if (mode === "appeal" || mode === "merged") {
    const bytes = await textToPdfBytes(text);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="appeal_${String(claim).replace(/[^a-z0-9_-]/gi, "_")}.pdf"`,
      },
    });
  }
  if (mode === "zip") {
    return NextResponse.json(
      { error: "ZIP export (appeal+fax package) is not implemented — use mode=appeal" },
      { status: 400 }
    );
  }
  return NextResponse.json({ error: "Invalid mode; use appeal, merged, or zip" }, { status: 400 });
}
