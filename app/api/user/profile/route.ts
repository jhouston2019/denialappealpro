import { NextRequest, NextResponse } from "next/server";
import { requirePaidAppUser } from "@/lib/api/require-authenticated-user";
import { normalizeUserEmail } from "@/lib/auth/user-payload";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function clip(val: unknown, maxLen: number) {
  const t = (val != null ? String(val) : "").trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

export async function GET() {
  const r = await requirePaidAppUser();
  if (!r.ok) return r.response;
  const email = normalizeUserEmail(r.row.email);
  if (!email) {
    return NextResponse.json({ error: "User email missing" }, { status: 400 });
  }
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("users")
    .select("provider_name, provider_npi, provider_address, provider_phone, provider_fax")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  return NextResponse.json(
    {
      provider_name: (data as { provider_name: string | null } | null)?.provider_name || "",
      provider_npi: (data as { provider_npi: string | null } | null)?.provider_npi || "",
      provider_address: (data as { provider_address: string | null } | null)?.provider_address || "",
      provider_phone: (data as { provider_phone: string | null } | null)?.provider_phone || "",
      provider_fax: (data as { provider_fax: string | null } | null)?.provider_fax || "",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  return PUT(request);
}

export async function PUT(request: NextRequest) {
  const r = await requirePaidAppUser();
  if (!r.ok) return r.response;
  const email = normalizeUserEmail(r.row.email);
  if (!email) {
    return NextResponse.json({ error: "User email missing" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch: Record<string, string | null> = {};
  if ("provider_name" in body) patch.provider_name = clip(body.provider_name, 200);
  if ("provider_npi" in body) patch.provider_npi = clip(body.provider_npi, 20);
  if ("provider_address" in body) patch.provider_address = clip(body.provider_address, 500);
  if ("provider_phone" in body) patch.provider_phone = clip(body.provider_phone, 50);
  if ("provider_fax" in body) patch.provider_fax = clip(body.provider_fax, 50);

  const svc = createServiceRoleClient();
  const { error } = await svc.from("users").update(patch).eq("email", email);
  if (error) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
