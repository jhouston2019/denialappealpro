import { randomUUID } from "crypto";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Idempotent: find or create auth user from Stripe email, upsert public.users with is_paid.
 * Works for anonymous checkout — no metadata.user_id required.
 */
export async function applyPaidStateFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<{ ok: true; userId: string } | { ok: false; error: string; code: "metadata" | "db" }> {
  if (session.status !== "complete") {
    return { ok: false, error: "Checkout is not complete", code: "metadata" };
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { ok: false, error: "Payment not complete", code: "metadata" };
  }

  const email =
    session.customer_details?.email?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    (session.metadata?.email || "").trim().toLowerCase();

  if (!email) {
    return { ok: false, error: "No email on Stripe session", code: "metadata" };
  }

  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subId = typeof session.subscription === "string" ? session.subscription : null;

  const serviceRole = createServiceRoleClient();

  // Find or create Supabase auth user by email
  let userId: string;
  const { data: listData } = await serviceRole.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email);

  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error: createErr } = await serviceRole.auth.admin.createUser({
      email,
      email_confirm: true,
      password: randomUUID(),
    });
    if (createErr || !created.user) {
      // May have been created by a race — try lookup again
      const { data: retry } = await serviceRole.auth.admin.listUsers({ perPage: 1000 });
      const found = retry?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!found) {
        return { ok: false, error: `Failed to create user: ${createErr?.message}`, code: "db" };
      }
      userId = found.id;
    } else {
      userId = created.user.id;
    }
  }

  // Upsert public.users — handles trigger race via onConflict
  const { error: upsertErr } = await serviceRole.from("users").upsert(
    {
      id: userId,
      email,
      is_paid: true,
      plan_limit: 0,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      ...(subId ? { stripe_subscription_id: subId } : {}),
    },
    { onConflict: "id", ignoreDuplicates: false }
  );

  if (upsertErr) {
    console.error("[apply-checkout] upsert failed:", upsertErr);
    return { ok: false, error: upsertErr.message, code: "db" };
  }

  return { ok: true, userId };
}
