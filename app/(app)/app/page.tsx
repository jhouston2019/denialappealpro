import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

/**
 * Entry hub under paid shell: single purchase → /upload; subscription → /dashboard.
 * Entitlement is synced in `(app)/layout` when landing as `/app?session_id=…`.
 */
export default async function AppEntryPage() {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    redirect("/login");
  }
  const svc = createServiceRoleClient();
  const { data: row, error: rowErr } = await svc
    .from("users")
    .select("stripe_subscription_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (rowErr || !row) {
    redirect("/login");
  }
  const isSubscription =
    row.stripe_subscription_id != null && String(row.stripe_subscription_id).length > 0;
  if (isSubscription) {
    redirect("/dashboard");
  }
  redirect("/upload");
}
