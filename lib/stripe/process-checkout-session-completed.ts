import { randomBytes } from "crypto";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAuthUserIdByEmail } from "@/lib/stripe/get-auth-user-id-by-email";
import { normalizeSubscriptionTier } from "@/lib/billing/subscription-tier";

const STRIPE_VERSION = "2025-02-24.acacia" as const;

type ProcessResult = { statusCode: number; body: Record<string, unknown> };

/**
 * Idempotent Provisioning: checkout.session.completed → public.users (is_paid, Stripe ids, tier).
 * Shared by Netlify function and `POST /api/webhooks/stripe`.
 */
export async function processCheckoutSessionCompletedEvent(
  stripeEvent: Stripe.Event,
  stripe: Stripe
): Promise<ProcessResult> {
  if (stripeEvent.type !== "checkout.session.completed") {
    return { statusCode: 200, body: { received: true, skipped: true } };
  }

  /** Service role only — `auth.admin.createUser` requires the service key, not the anon key. */
  const supabase = createServiceRoleClient();

  const { data: existingEv } = await supabase
    .from("processed_webhook_events")
    .select("id")
    .eq("event_id", stripeEvent.id)
    .maybeSingle();
  if (existingEv) {
    return { statusCode: 200, body: { received: true, duplicate: true } };
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session;
  if (session.status !== "complete") {
    return { statusCode: 200, body: { received: true, ignored: "incomplete" } };
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { statusCode: 200, body: { received: true, ignored: "payment" } };
  }

  const metadata = session.metadata || {};
  const plan = ((metadata.plan as string) || "").toLowerCase().trim();
  void ((metadata.price_id as string) || "");

  let email =
    (session.customer_email as string) || (session.customer_details?.email as string) || "";
  if (!email && session.customer) {
    const cust = await stripe.customers.retrieve(session.customer as string);
    if (typeof cust !== "string" && !cust.deleted) {
      email = cust.email || "";
    }
  }
  email = email.trim().toLowerCase();
  if (!email) {
    console.error("No email on checkout session", session.id);
    return { statusCode: 400, body: { error: "Missing email on session" } };
  }

  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subId = typeof session.subscription === "string" ? session.subscription : null;

  const rawTierKey = `${(metadata.subscription_tier as string) || ""}`.trim().toLowerCase() || plan;
  const subscriptionTierForDb: string | null =
    normalizeSubscriptionTier(rawTierKey) ?? (rawTierKey ? rawTierKey : null);

  const createUserEmail =
    (typeof session.customer_email === "string" && session.customer_email.trim()
      ? session.customer_email.trim().toLowerCase()
      : email) || email;

  let userId = await getAuthUserIdByEmail(supabase, email);

  if (!userId) {
    console.log("[webhook] checkout.session.completed", {
      email: session.customer_email,
      session_id: session.id,
    });
    const tempPassword = randomBytes(32).toString("base64url");
    const { data: createData, error: cErr } = await supabase.auth.admin.createUser({
      email: createUserEmail,
      email_confirm: true,
      password: tempPassword,
      app_metadata: { source: "stripe_checkout" },
      user_metadata: { plan, price_id: (metadata.price_id as string) || null },
    });
    if (cErr) {
      console.error("[webhook] failed to create user:", cErr);
    } else {
      console.log("[webhook] user created:", createData?.user?.id);
    }
    if (cErr) {
      const msg = (cErr.message || "").toLowerCase();
      if (msg.includes("registered") || msg.includes("exists") || cErr.status === 422) {
        userId = await getAuthUserIdByEmail(supabase, email);
      }
      if (!userId) {
        console.error("createUser failed:", cErr);
        return { statusCode: 500, body: { error: "Auth user create failed" } };
      }
    } else {
      userId = createData?.user?.id ?? (await getAuthUserIdByEmail(supabase, createUserEmail));
    }
  }

  if (!userId) {
    return { statusCode: 500, body: { error: "Could not resolve auth user" } };
  }

  const { error: upErr } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      is_paid: true,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
      subscription_tier: subscriptionTierForDb,
      payment_verification_status: null,
    },
    { onConflict: "id" }
  );
  if (upErr) {
    console.error("[webhook] failed to create profile:", upErr);
    console.error("Users upsert failed:", upErr);
    return { statusCode: 500, body: { error: "Users upsert failed" } };
  }
  console.log("[webhook] profile created for:", email);

  const { error: peErr } = await supabase.from("processed_webhook_events").insert({
    event_id: stripeEvent.id,
    event_type: stripeEvent.type,
  });
  if (peErr) {
    if (peErr.code === "23505") {
      return { statusCode: 200, body: { received: true, idempotent: true } };
    }
    console.error("Record webhook event failed:", peErr);
    return { statusCode: 500, body: { error: "Failed to record event" } };
  }

  return { statusCode: 200, body: { received: true, ok: true } };
}

export { STRIPE_VERSION };
