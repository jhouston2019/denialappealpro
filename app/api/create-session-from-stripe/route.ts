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

async function findUserByEmail(
  service: ReturnType<typeof createServiceRoleClient>,
  email: string
) {
  const e = email.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return null;
    }
    const found = data.users.find((u) => (u.email || "").toLowerCase() === e);
    if (found) {
      return found;
    }
    if (data.users.length < 200) {
      break;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { session_id?: string };
    const { session_id } = body;
    if (!session_id) {
      return jsonResponse({ error: "session_id required" }, 400);
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(key, { apiVersion: STRIPE_VERSION });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const emailRaw = session.customer_details?.email || session.customer_email;
    if (!emailRaw || String(emailRaw).trim().length === 0) {
      return jsonResponse({ error: "No email on Stripe session" }, 400);
    }
    const email = String(emailRaw).trim().toLowerCase();

    const serviceRole = createServiceRoleClient();

    let user = await findUserByEmail(serviceRole, email);

    if (!user) {
      const tempPassword = randomUUID() + "Aa!1" + randomUUID();
      const { data: created, error: createErr } = await serviceRole.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createErr) {
        user = await findUserByEmail(serviceRole, email);
        if (!user) {
          return jsonResponse(
            { error: createErr.message || "Failed to create user" },
            500
          );
        }
      } else if (created.user) {
        user = created.user;
      } else {
        return jsonResponse({ error: "Failed to create user" }, 500);
      }
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer as { id?: string } | null)?.id ?? null;

    const { error: upsertErr } = await serviceRole.from("users").upsert(
      {
        id: user.id,
        email: email.toLowerCase(),
        is_paid: true,
        plan_limit: 0,
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      },
      { onConflict: "id", ignoreDuplicates: false }
    );

    if (upsertErr) {
      return jsonResponse({ error: upsertErr.message }, 500);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const { data: linkData, error: linkErr } = await serviceRole.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${siteUrl.replace(/\/$/, "")}/success` },
    });
    const hashed = linkData?.properties?.hashed_token;
    if (linkErr || !hashed) {
      return jsonResponse({ error: "Failed to generate magic link" }, 500);
    }

    const browserClient = await createClient();
    const { error: otpErr } = await browserClient.auth.verifyOtp({
      type: "email",
      email,
      token_hash: hashed,
    });
    if (otpErr) {
      return jsonResponse({ error: "Failed to establish session" }, 500);
    }

    return jsonResponse({ ok: true, email }, 200);
  } catch (err) {
    console.error("[create-session-from-stripe]", err);
    return jsonResponse({ error: String(err) }, 500);
  }
}
