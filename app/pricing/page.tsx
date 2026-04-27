import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicUserById } from "@/lib/auth/user-payload";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import PricingPageClient from "@/components/pricing/pricing-page-client";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    redirect("/login?next=/pricing");
  }

  let row = await getPublicUserById(authData.user.id);
  const authEmail = authData.user.email?.trim().toLowerCase() ?? "";
  if (!row && authEmail) {
    const svc = createServiceRoleClient();
    const { error: insErr } = await svc.from("users").insert({
      id: authData.user.id,
      email: authEmail,
      is_paid: false,
      subscription_tier: null,
      plan_limit: 0,
    });
    if (!insErr) {
      row = await getPublicUserById(authData.user.id);
    }
  }

  if (!row) {
    redirect("/login?next=/pricing");
  }

  const email = row.email.trim();
  return <PricingPageClient userEmail={email} />;
}
