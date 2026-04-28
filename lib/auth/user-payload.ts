import { getNewDenialsSinceVisit as getNewDenialsWithClient } from "@/lib/auth/denials-since-visit";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PublicUserRow = {
  id: string;
  email: string;
  last_queue_visit_at: string | null;
  last_active_at: string | null;
};

export async function getPublicUserById(userId: string): Promise<PublicUserRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, last_queue_visit_at, last_active_at")
    .eq("id", userId)
    .single();
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
