import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { buildSessionPayload, getPublicUserById } from "@/lib/auth/user-payload";

/**
 * Thin wrapper: signInWithPassword + same JSON shape as Flask (user + new_denials_*).
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim();
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const svc = createServiceRoleClient();
  await svc
    .from("users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", data.user.id);

  const publicRow = await getPublicUserById(data.user.id);
  if (!publicRow) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const payload = await buildSessionPayload(data.user, publicRow);
  return NextResponse.json(payload, { status: 200 });
}
