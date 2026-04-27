import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { buildSessionPayload, getPublicUserById } from "@/lib/auth/user-payload";

/**
 * Sign up from /login: Supabase Auth + public.users row (is_paid false until Stripe).
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
        { error: "An account with this email already exists. Sign in instead." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }

  const svc = createServiceRoleClient();
  const { data: existingRow } = await svc.from("users").select("id").eq("id", data.user.id).maybeSingle();
  if (!existingRow) {
    const { error: insErr } = await svc.from("users").insert({
      id: data.user.id,
      email,
      is_paid: false,
      subscription_tier: null,
      plan_limit: 0,
    });
    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json(
          { error: "This email is already associated with an account. Sign in instead." },
          { status: 409 }
        );
      }
      console.error("[register] users insert:", insErr);
      return NextResponse.json({ error: "Could not create account profile" }, { status: 500 });
    }
  }

  if (referralCode) {
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
        .eq("id", data.user.id);
    }
  }

  const publicRow = await getPublicUserById(data.user.id);
  if (!publicRow) {
    return NextResponse.json({ error: "Account profile could not be loaded" }, { status: 500 });
  }

  const payload = await buildSessionPayload(data.user, publicRow);
  return NextResponse.json(payload, { status: 201 });
}
