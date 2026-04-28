import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";

export async function GET(
  _request: Request,
  context: { params: Promise<{ appealId: string }> }
) {
  const r = await requireAuthenticatedUser();
  if (!r.ok) return r.response;
  const { appealId } = await context.params;
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("appeals")
    .select("generated_letter_text")
    .eq("appeal_id", appealId)
    .eq("user_id", r.userId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { full_text: (data as { generated_letter_text: string | null }).generated_letter_text || "" },
    { status: 200 }
  );
}
