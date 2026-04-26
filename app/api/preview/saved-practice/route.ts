import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type ProfileOut = {
  provider_name: string;
  provider_npi: string;
  provider_address: string;
  provider_phone: string;
};

/**
 * For preview wizard: whether the logged-in user has a non-empty
 * `provider_name` in public.users (skip inline practice form when true).
 * Anonymous: hasProviderName false, profile null.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { hasProviderName: false, profile: null as ProfileOut | null },
      { status: 200 }
    );
  }

  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("users")
    .select("provider_name, provider_npi, provider_address, provider_phone")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { hasProviderName: false, profile: null as ProfileOut | null },
      { status: 200 }
    );
  }

  const row = data as {
    provider_name: string | null;
    provider_npi: string | null;
    provider_address: string | null;
    provider_phone: string | null;
  };
  const name = String(row.provider_name || "").trim();
  const hasProviderName = name.length > 0;
  if (!hasProviderName) {
    return NextResponse.json(
      { hasProviderName: false, profile: null as ProfileOut | null },
      { status: 200 }
    );
  }

  const d = (row.provider_npi || "").replace(/\D/g, "");
  const npi = d.length === 10 ? d : d.slice(0, 10);

  const profile: ProfileOut = {
    provider_name: name,
    provider_npi: npi,
    provider_address: String(row.provider_address || "").trim(),
    provider_phone: String(row.provider_phone || "").trim(),
  };

  return NextResponse.json({ hasProviderName: true, profile }, { status: 200 });
}
