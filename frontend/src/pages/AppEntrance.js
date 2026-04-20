import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PAGE_BG_SLATE, TEXT_ON_SLATE } from '../theme/appShell';

/** /app — route users by auth + payment + data */
export default function AppEntrance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authChecked, isAuthenticated } = useAuth();
  const [msg, setMsg] = useState('Loading…');
  const ran = useRef(false);

  useEffect(() => {
    if (!authChecked) return;
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true, state: { from: '/app' } });
        return;
      }

      try {
        const { data } = await api.get('/api/auth/me');
        const u = data.user;
        if (u?.is_paid === false) {
          navigate('/pricing', { replace: true });
          return;
        }
        try {
          sessionStorage.setItem('dap_via_app', 'true');
        } catch {
          /* ignore */
        }
        const dest = (searchParams.get('dest') || '').toLowerCase();
        if (dest === 'queue') {
          navigate('/queue', { replace: true });
        } else if (dest === 'dashboard') {
          navigate('/dashboard', { replace: true });
        } else if (dest === 'upload' || dest === 'start') {
          navigate('/upload', { replace: true });
        } else if (u?.has_data) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/upload', { replace: true });
        }
      } catch {
        setMsg('Could not load account.');
        navigate('/login', { replace: true });
      }
    })();
  }, [authChecked, isAuthenticated, navigate, searchParams]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAGE_BG_SLATE,
        color: TEXT_ON_SLATE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p style={{ fontSize: 16 }}>{msg}</p>
    </div>
  );
}
