import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getPublicUserById } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/server";
import { STRIPE_CHECKOUT_SESSION_HEADER } from "@/lib/stripe/middleware-constants";
import { syncCheckoutSessionForUser } from "@/lib/stripe/sync-checkout-session";
import PaidAppHeader from "@/components/app/paid-app-header";

/**
 * Shell: require auth + profile. `is_paid` unless a Stripe return header triggers one-time sync
 * (see `middleware.ts` for `/app?session_id=`).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  let row = await getPublicUserById(authData.user.id);
  if (!row) {
    redirect("/login");
  }

  const h = await headers();
  const checkoutSessionId = h.get(STRIPE_CHECKOUT_SESSION_HEADER)?.trim() ?? null;
  if (checkoutSessionId && row.is_paid !== true) {
    const sync = await syncCheckoutSessionForUser(checkoutSessionId, authData.user.id);
    if (sync.ok) {
      const after = await getPublicUserById(authData.user.id);
      if (after) {
        row = after;
      }
    }
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
