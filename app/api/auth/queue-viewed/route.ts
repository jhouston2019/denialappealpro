import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getPublicUserById } from "@/lib/auth/user-payload";

/**
 * Matches Flask: requires paid user. Updates last_queue_visit_at.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await getPublicUserById(authData.user.id);
  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (row.is_paid !== true) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const svc = createServiceRoleClient();
  const { error } = await svc
    .from("users")
    .update({ last_queue_visit_at: new Date().toISOString() })
    .eq("id", authData.user.id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
