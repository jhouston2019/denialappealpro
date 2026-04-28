import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function AppRouter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email?.toLowerCase().trim();
  if (!email) {
    redirect("/login?reason=missing_profile");
  }

  const svc = createServiceRoleClient();
  const { data: profile } = await svc
    .from("users")
    .select("is_paid, subscription_tier, plan_limit")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.is_paid) {
    redirect("/pricing");
  }

  // Single purchase plan routes directly to upload
  const isSinglePlan =
    profile.subscription_tier === "single" || profile.plan_limit === 1;

  if (isSinglePlan) {
    redirect("/start");
  }

  redirect("/dashboard");
}
