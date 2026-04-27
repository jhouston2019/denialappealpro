"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { getNewDenialsSinceVisit } from "@/lib/auth/denials-since-visit";

type AuthUser = {
  id?: string;
  email?: string;
  is_paid?: boolean | null;
  has_data?: boolean;
  payment_verification_status?: string | null;
} | null;

/**
 * Supabase client session + public.users / appeals (RLS). No /api/auth/*.
 */
export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [newDenialsBanner, setNewDenialsBanner] = useState<number | null>(null);
  const [newDenialsDollarValue, setNewDenialsDollarValue] = useState<number | null>(null);

  const refreshFromSession = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data: row, error } = await supabase
      .from("users")
      .select("id, email, is_paid, payment_verification_status, last_queue_visit_at")
      .eq("id", userId)
      .maybeSingle();
    if (error || !row) {
      setAuthUser(null);
      setNewDenialsBanner(null);
      setNewDenialsDollarValue(null);
      return;
    }
    const { data: hasAppeal } = await supabase
      .from("appeals")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const hasData = hasAppeal != null;
    const lastV = (row as { last_queue_visit_at: string | null }).last_queue_visit_at;
    const d = await getNewDenialsSinceVisit(supabase, userId, lastV);
    setAuthUser({
      id: row.id as string,
      email: row.email as string,
      is_paid: row.is_paid,
      has_data: hasData,
      payment_verification_status: (row as { payment_verification_status?: string | null })
        .payment_verification_status,
    });
    setNewDenialsBanner(d.count);
    setNewDenialsDollarValue(d.dollarValue);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const u = sessionData.session?.user;
      if (!u) {
        if (!cancelled) {
          setAuthUser(null);
          setNewDenialsBanner(null);
          setNewDenialsDollarValue(null);
          setAuthChecked(true);
        }
        return;
      }
      await refreshFromSession(u.id);
      if (!cancelled) setAuthChecked(true);
    };
    void run();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (cancelled) return;
      if (!session?.user) {
        setAuthUser(null);
        setNewDenialsBanner(null);
        setNewDenialsDollarValue(null);
        setAuthChecked(true);
        return;
      }
      await refreshFromSession(session.user.id);
      setAuthChecked(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refreshFromSession]);

  const markQueueViewed = useCallback(async () => {
    const supabase = createClient();
    const { data: s } = await supabase.auth.getSession();
    const u = s.session?.user;
    if (!u) return;
    const { error } = await supabase
      .from("users")
      .update({ last_queue_visit_at: new Date().toISOString() })
      .eq("id", u.id);
    if (error) {
      console.error("[useAuth] markQueueViewed", error);
    }
    setNewDenialsBanner(0);
    setNewDenialsDollarValue(0);
  }, []);

  const isPaid = Boolean(authUser?.is_paid === true);

  return {
    authChecked,
    isAuthenticated: Boolean(authUser),
    isPaid,
    user: authUser,
    newDenialsBanner,
    newDenialsDollarValue,
    setNewDenialsBanner,
    markQueueViewed,
  };
}
