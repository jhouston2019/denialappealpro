import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api/require-authenticated-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function clip(val: unknown, maxLen: number) {
  const t = (val != null ? String(val) : "").trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

function profileJsonFromRow(row: Record<string, unknown>) {
  return {
    provider_name: String(row.provider_name ?? "") || "",
    provider_npi: String(row.provider_npi ?? "") || "",
    provider_address: String(row.provider_address ?? "") || "",
    provider_phone: String(row.provider_phone ?? "") || "",
    provider_fax: String(row.provider_fax ?? "") || "",
  };
}

export async function GET() {
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = user.email?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: "User email missing" }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const { data, error } = await db.from("users").select("*").eq("email", email).maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(profileJsonFromRow(data as Record<string, unknown>), { status: 200 });
}

export async function POST(request: NextRequest) {
  return PUT(request);
}

export async function PUT(request: NextRequest) {
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = user.email?.toLowerCase().trim();
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

  const db = createServiceRoleClient();
  const { error } = await db.from("users").update(patch).eq("email", email);
  if (error) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
