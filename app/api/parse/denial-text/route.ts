import { NextRequest, NextResponse } from "next/server";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";
import { runParseDenialTextLocal } from "@/lib/denial-parse/run-local-parse";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? null;

  let text = "";
  try {
    const j = (await request.json()) as { text?: string };
    text = (j.text || "").trim();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const res = await runParseDenialTextLocal(text, accessToken);
  return NextResponse.json(res.data, { status: res.status });
}
