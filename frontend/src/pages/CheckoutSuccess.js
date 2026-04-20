import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PAGE_BG_SLATE, TEXT_ON_SLATE } from '../theme/appShell';

const ME_ATTEMPTS = 5;
const VERIFY_ATTEMPTS = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function markViaApp() {
  try {
    sessionStorage.setItem('dap_via_app', 'true');
  } catch {
    /* ignore */
  }
}

/**
 * /success — session cookie → poll /me → poll verify-payment until !pending → /app (no early redirect).
 */
export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { applySession, refreshMe } = useAuth();
  const ran = useRef(false);
  const [stuck, setStuck] = useState(false);
  const [working, setWorking] = useState(true);

  const runVerifyPoll = useCallback(async () => {
    for (let i = 0; i < VERIFY_ATTEMPTS; i++) {
      try {
        const v = await api.get('/api/verify-payment');
        if (v.data?.success && !v.data?.pending) {
          try {
            await refreshMe();
          } catch {
            /* non-fatal */
          }
          markViaApp();
          navigate('/app', { replace: true });
          return true;
        }
      } catch {
        /* retry */
      }
      await sleep(500);
    }
    return false;
  }, [navigate, refreshMe]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        navigate('/pricing', { replace: true });
        return;
      }

      try {
        const { data } = await api.post('/api/auth/create-session-from-stripe', { session_id: sessionId });
        if (!data?.success || !data?.user) {
          navigate('/pricing', { replace: true });
          return;
        }
        applySession({ user: data.user });

        let meOk = false;
        for (let i = 0; i < ME_ATTEMPTS; i++) {
          try {
            const me = await api.get('/api/auth/me');
            if (me.data?.user?.id) {
              applySession({ user: me.data.user });
              meOk = true;
              break;
            }
          } catch {
            /* retry */
          }
          await sleep(400);
        }
        if (!meOk) {
          navigate('/pricing', { replace: true });
          return;
        }

        const verified = await runVerifyPoll();
        if (verified) {
          setWorking(false);
        } else {
          setStuck(true);
          setWorking(false);
        }
      } catch {
        navigate('/pricing', { replace: true });
      }
    })();
  }, [applySession, navigate, runVerifyPoll, searchParams]);

  useEffect(() => {
    if (!stuck) return undefined;
    const id = setInterval(() => {
      void (async () => {
        const ok = await runVerifyPoll();
        if (ok) {
          setStuck(false);
        }
      })();
    }, 2500);
    return () => clearInterval(id);
  }, [stuck, runVerifyPoll]);

  const onRetry = async () => {
    setWorking(true);
    const ok = await runVerifyPoll();
    setWorking(false);
    if (!ok) {
      setStuck(true);
    }
  };

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
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        {working && (
          <div
            style={{
              display: 'inline-block',
              width: 44,
              height: 44,
              border: '4px solid rgba(148, 163, 184, 0.35)',
              borderTop: '4px solid #22c55e',
              borderRadius: '50%',
              animation: 'dapSpin 0.9s linear infinite',
              marginBottom: 20,
            }}
          />
        )}
        <style>{`
          @keyframes dapSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ fontSize: 18, margin: 0 }}>
          {stuck ? 'Processing payment…' : 'Activating your account…'}
        </p>
        <p style={{ fontSize: 14, opacity: 0.85, marginTop: 14, lineHeight: 1.5 }}>
          {stuck
            ? 'Payment is still processing. This usually resolves within a few seconds.'
            : 'Please wait while we confirm your subscription.'}
        </p>
        {stuck && (
          <button
            type="button"
            onClick={onRetry}
            disabled={working}
            style={{
              marginTop: 22,
              padding: '10px 22px',
              fontSize: 15,
              fontWeight: 600,
              color: '#0f172a',
              background: working ? '#94a3b8' : '#22c55e',
              border: 'none',
              borderRadius: 8,
              cursor: working ? 'not-allowed' : 'pointer',
            }}
          >
            {working ? 'Checking…' : 'Retry verification'}
          </button>
        )}
      </div>
    </div>
  );
}
