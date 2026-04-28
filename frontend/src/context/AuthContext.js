import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import { getNewDenialsSinceVisit } from '../utils/denialsSinceVisit';
import { useUser } from './UserContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setUser, clearUser } = useUser();
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [newDenialsBanner, setNewDenialsBanner] = useState(null);
  const [newDenialsDollarValue, setNewDenialsDollarValue] = useState(null);

  const refreshFromUserId = useCallback(async (userId) => {
    const supabase = getSupabaseBrowserClient();
    const { data: row, error } = await supabase
      .from('users')
      .select('id, email, last_queue_visit_at')
      .eq('id', userId)
      .maybeSingle();
    if (error || !row) {
      setAuthUser(null);
      setNewDenialsBanner(null);
      setNewDenialsDollarValue(null);
      return;
    }
    const { data: hasAppeal } = await supabase
      .from('appeals')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    const hasData = hasAppeal != null;
    const lastV = row.last_queue_visit_at;
    const d = await getNewDenialsSinceVisit(supabase, userId, lastV);
    setAuthUser({
      id: row.id,
      email: row.email,
      has_data: hasData,
    });
    setNewDenialsBanner(d.count);
    setNewDenialsDollarValue(d.dollarValue);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription;
    try {
      const supabase = getSupabaseBrowserClient();
      const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setAuthUser(null);
          setNewDenialsBanner(null);
          setNewDenialsDollarValue(null);
          setAuthChecked(true);
          return;
        }
        await refreshFromUserId(session.user.id);
        if (!cancelled) setAuthChecked(true);
      };
      void init();
      const sub = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (cancelled) return;
        if (!session?.user) {
          setAuthUser(null);
          setNewDenialsBanner(null);
          setNewDenialsDollarValue(null);
          setAuthChecked(true);
          return;
        }
        await refreshFromUserId(session.user.id);
        setAuthChecked(true);
      });
      subscription = sub.data.subscription;
    } catch {
      if (!cancelled) {
        setAuthUser(null);
        setAuthChecked(true);
      }
    }
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [refreshFromUserId]);

  useEffect(() => {
    if (authUser) {
      setUser(authUser.email, String(authUser.id));
    } else {
      clearUser();
    }
  }, [authUser, setUser, clearUser]);

  const login = async (email, password) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await refreshFromUserId(session.user.id);
  };

  const register = async (email, password) => {
    const supabase = getSupabaseBrowserClient();
    const referralCode = (typeof localStorage !== 'undefined' && localStorage.getItem('dap_ref')) || '';
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: referralCode ? { referral_code: referralCode } : {},
      },
    });
    if (error) throw error;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await refreshFromUserId(session.user.id);
  };

  const logout = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      /* still clear client */
    }
    setAuthUser(null);
    setNewDenialsBanner(null);
    setNewDenialsDollarValue(null);
    clearUser();
    try {
      sessionStorage.removeItem('dap_via_app');
    } catch {
      /* ignore */
    }
  }, [clearUser]);

  const markQueueViewed = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) return;
      await supabase
        .from('users')
        .update({ last_queue_visit_at: new Date().toISOString() })
        .eq('id', u.id);
    } finally {
      setNewDenialsBanner(0);
      setNewDenialsDollarValue(0);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await refreshFromUserId(session.user.id);
  }, [refreshFromUserId]);

  const applySession = useCallback(
    (payload) => {
      if (payload?.user) setAuthUser(payload.user);
      if (typeof payload?.new_denials_since_visit === 'number') {
        setNewDenialsBanner(payload.new_denials_since_visit);
      }
      if (typeof payload?.new_denials_dollar_value === 'number') {
        setNewDenialsDollarValue(payload.new_denials_dollar_value);
      }
    },
    []
  );

  const value = {
    authChecked,
    isAuthenticated: Boolean(authUser),
    user: authUser,
    newDenialsBanner,
    newDenialsDollarValue,
    setNewDenialsBanner,
    login,
    register,
    logout,
    markQueueViewed,
    refreshMe,
    applySession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
