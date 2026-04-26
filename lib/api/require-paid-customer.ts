import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicUserById, type PublicUserRow } from "@/lib/auth/user-payload";

export type PaidCustomer = { userId: string; row: PublicUserRow };

export async function requirePaidCustomer(): Promise<
  { ok: true } & PaidCustomer | { ok: false; response: NextResponse }
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
  if (row.is_paid !== true) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Active subscription required" }, { status: 403 }),
    };
  }
  return { ok: true, userId: authData.user.id, row };
}
