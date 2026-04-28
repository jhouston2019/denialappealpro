import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e || null;
}

function checkoutCustomerId(session: Stripe.Checkout.Session): string | null {
  const c = session.customer;
  if (typeof c === "string" && c) return c;
  if (c && typeof c === "object" && "deleted" in c && !c.deleted && "id" in c && typeof (c as { id?: string }).id === "string") {
    return (c as { id: string }).id;
  }
  return null;
}

async function resolveOrCreateAuthUserId(svc: ReturnType<typeof createServiceRoleClient>, email: string): Promise<string | null> {
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (!createErr && created.user?.id) {
    return created.user.id;
  }

  const msg = (createErr?.message || "").toLowerCase();
  const duplicate = createErr?.status === 422 || msg.includes("already") || msg.includes("registered");
  if (!duplicate) {
    console.error("[stripe webhook] createUser failed", createErr);
    return null;
  }

  const { data: page1, error: listErr } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr || !page1?.users?.length) {
    console.error("[stripe webhook] listUsers failed", listErr);
    return null;
  }
  const found = page1.users.find((u) => (u.email || "").toLowerCase() === email);
  if (found?.id) return found.id;

  const total = page1.total ?? page1.users.length;
  const perPage = 1000;
  const pages = Math.min(20, Math.ceil(total / perPage) || 1);
  for (let page = 2; page <= pages; page++) {
    const { data: next } = await svc.auth.admin.listUsers({ page, perPage });
    if (!next?.users?.length) break;
    const f = next.users.find((u) => (u.email || "").toLowerCase() === email);
    if (f?.id) return f.id;
  }

  return null;
}

/**
 * checkout.session.completed — sets public.users.is_paid (single source of truth). No client/session coupling.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const stripe = new Stripe(secret, { apiVersion: STRIPE_API_VERSION });
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    console.error("[stripe webhook] signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = normalizeEmail(session.customer_email || session.customer_details?.email);
  if (!email) {
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }

  let svc: ReturnType<typeof createServiceRoleClient>;
  try {
    svc = createServiceRoleClient();
  } catch (e) {
    console.error("[stripe webhook] service role", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: existingRow } = await svc.from("users").select("id").eq("email", email).maybeSingle();
  let userId: string | undefined = existingRow?.id as string | undefined;

  if (!userId) {
    const authId = await resolveOrCreateAuthUserId(svc, email);
    if (!authId) {
      return NextResponse.json({ error: "User resolution failed" }, { status: 500 });
    }
    userId = authId;
  }

  const customerId = checkoutCustomerId(session);
  const row: Record<string, unknown> = {
    id: userId,
    email,
    is_paid: true,
  };
  if (customerId) {
    row.stripe_customer_id = customerId;
  }

  const { error: upErr } = await svc.from("users").upsert(row, { onConflict: "id" });
  if (upErr) {
    console.error("[stripe webhook] upsert users", upErr);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
