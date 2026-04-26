import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * /api/admin/users + appeal_count (batch counts).
 */
export async function GET(request: NextRequest) {
  const auth = await getAdminFromRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "50", 10) || 50));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createServiceRoleClient();
  const { data: users, error, count } = await supabase
    .from("users")
    .select("id, email, subscription_tier, subscription_credits, bulk_credits, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (users || []).map((u) => u.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: rows } = await supabase
      .from("appeals")
      .select("user_id")
      .in("user_id", ids);
    for (const r of (rows || []) as { user_id: string }[]) {
      const id = r.user_id;
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  const out = (users || []).map((u) => ({
    id: u.id,
    email: u.email,
    subscription_tier: u.subscription_tier,
    subscription_credits: u.subscription_credits,
    bulk_credits: u.bulk_credits,
    total_credits: (u.subscription_credits || 0) + (u.bulk_credits || 0),
    created_at: u.created_at,
    appeal_count: counts.get(u.id) ?? 0,
  }));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  return NextResponse.json(
    {
      users: out,
      pagination: {
        page,
        per_page: perPage,
        total,
        pages,
      },
    },
    { status: 200 }
  );
}
