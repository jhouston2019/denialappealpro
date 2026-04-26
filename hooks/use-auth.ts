"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api-client";

type AuthUser = {
  id?: string;
  email?: string;
  is_paid?: boolean | null;
  has_data?: boolean;
  payment_verification_status?: string | null;
} | null;

/**
 * Replaces CRA AuthContext for the appeal wizard: session via /api/auth/me (cookies).
 */
export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [newDenialsBanner, setNewDenialsBanner] = useState<number | null>(null);
  const [newDenialsDollarValue, setNewDenialsDollarValue] = useState<number | null>(null);

  const hydrateFromMe = useCallback((data: { user: AuthUser; new_denials_since_visit?: number; new_denials_dollar_value?: number }) => {
    setAuthUser(data.user ?? null);
    if (typeof data.new_denials_since_visit === "number") {
      setNewDenialsBanner(data.new_denials_since_visit);
    }
    if (typeof data.new_denials_dollar_value === "number") {
      setNewDenialsDollarValue(data.new_denials_dollar_value);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{
        user: AuthUser;
        new_denials_since_visit?: number;
        new_denials_dollar_value?: number;
      }>("/api/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        hydrateFromMe(data);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthUser(null);
        setNewDenialsBanner(null);
        setNewDenialsDollarValue(null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrateFromMe]);

  const markQueueViewed = useCallback(async () => {
    try {
      await api.post("/api/auth/queue-viewed", {});
    } finally {
      setNewDenialsBanner(0);
      setNewDenialsDollarValue(0);
    }
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
