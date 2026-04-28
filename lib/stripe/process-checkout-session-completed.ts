import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { applyPaidStateFromCheckoutSession } from "@/lib/stripe/apply-checkout-session-to-user";

const STRIPE_VERSION = "2025-02-24.acacia" as const;

type ProcessResult = { statusCode: number; body: Record<string, unknown> };

/**
 * Idempotent webhook: mirror paid state + record event. Users are signed in only via /login.
 */
export async function processCheckoutSessionCompletedEvent(
  stripeEvent: Stripe.Event,
  _stripe: Stripe
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
  const applied = await applyPaidStateFromCheckoutSession(session);
  if (!applied.ok) {
    // metadata errors (no email, not complete) are not retryable — ack to Stripe
    if (applied.code === "metadata") {
      console.warn("[webhook] skipped:", applied.error);
      return { statusCode: 200, body: { received: true, skipped: applied.error } };
    }
    // db errors are retryable — return 500 so Stripe retries
    console.error("[webhook] db error:", applied.error);
    return { statusCode: 500, body: { error: applied.error } };
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
