import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getPublicUserById } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/server";
import { STRIPE_CHECKOUT_SESSION_HEADER } from "@/lib/stripe/middleware-constants";
import { syncCheckoutSessionForUser } from "@/lib/stripe/sync-checkout-session";

export default async function AppProductLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login?next=" + encodeURIComponent("/app"));
  }

  let profile = await getPublicUserById(authData.user.id);
  if (!profile) {
    throw new Error("Missing profile");
  }

  const h = await headers();
  const checkoutSessionId = h.get(STRIPE_CHECKOUT_SESSION_HEADER)?.trim() ?? null;

  if (checkoutSessionId && profile.is_paid !== true) {
    const sync = await syncCheckoutSessionForUser(checkoutSessionId, authData.user.id);
    if (sync.ok) {
      const after = await getPublicUserById(authData.user.id);
      if (after) profile = after;
    }
  }

  if (profile.is_paid !== true) {
    redirect("/pricing");
  }

  return <>{children}</>;
}
