import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Post-payment routes: enter via /app (dap_via_app === 'true') or verified paid session.
 * Aligns with server-side paid checks on APIs.
 */
export default function ViaAppGate({ children }) {
  const location = useLocation();
  const { authChecked, user } = useAuth();

  if (!authChecked) {
    return null;
  }

  let via = false;
  try {
    via = sessionStorage.getItem('dap_via_app') === 'true';
  } catch {
    via = false;
  }

  const paid = user?.is_paid === true;
  if (paid || via) {
    return children;
  }

  return <Navigate to="/app" replace state={{ from: location.pathname }} />;
}
