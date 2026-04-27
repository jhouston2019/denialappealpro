import { createHmac } from "crypto";

/**
 * Deterministic one-way password for Supabase `signInWithPassword` after verified Stripe payment.
 * Server-only. Guarded by payment completion + `metadata.user_id` on the Checkout Session.
 * Requires a long, random `DAP_STRIPE_SESSION_PASSWORD_SECRET` in production.
 */
export function requireStripeBootstrapSecret(): string {
  const secret = process.env.DAP_STRIPE_SESSION_PASSWORD_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("DAP_STRIPE_SESSION_PASSWORD_SECRET must be set to at least 32 characters");
  }
  return secret;
}

export function getStripeSessionBootstrapPassword(userId: string): string {
  const secret = requireStripeBootstrapSecret();
  return createHmac("sha256", secret)
    .update(`dap:stripe_bootstrap:1:${userId}`)
    .digest("base64url")
    .slice(0, 48);
}
