import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parseAdminToken, ADMIN_SESSION_COOKIE } from "./session-cookie";
import { cookies } from "next/headers";

export type AdminRow = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
};

async function loadAdminByToken(token: string | null) {
  if (!token) {
    return { error: "Unauthorized - Admin login required", status: 401 } as const;
  }
  const adminId = parseAdminToken(token);
  if (adminId == null) {
    return { error: "Unauthorized - Admin login required", status: 401 } as const;
  }
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("admins")
    .select("id, username, email, is_active, last_login, created_at")
    .eq("id", adminId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) {
    return { error: "Unauthorized - Admin login required", status: 401 } as const;
  }
  return { admin: data as AdminRow, adminId } as const;
}

/**
 * Resolve admin from Cookie or Authorization Bearer; verify row in public.admins.
 */
export async function getAdminFromRequest(
  request: NextRequest
): Promise<{ admin: AdminRow; adminId: number } | { error: string; status: number }> {
  const authHeader = request.headers.get("Authorization") || "";
  let token: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  if (!token) {
    const jar = request.cookies.get(ADMIN_SESSION_COOKIE);
    token = jar?.value ?? null;
  }
  return loadAdminByToken(token);
}

/** For Server Components: use cookies() only. */
export async function getAdminFromCookie() {
  const c = (await cookies()).get(ADMIN_SESSION_COOKIE);
  return loadAdminByToken(c?.value ?? null);
}
