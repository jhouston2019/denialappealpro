"use client";

import { useCallback, useEffect, useState } from "react";
import { getNewDenialsSinceVisit } from "@/lib/auth/denials-since-visit";
import { normalizeUserEmail } from "@/lib/auth/user-payload";
import { createClient } from "@/lib/supabase/browser";

type AuthUser = {
  id?: string;
  email?: string;
  has_data?: boolean;
} | null;

/**
 * Supabase client session + public.users / appeals (RLS).
 */
export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [newDenialsBanner, setNewDenialsBanner] = useState<number | null>(null);
  const [newDenialsDollarValue, setNewDenialsDollarValue] = useState<number | null>(null);

  const refreshFromSession = useCallback(async (authUserId: string, emailRaw: string | null | undefined) => {
    const supabase = createClient();
    const email = normalizeUserEmail(emailRaw);
    if (!email) {
      setAuthUser(null);
      setNewDenialsBanner(null);
      setNewDenialsDollarValue(null);
      return;
    }
    const { data: row, error } = await supabase
      .from("users")
      .select("id, email, last_queue_visit_at")
      .eq("email", email)
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
      .eq("user_id", authUserId)
      .limit(1)
      .maybeSingle();
    const hasData = hasAppeal != null;
    const lastV = (row as { last_queue_visit_at: string | null }).last_queue_visit_at;
    const d = await getNewDenialsSinceVisit(supabase, authUserId, lastV);
    setAuthUser({
      id: row.id as string,
      email: row.email as string,
      has_data: hasData,
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
      await refreshFromSession(u.id, u.email);
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
      await refreshFromSession(session.user.id, session.user.email);
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
    const email = normalizeUserEmail(u.email);
    if (!email) return;
    const { error } = await supabase
      .from("users")
      .update({ last_queue_visit_at: new Date().toISOString() })
      .eq("email", email);
    if (error) {
      console.error("[useAuth] markQueueViewed", error);
    }
    setNewDenialsBanner(0);
    setNewDenialsDollarValue(0);
  }, []);

  return {
    authChecked,
    isAuthenticated: Boolean(authUser),
    user: authUser,
    newDenialsBanner,
    newDenialsDollarValue,
    setNewDenialsBanner,
    markQueueViewed,
  };
}
