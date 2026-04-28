import { createClient } from "@/lib/supabase/server";
import { getPublicUserById } from "@/lib/auth/user-payload";
import PricingPageClient from "@/components/pricing/pricing-page-client";

export default async function PricingPage() {
  let userEmail = "";

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const row = await getPublicUserById(authData.user.id);
      if (row?.email) {
        userEmail = row.email.trim();
      }
    }
  } catch {
    // anonymous — fine
  }

  return <PricingPageClient userEmail={userEmail} />;
}
