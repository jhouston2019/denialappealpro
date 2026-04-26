"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type AppealCtx = {
  appealData: Record<string, unknown>;
  setAppealData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  mergeAppealData: (patch: Record<string, unknown>) => void;
  clearAppealData: () => void;
  uploadedFile: File | null;
  setUploadedFile: React.Dispatch<React.SetStateAction<File | null>>;
};

const AppealContext = createContext<AppealCtx | null>(null);

/**
 * In-memory only (no sessionStorage) — (app) layout is the paid gate.
 */
export function AppealProvider({ children }: { children: React.ReactNode }) {
  const [appealData, setAppealData] = useState<Record<string, unknown>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const mergeAppealData = useCallback((patch: Record<string, unknown>) => {
    if (!patch || typeof patch !== "object") return;
    setAppealData((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearAppealData = useCallback(() => {
    setAppealData({});
    setUploadedFile(null);
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
    throw new Error("useAppeal must be used within AppealProvider");
  }
  return ctx;
}
