import { getPublicUserByEmail } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/server";
import PricingPageClient from "@/components/pricing/pricing-page-client";

export default async function PricingPage() {
  let userEmail = "";

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const row = await getPublicUserByEmail(authData.user.email ?? "");
      userEmail = (row?.email || authData.user.email || "").trim();
    }
  } catch {
    // anonymous — fine
  }

  return <PricingPageClient userEmail={userEmail} />;
}
