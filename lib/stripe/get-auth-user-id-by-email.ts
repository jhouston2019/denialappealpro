import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Svc = ReturnType<typeof createServiceRoleClient>;

/**
 * Resolves Supabase auth user id by email (admin API). Used by Stripe checkout webhook.
 */
export async function getAuthUserIdByEmail(supabase: Svc, email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || "").toLowerCase() === e);
    if (u) return u.id;
    if (data.users.length < 1000) break;
  }
  return null;
}
