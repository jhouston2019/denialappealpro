import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicUserById } from "@/lib/auth/user-payload";
import PricingPageClient from "@/components/pricing/pricing-page-client";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    redirect("/login?next=/pricing");
  }
  const row = await getPublicUserById(authData.user.id);
  if (!row) {
    redirect("/register?next=/pricing");
  }
  const email = row.email.trim();
  return <PricingPageClient userEmail={email} />;
}
