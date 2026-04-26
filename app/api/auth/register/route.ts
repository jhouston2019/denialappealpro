import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  buildSessionPayload,
  getPublicUserByEmail,
  getPublicUserById,
} from "@/lib/auth/user-payload";

async function authUserExistsForEmail(
  email: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const e = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    if (data.users.some((u) => (u.email || "").toLowerCase() === e)) return true;
    if (data.users.length < 1000) break;
  }
  return false;
}

/**
 * Post-payment registration only: public.users must have is_paid true for this email.
 * Same JSON shape as Flask register (201 + user + new_denials_*).
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; referral_code?: string; ref?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailRaw = (body.email || "").trim();
  const password = body.password || "";
  const referralCode = (body.referral_code || body.ref || "").trim().toLowerCase() || null;

  if (!emailRaw || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const email = emailRaw.toLowerCase();
  const paidRow = await getPublicUserByEmail(email);
  if (!paidRow || paidRow.is_paid !== true) {
    return NextResponse.json(
      { error: "Complete checkout for this plan before creating a password for this email." },
      { status: 403 }
    );
  }

  if (await authUserExistsForEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { referral_code: referralCode || undefined },
    },
  });

  if (error) {
    const msg = error.message || "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }

  const byId = await getPublicUserById(data.user.id);
  const byEmail = paidRow;
  if (byId && byId.id !== byEmail.id) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error:
          "Account profile does not match checkout. Use the same email as Stripe, or contact support.",
      },
      { status: 409 }
    );
  }
  if (!byId && byEmail.id !== data.user.id) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error:
          "Checkout profile must be linked before sign-up. Open the invite from checkout or use the same email.",
      },
      { status: 409 }
    );
  }

  const row = (await getPublicUserById(data.user.id)) ?? byEmail;

  if (referralCode) {
    const svc = createServiceRoleClient();
    const { data: partner } = await svc
      .from("referral_partners")
      .select("id")
      .eq("code", referralCode)
      .eq("is_active", true)
      .maybeSingle();
    if (partner?.id) {
      await svc
        .from("users")
        .update({ referred_by_id: partner.id as number })
        .eq("id", row.id);
    }
  }

  const payload = await buildSessionPayload(data.user, row);
  return NextResponse.json(payload, { status: 201 });
}
