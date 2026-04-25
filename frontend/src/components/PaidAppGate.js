import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PAGE_BG_SLATE, TEXT_ON_SLATE } from '../theme/appShell';

/**
 * Allow unauthenticated → /login after session hydrate.
 * Paid app requires is_paid === true (new unpaid users and explicit false go to /pricing).
 */
export default function PaidAppGate({ children }) {
  const { authChecked, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: PAGE_BG_SLATE,
          color: TEXT_ON_SLATE,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!user || user.is_paid !== true) {
    return <Navigate to="/pricing" replace />;
  }
  return children;
}
