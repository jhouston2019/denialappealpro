import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPro from "@/components/landing/landing-pro";

/** Public marketing home; signed-in users go straight into the product shell. */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/start");
  }
  return <LandingPro />;
}
