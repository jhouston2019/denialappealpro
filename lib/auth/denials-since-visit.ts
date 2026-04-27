import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "New since last visit" denials; works with any Supabase client (service or browser, with RLS).
 */
export async function getNewDenialsSinceVisit(
  supabase: SupabaseClient,
  userId: string,
  lastQueueVisitAt: string | null
): Promise<{ count: number; dollarValue: number }> {
  let q = supabase.from("appeals").select("billed_amount").eq("user_id", userId);
  if (lastQueueVisitAt) {
    q = q.gt("created_at", lastQueueVisitAt);
  }
  const { data, error } = await q;
  if (error || !data) return { count: 0, dollarValue: 0 };
  const count = data.length;
  const dollarValue =
    Math.round(
      data.reduce(
        (s, r) => s + parseFloat(String((r as { billed_amount: unknown }).billed_amount || 0)),
        0
      ) * 100
    ) / 100;
  return { count, dollarValue };
}
