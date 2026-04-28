import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { STRIPE_VERSION } from "@/lib/stripe/process-checkout-session-completed";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

function jsonResponse(data: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const { session_id } = (await request.json()) as { session_id?: string };
    if (!session_id) return jsonResponse({ error: "session_id required" }, 400);

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return jsonResponse({ error: "Stripe not configured" }, 500);

    const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const email =
      session.customer_details?.email?.trim().toLowerCase() ||
      session.customer_email?.trim().toLowerCase() ||
      (session.metadata?.email || "").trim().toLowerCase();

    if (!email) return jsonResponse({ error: "No email on Stripe session" }, 400);

    const serviceRole = createServiceRoleClient();

    // User should already exist (webhook ran) — but create if not
    const { data: listData } = await serviceRole.auth.admin.listUsers({ perPage: 1000 });
    let user = listData?.users?.find((u) => u.email?.toLowerCase() === email);

    if (!user) {
      const { data: created, error: createErr } = await serviceRole.auth.admin.createUser({
        email,
        email_confirm: true,
        password: randomUUID(),
      });
      if (createErr || !created.user) {
        return jsonResponse({ error: "Failed to find or create user" }, 500);
      }
      user = created.user;
    }

    // Mint session via magic link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    const { data: linkData, error: linkErr } = await serviceRole.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${siteUrl}/success` },
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return jsonResponse({ error: "Failed to generate magic link" }, 500);
    }

    const browserClient = await createClient();
    const { error: otpErr } = await browserClient.auth.verifyOtp({
      type: "email",
      token_hash: linkData.properties.hashed_token,
    });

    if (otpErr) {
      return jsonResponse({ error: `verifyOtp failed: ${otpErr.message}` }, 500);
    }

    return jsonResponse({ ok: true, email }, 200);
  } catch (err) {
    console.error("[create-session-from-stripe]", err);
    return jsonResponse({ error: String(err) }, 500);
  }
}
