import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const AppealContext = createContext(null);

export function AppealProvider({ children }) {
  const [appealData, setAppealData] = useState({});
  const [uploadedFile, setUploadedFile] = useState(null);
  const skipFirstPersist = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('dap_appeal_data');
    if (saved) {
      try {
        setAppealData(JSON.parse(saved));
      } catch (_) {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!skipFirstPersist.current) {
      skipFirstPersist.current = true;
      return;
    }
    try {
      sessionStorage.setItem('dap_appeal_data', JSON.stringify(appealData));
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
    setUploadedFile(null);
    try {
      sessionStorage.removeItem('dap_appeal_data');
    } catch (_) {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      appealData,
      setAppealData,
      mergeAppealData,
      clearAppealData,
      uploadedFile,
      setUploadedFile,
    }),
    [appealData, mergeAppealData, clearAppealData, uploadedFile]
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
