import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useUser } from './UserContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setUser, clearUser } = useUser();
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [newDenialsBanner, setNewDenialsBanner] = useState(null);
  const [newDenialsDollarValue, setNewDenialsDollarValue] = useState(null);

  const hydrateFromMe = useCallback((data) => {
    setAuthUser(data.user);
    if (typeof data.new_denials_since_visit === 'number') {
      setNewDenialsBanner(data.new_denials_since_visit);
    }
    if (typeof data.new_denials_dollar_value === 'number') {
      setNewDenialsDollarValue(data.new_denials_dollar_value);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/auth/me')
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

  useEffect(() => {
    if (authUser) {
      setUser(authUser.email, String(authUser.id));
    } else {
      clearUser();
    }
  }, [authUser, setUser, clearUser]);

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

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    hydrateFromMe(data);
    return data;
  };

  const register = async (email, password) => {
    const referralCode = (typeof localStorage !== 'undefined' && localStorage.getItem('dap_ref')) || '';
    const { data } = await api.post('/api/auth/register', {
      email,
      password,
      referral_code: referralCode || undefined,
    });
    hydrateFromMe(data);
    return data;
  };

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
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
      await api.post('/api/auth/queue-viewed', {});
    } finally {
      setNewDenialsBanner(0);
      setNewDenialsDollarValue(0);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const { data } = await api.get('/api/auth/me');
    hydrateFromMe(data);
    return data;
  }, [hydrateFromMe]);

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
