import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { User as SupaUser } from "@supabase/supabase-js";

export type PublicUserRow = {
  id: string;
  email: string;
  is_paid: boolean | null;
  payment_verification_status: string | null;
  last_queue_visit_at: string | null;
  last_active_at: string | null;
};

/**
 * is_paid and all entitlements: always from public.users, never from JWT.
 */
export async function getPublicUserById(userId: string): Promise<PublicUserRow | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, is_paid, payment_verification_status, last_queue_visit_at, last_active_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PublicUserRow;
}

export async function getPublicUserByEmail(email: string): Promise<PublicUserRow | null> {
  const e = email.trim().toLowerCase();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, is_paid, payment_verification_status, last_queue_visit_at, last_active_at")
    .eq("email", e)
    .maybeSingle();
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

/** Mirrors Flask _new_denials_since_visit. */
export async function getNewDenialsSinceVisit(
  userId: string,
  lastQueueVisitAt: string | null
): Promise<{ count: number; dollarValue: number }> {
  const supabase = createServiceRoleClient();
  let q = supabase.from("appeals").select("billed_amount").eq("user_id", userId);
  if (lastQueueVisitAt) {
    q = q.gt("created_at", lastQueueVisitAt);
  }
  const { data, error } = await q;
  if (error || !data) return { count: 0, dollarValue: 0 };
  const count = data.length;
  const dollarValue = Math.round(
    data.reduce((s, r) => s + parseFloat(String((r as { billed_amount: unknown }).billed_amount || 0)), 0) * 100
  ) / 100;
  return { count, dollarValue };
}

function baseUserForLogin(row: PublicUserRow) {
  const u: Record<string, unknown> = {
    id: row.id,
    email: row.email,
    is_paid: row.is_paid,
    last_queue_visit_at: row.last_queue_visit_at,
  };
  if (row.payment_verification_status != null) {
    u.payment_verification_status = row.payment_verification_status;
  }
  return u;
}

/**
 * /api/auth/login and /api/auth/register — match Flask: user + new_denials_*.
 */
export async function buildSessionPayload(
  _auth: SupaUser,
  publicRow: PublicUserRow
): Promise<{
  user: Record<string, unknown>;
  new_denials_since_visit: number;
  new_denials_dollar_value: number;
}> {
  const { count, dollarValue } = await getNewDenialsSinceVisit(
    publicRow.id,
    publicRow.last_queue_visit_at
  );
  return {
    user: baseUserForLogin(publicRow),
    new_denials_since_visit: count,
    new_denials_dollar_value: dollarValue,
  };
}

/**
 * /api/auth/me — includes has_data; is_paid from public Row only.
 */
export async function buildMePayload(
  _auth: SupaUser,
  publicRow: PublicUserRow
): Promise<{
  user: Record<string, unknown>;
  new_denials_since_visit: number;
  new_denials_dollar_value: number;
}> {
  const { count, dollarValue } = await getNewDenialsSinceVisit(
    publicRow.id,
    publicRow.last_queue_visit_at
  );
  const hasData = await hasAppealDataForUser(publicRow.id);
  const u: Record<string, unknown> = {
    id: publicRow.id,
    email: publicRow.email,
    is_paid: publicRow.is_paid,
    has_data: hasData,
  };
  if (publicRow.payment_verification_status != null) {
    u.payment_verification_status = publicRow.payment_verification_status;
  }
  return {
    user: u,
    new_denials_since_visit: count,
    new_denials_dollar_value: dollarValue,
  };
}
