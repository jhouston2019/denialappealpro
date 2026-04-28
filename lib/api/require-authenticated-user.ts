import { NextResponse } from "next/server";
import { getPublicUserById, type PublicUserRow } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = { userId: string; row: PublicUserRow };

export async function requireAuthenticatedUser(): Promise<
  { ok: true } & AuthenticatedUser | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();
  if (error || !authData.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const row = await getPublicUserById(authData.user.id);
  if (!row) {
    return { ok: false, response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  return { ok: true, userId: authData.user.id, row };
}
