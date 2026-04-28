import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getPublicUserById } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/server";
import { DAP_PATHNAME_HEADER } from "@/lib/app/middleware-headers";
import PaidAppHeader from "@/components/app/paid-app-header";

/** Logged-in shell: Supabase session + `public.users` row. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  const h = await headers();
  const currentPath = h.get(DAP_PATHNAME_HEADER) ?? "/";

  if (!authData.user) {
    redirect("/login?next=" + encodeURIComponent(currentPath));
  }

  const profile = await getPublicUserById(authData.user.id);
  if (!profile) {
    redirect(
      `/login?next=${encodeURIComponent(currentPath)}&reason=${encodeURIComponent("missing_profile")}`
    );
  }

  return (
    <>
      <PaidAppHeader />
      {children}
    </>
  );
}
