import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getPublicUserByEmail, type PublicUserRow } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = { userId: string; row: PublicUserRow };

/**
 * SSR auth: cookie session via `createServerClient`. Throws if not logged in.
 */
export async function requireAuthenticatedUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user || error) {
    throw new Error("Unauthorized");
  }
  return user;
}

/** Logged-in user + `public.users` row (service role). Does not require is_paid. */
export async function requireAuthenticatedUserWithProfile(): Promise<
  { ok: true; user: User; userId: string; row: PublicUserRow } | { ok: false; response: NextResponse }
> {
  let user: User;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const email = user.email?.toLowerCase().trim();
  if (!email) {
    return { ok: false, response: NextResponse.json({ error: "User email missing" }, { status: 400 }) };
  }
  const row = await getPublicUserByEmail(email);
  if (!row) {
    return { ok: false, response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  return { ok: true, user, userId: user.id, row };
}

/** Product APIs: session + profile + is_paid. */
export async function requirePaidAppUser(): Promise<
  { ok: true } & AuthenticatedUser | { ok: false; response: NextResponse }
> {
  const base = await requireAuthenticatedUserWithProfile();
  if (!base.ok) return base;
  if (base.row.is_paid !== true) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Active purchase required" }, { status: 403 }),
    };
  }
  return { ok: true, userId: base.userId, row: base.row };
}
