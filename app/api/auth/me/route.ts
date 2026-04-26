import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildMePayload, getPublicUserById } from "@/lib/auth/user-payload";

/**
 * Session from cookies; is_paid and has_data only from public.users / appeals (service role).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicRow = await getPublicUserById(authData.user.id);
  if (!publicRow) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const payload = await buildMePayload(authData.user, publicRow);
  return NextResponse.json(payload, { status: 200 });
}
