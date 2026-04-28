import { getNewDenialsSinceVisit as getNewDenialsWithClient } from "@/lib/auth/denials-since-visit";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PublicUserRow = {
  id: string;
  email: string;
  is_paid: boolean | null;
  last_queue_visit_at: string | null;
  last_active_at: string | null;
};

export { normalizeUserEmail } from "./normalize-user-email";

/** Server-only: service role reads `public.users` (bypasses RLS). */
export async function getPublicUserByEmail(email: string): Promise<PublicUserRow | null> {
  const e = email.toLowerCase().trim();
  if (!e) return null;
  const db = createServiceRoleClient();
  const { data, error } = await db.from("users").select("*").eq("email", e).maybeSingle();
  if (error || !data) return null;
  return data as PublicUserRow;
}

export async function hasAppealDataForUser(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("appeals")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return data != null;
}

/** Mirrors Flask _new_denials_since_visit (server / service role). */
export async function getNewDenialsSinceVisit(
  userId: string,
  lastQueueVisitAt: string | null
): Promise<{ count: number; dollarValue: number }> {
  const supabase = createServiceRoleClient();
  return getNewDenialsWithClient(supabase, userId, lastQueueVisitAt);
}
