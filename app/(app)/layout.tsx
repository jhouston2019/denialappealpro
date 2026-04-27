import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getPublicUserById } from "@/lib/auth/user-payload";
import PaidAppHeader from "@/components/app/paid-app-header";
/**
 * Paid-app shell: no middleware. Always read is_paid from public.users by auth user id.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const row = await getPublicUserById(authData.user.id);
  if (!row) {
    redirect("/login");
  }

  if (row.is_paid !== true) {
    redirect("/pricing");
  }

  return (
    <>
      <PaidAppHeader />
      {children}
    </>
  );
}
