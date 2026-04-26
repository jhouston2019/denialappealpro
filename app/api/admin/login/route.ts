import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyPassword } from "@/lib/admin/password";
import {
  createAdminToken,
  ADMIN_SESSION_COOKIE,
  maxAgeSec,
} from "@/lib/admin/session-cookie";

/**
 * Verifies public.admins row (active). Sets httpOnly signed cookie + returns same token for Bearer/CRA.
 */
export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const password = body.password || "";
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, username, email, is_active, password_hash")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !admin) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!verifyPassword(password, admin.password_hash as string)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await supabase
    .from("admins")
    .update({ last_login: new Date().toISOString() })
    .eq("id", admin.id as number);

  const token = createAdminToken(admin.id as number);
  const res = NextResponse.json({
    success: true,
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
    },
  });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec(),
  });
  return res;
}
