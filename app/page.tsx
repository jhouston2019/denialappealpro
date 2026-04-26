import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicUserById } from "@/lib/auth/user-payload";
import LandingPro from "@/components/landing/landing-pro";

/**
 * Public marketing home. Paid customers are sent into the app; everyone else sees the landing page.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const row = await getPublicUserById(user.id);
    if (row?.is_paid === true) {
      redirect("/start");
    }
  }
  return <LandingPro />;
}
