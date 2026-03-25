import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useUser } from './UserContext';

const AuthContext = createContext(null);

const TOKEN_KEY = 'customerToken';

export function AuthProvider({ children }) {
  const { setUser, clearUser } = useUser();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem('customerUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [newDenialsBanner, setNewDenialsBanner] = useState(null);
  const [newDenialsDollarValue, setNewDenialsDollarValue] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (!token || authUser) return;
    api
      .get('/api/auth/me')
      .then(({ data }) => {
        setAuthUser(data.user);
        if (typeof data.new_denials_since_visit === 'number') {
          setNewDenialsBanner(data.new_denials_since_visit);
        }
        if (typeof data.new_denials_dollar_value === 'number') {
          setNewDenialsDollarValue(data.new_denials_dollar_value);
        }
      })
      .catch(() => {
        setToken(null);
        setAuthUser(null);
      });
  }, [token, authUser]);

  useEffect(() => {
    if (authUser) {
      localStorage.setItem('customerUser', JSON.stringify(authUser));
      setUser(authUser.email, String(authUser.id));
    } else {
      localStorage.removeItem('customerUser');
    }
  }, [authUser, setUser]);

  const applySession = useCallback((payload) => {
    setToken(payload.token);
    setAuthUser(payload.user);
    if (typeof payload.new_denials_since_visit === 'number') {
      setNewDenialsBanner(payload.new_denials_since_visit);
    }
    if (typeof payload.new_denials_dollar_value === 'number') {
      setNewDenialsDollarValue(payload.new_denials_dollar_value);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    applySession(data);
    return data;
  };

  const register = async (email, password) => {
    const referralCode = (typeof localStorage !== 'undefined' && localStorage.getItem('dap_ref')) || '';
    const { data } = await api.post('/api/auth/register', {
      email,
      password,
      referral_code: referralCode || undefined,
    });
    applySession(data);
    return data;
  };

  const logout = useCallback(() => {
    setToken(null);
    setAuthUser(null);
    setNewDenialsBanner(null);
    setNewDenialsDollarValue(null);
    clearUser();
  }, [clearUser]);

  const markQueueViewed = useCallback(async () => {
    if (!token) return;
    try {
      await api.post('/api/auth/queue-viewed', {});
    } finally {
      setNewDenialsBanner(0);
      setNewDenialsDollarValue(0);
    }
  }, [token]);

  const refreshMe = useCallback(async () => {
    if (!token) return null;
    const { data } = await api.get('/api/auth/me');
    if (typeof data.new_denials_since_visit === 'number') {
      setNewDenialsBanner(data.new_denials_since_visit);
    }
    if (typeof data.new_denials_dollar_value === 'number') {
      setNewDenialsDollarValue(data.new_denials_dollar_value);
    }
    return data;
  }, [token]);

  const value = {
    token,
    isAuthenticated: Boolean(token),
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
