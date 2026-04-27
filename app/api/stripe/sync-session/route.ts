import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCheckoutSessionForUser } from "@/lib/stripe/sync-checkout-session";

const JSON_HDR = { "Content-Type": "application/json" } as const;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: JSON_HDR });
  }

  let body: { session_id?: string };
  try {
    body = (await request.json()) as { session_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: JSON_HDR });
  }
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400, headers: JSON_HDR });
  }

  const result = await syncCheckoutSessionForUser(sessionId, authData.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers: JSON_HDR });
  }
  return NextResponse.json({ ok: true } as const, { status: 200, headers: JSON_HDR });
}
