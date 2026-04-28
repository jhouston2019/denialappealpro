import { NextResponse } from "next/server";
import { getPublicUserById, type PublicUserRow } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = { userId: string; row: PublicUserRow };

/** Logged-in user with a profile row (e.g. preview intake). Does not require is_paid. */
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

/** Product APIs: session + profile + is_paid (same rule as app layout). */
export async function requirePaidAppUser(): Promise<
  { ok: true } & AuthenticatedUser | { ok: false; response: NextResponse }
> {
  const base = await requireAuthenticatedUser();
  if (!base.ok) return base;
  if (base.row.is_paid !== true) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Active purchase required" }, { status: 403 }),
    };
  }
  return base;
}
