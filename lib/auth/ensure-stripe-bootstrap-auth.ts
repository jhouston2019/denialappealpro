import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeSessionBootstrapPassword } from "@/lib/auth/stripe-bootstrap-password";
import { getAuthUserIdByEmail } from "@/lib/stripe/get-auth-user-id-by-email";

function isAuthDuplicateError(err: { message?: string; status?: number } | null): boolean {
  if (!err) return false;
  const m = (err.message || "").toLowerCase();
  return m.includes("registered") || m.includes("exists") || m.includes("already") || err.status === 422;
}

/**
 * Creates or updates Supabase Auth for checkout with a deterministic server-side password
 * (see `getStripeSessionBootstrapPassword`). Returns the canonical `user_id` for Stripe
 * metadata (may differ from `proposedUserId` if the email was already registered).
 */
export async function ensureStripeBootstrapAuth(
  supabase: SupabaseClient,
  proposedUserId: string,
  email: string
): Promise<string> {
  const e = email.trim().toLowerCase();
  const setPwd = (id: string) => getStripeSessionBootstrapPassword(id);

  const { data: has } = await supabase.auth.admin.getUserById(proposedUserId);
  if (has?.user) {
    const { error: uErr } = await supabase.auth.admin.updateUserById(proposedUserId, {
      email: e,
      email_confirm: true,
      password: setPwd(proposedUserId),
    });
    if (uErr) {
      throw new Error(`auth update failed: ${uErr.message}`);
    }
    return proposedUserId;
  }

  const { error: cErr } = await supabase.auth.admin.createUser({
    id: proposedUserId,
    email: e,
    email_confirm: true,
    password: setPwd(proposedUserId),
    app_metadata: { source: "stripe_checkout" },
  });
  if (!cErr) {
    return proposedUserId;
  }
  if (!isAuthDuplicateError(cErr)) {
    throw new Error(`auth create failed: ${cErr.message}`);
  }
  const alt = await getAuthUserIdByEmail(supabase, e);
  if (!alt) {
    throw new Error("duplicate email but could not resolve user id for email");
  }
  const { error: u2 } = await supabase.auth.admin.updateUserById(alt, {
    email: e,
    email_confirm: true,
    password: setPwd(alt),
  });
  if (u2) {
    throw new Error(`auth update failed: ${u2.message}`);
  }
  return alt;
}
