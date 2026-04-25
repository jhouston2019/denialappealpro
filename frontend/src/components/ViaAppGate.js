import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Post-payment deep routes: require verified paid session (is_paid === true).
 * sessionStorage dap_via_app is for UI flow only, not access control.
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
  if (!paid) {
    return <Navigate to="/app" replace state={{ from: location.pathname }} />;
  }

  return children;
}
