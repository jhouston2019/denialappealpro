import { randomBytes } from "crypto";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAuthUserIdByEmail } from "@/lib/stripe/get-auth-user-id-by-email";

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

  const tier = plan === "starter" || plan === "core" || plan === "scale" ? plan : null;

  let userId = await getAuthUserIdByEmail(supabase, email);

  if (!userId) {
    const tempPassword = randomBytes(32).toString("base64url");
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: tempPassword,
      app_metadata: { source: "stripe_checkout" },
      user_metadata: { plan, price_id: (metadata.price_id as string) || null },
    });
    if (cErr) {
      const msg = (cErr.message || "").toLowerCase();
      if (msg.includes("registered") || msg.includes("exists") || cErr.status === 422) {
        userId = await getAuthUserIdByEmail(supabase, email);
      }
      if (!userId) {
        console.error("createUser failed:", cErr);
        return { statusCode: 500, body: { error: "Auth user create failed" } };
      }
    } else if (created.user) {
      userId = created.user.id;
    }
  }

  if (!userId) {
    return { statusCode: 500, body: { error: "Could not resolve auth user" } };
  }

  const { data: prof } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
  if (prof) {
    const { error: uErr } = await supabase
      .from("users")
      .update({
        is_paid: true,
        stripe_customer_id: customerId,
        stripe_subscription_id: subId,
        subscription_tier: tier,
        payment_verification_status: null,
      })
      .eq("id", userId);
    if (uErr) {
      console.error("Update users failed:", uErr);
      return { statusCode: 500, body: { error: "Update users failed" } };
    }
  } else {
    const { error: iErr } = await supabase.from("users").insert({
      id: userId,
      email,
      is_paid: true,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
      subscription_tier: tier,
      payment_verification_status: null,
    });
    if (iErr) {
      console.error("Insert users failed:", iErr);
      return { statusCode: 500, body: { error: "Insert users failed" } };
    }
  }

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
