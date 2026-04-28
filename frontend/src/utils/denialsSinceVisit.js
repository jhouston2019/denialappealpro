/**
 * New denials since last queue visit (browser Supabase client + RLS).
 */
export async function getNewDenialsSinceVisit(supabase, userId, lastQueueVisitAt) {
  let q = supabase.from('appeals').select('billed_amount').eq('user_id', userId);
  if (lastQueueVisitAt) {
    q = q.gt('created_at', lastQueueVisitAt);
  }
  const { data, error } = await q;
  if (error || !data) return { count: 0, dollarValue: 0 };
  const count = data.length;
  const dollarValue =
    Math.round(
      data.reduce((s, r) => s + parseFloat(String(r.billed_amount || 0)), 0) * 100
    ) / 100;
  return { count, dollarValue };
}
