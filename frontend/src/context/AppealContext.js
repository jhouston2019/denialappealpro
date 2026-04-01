import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'dap_appeal_data';

const AppealContext = createContext(null);

export function AppealProvider({ children }) {
  const [appealData, setAppealData] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {
      /* ignore */
    }
    return {};
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(appealData));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }, [appealData]);

  const mergeAppealData = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return;
    setAppealData((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearAppealData = useCallback(() => {
    setAppealData({});
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
  }, []);

  const applyExtraction = useCallback(
    (mapped) => {
      mergeAppealData(mapped);
    },
    [mergeAppealData]
  );

  const value = useMemo(
    () => ({
      appealData,
      setAppealData,
      mergeAppealData,
      clearAppealData,
      applyExtraction,
    }),
    [appealData, mergeAppealData, clearAppealData, applyExtraction]
  );

  return <AppealContext.Provider value={value}>{children}</AppealContext.Provider>;
}

export function useAppeal() {
  const ctx = useContext(AppealContext);
  if (!ctx) {
    throw new Error('useAppeal must be used within AppealProvider');
  }
  return ctx;
}
