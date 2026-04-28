import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { DAP_PATHNAME_HEADER } from "@/lib/app/middleware-headers";
import PaidAppHeader from "@/components/app/paid-app-header";

/** Product shell: Supabase session + public.users.is_paid (set only by Stripe webhook). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const h = await headers();
  const currentPath = h.get(DAP_PATHNAME_HEADER) ?? "/";

  if (!user) {
    redirect("/login?next=" + encodeURIComponent(currentPath));
  }

  const email = user.email?.toLowerCase().trim();

  const { data: profile } = await supabase
    .from("users")
    .select("is_paid")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.is_paid) {
    redirect("/pricing");
  }

  return (
    <>
      <PaidAppHeader />
      {children}
    </>
  );
}
