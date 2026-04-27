import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWelcomeRedirectUrl } from "@/lib/auth/welcome-redirect";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const JSON_HDR = { "Content-Type": "application/json" } as const;

/**
 * Resend the recovery / magic link email. No session required.
 * admin.generateLink (per product spec) + resetPasswordForEmail to actually deliver (GoTrue does not email from generateLink).
 */
export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: JSON_HDR });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return new Response(JSON.stringify({ error: "email is required" }), { status: 400, headers: JSON_HDR });
  }

  const supabase = createServiceRoleClient();
  const { error: linkErr } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: getWelcomeRedirectUrl() },
  });
  if (linkErr) {
    console.error("[send-access-link] generateLink failed:", linkErr);
    return new Response(JSON.stringify({ error: linkErr.message || "Failed to generate link" }), {
      status: 400,
      headers: JSON_HDR,
    });
  }

  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!publicUrl || !anon) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500, headers: JSON_HDR });
  }
  const pub = createClient(publicUrl, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: mailErr } = await pub.auth.resetPasswordForEmail(email, { redirectTo: getWelcomeRedirectUrl() });
  if (mailErr) {
    console.error("[send-access-link] resetPasswordForEmail failed:", mailErr);
    return new Response(JSON.stringify({ error: mailErr.message || "Failed to send email" }), {
      status: 500,
      headers: JSON_HDR,
    });
  }
  return NextResponse.json({ success: true } as const, { status: 200, headers: JSON_HDR });
}
