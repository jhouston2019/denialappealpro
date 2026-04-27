import Stripe from "stripe";
import { applyPaidStateFromCheckoutSession } from "@/lib/stripe/apply-checkout-session-to-user";
import { STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";

export type SyncCheckoutResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * Idempotent: retrieve a paid Checkout Session and apply entitlement. Must only run when
 * `metadata.user_id` matches the authenticated user (caller responsibility).
 */
export async function syncCheckoutSessionForUser(
  sessionId: string,
  expectedUserId: string
): Promise<SyncCheckoutResult> {
  const sid = sessionId.trim();
  if (!sid || !sid.startsWith("cs_")) {
    return { ok: false, error: "Invalid session_id", status: 400 };
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { ok: false, error: "Stripe is not configured", status: 500 };
  }
  const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sid);
  } catch (e) {
    console.error("[sync-checkout] retrieve failed:", e);
    return { ok: false, error: "Could not load checkout session", status: 400 };
  }
  const metaUid = `${session.metadata?.user_id || ""}`.trim();
  if (metaUid !== expectedUserId) {
    return { ok: false, error: "Session does not match this account", status: 403 };
  }
  const applied = await applyPaidStateFromCheckoutSession(session);
  if (!applied.ok) {
    return {
      ok: false,
      error: applied.error,
      status: applied.code === "metadata" ? 400 : 500,
    };
  }
  return { ok: true };
}
