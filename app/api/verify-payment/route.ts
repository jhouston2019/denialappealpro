import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.email?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: "No email on session" }, { status: 400 });
  }

  const svc = createServiceRoleClient();
  const { data, error: dbErr } = await svc
    .from("users")
    .select("is_paid")
    .eq("email", email)
    .maybeSingle();

  if (dbErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({
    is_paid: data?.is_paid === true,
    email,
  });
}
