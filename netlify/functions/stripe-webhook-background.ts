import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { processCheckoutSessionCompletedEvent, STRIPE_VERSION } from "../../lib/stripe/process-checkout-session-completed";

function getRawBody(event: Parameters<Handler>[0]): string {
  const body = event.body;
  if (!body) return "";
  if (event.isBase64Encoded) {
    return Buffer.from(body, "base64").toString("utf8");
  }
  return body;
}

/**
 * checkout.session.completed — idempotent DB mirror. Primary: POST /api/auth/create-session-from-stripe
 * (success URL). Shared: lib/stripe/process-checkout-session-completed.ts
 */
const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!whSecret || !stripeKey) {
    console.error("STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY are required");
    return { statusCode: 500, body: "Server misconfiguration" };
  }

  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  if (!sig) {
    return { statusCode: 400, body: "Missing stripe-signature" };
  }

  const rawBody = getRawBody(event);
  const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_VERSION });
  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return { statusCode: 400, body: "Invalid signature" };
  }

  const result = await processCheckoutSessionCompletedEvent(stripeEvent, stripe);
  return { statusCode: result.statusCode, body: JSON.stringify(result.body) };
};

export { handler as default, handler };
