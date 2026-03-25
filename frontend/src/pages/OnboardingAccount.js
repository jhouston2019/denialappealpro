import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function OnboardingAccount() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const sessionId = sp.get('session_id');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setErr('Missing session');
      setLoading(false);
      return;
    }
    api
      .post('/api/onboarding/verify-session', { session_id: sessionId })
      .then(({ data }) => {
        setSessionInfo(data);
        if (data.customer_email) setEmail(data.customer_email);
      })
      .catch(() => setErr('Invalid session'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (sessionInfo?.mode === 'subscription') {
        const { data } = await api.post('/api/onboarding/complete-subscription', {
          session_id: sessionId,
          password,
        });
        applySession({ token: data.token, user: data.user });
        navigate('/dashboard', { replace: true });
      } else {
        const { data } = await api.post('/api/onboarding/finalize', {
          session_id: sessionId,
          email: email.trim(),
          password,
        });
        applySession({ token: data.token, user: data.user });
        navigate('/dashboard', { replace: true });
      }
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Could not complete signup');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div style={{ padding: 24 }}>
        <p>No checkout session.</p>
        <Link to="/start">Start over</Link>
      </div>
    );
  }

  if (loading && !sessionInfo) {
    return <div style={{ padding: 24 }}>Confirming payment…</div>;
  }

  const subMode = sessionInfo?.mode === 'subscription';

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22 }}>Create your account</h1>
      <p style={{ color: '#444', fontSize: 14 }}>
        {subMode ? 'Choose a password to access your dashboard and denial queue.' : 'Enter your email and password to finish.'}
      </p>
      <form onSubmit={submit}>
        {!subMode && (
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 8 }}
            />
          </label>
        )}
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Password (min 8 characters)</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 8 }}
          />
        </label>
        {err && <p style={{ color: '#b00020', fontSize: 14 }}>{err}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? '…' : 'Go to dashboard'}
        </button>
      </form>
    </div>
  );
}
