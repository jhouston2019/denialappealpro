import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PAGE_BG_SLATE, TEXT_MUTED_ON_SLATE } from '../theme/appShell';

const box = {
  maxWidth: '400px',
  margin: '48px auto',
  padding: '24px',
  background: '#fff',
  border: '1px solid #ccc',
  fontFamily: 'system-ui, sans-serif',
};

function loginErrorMessage(e2) {
  const d = e2.response?.data;
  const status = e2.response?.status;
  if (typeof d?.error === 'string' && d.error) return d.error;
  if (typeof d?.message === 'string' && d.message) return d.message;
  if (status === 429) return 'Too many login attempts. Wait up to an hour and try again.';
  if (status >= 500) return 'Server error. The API may be down or misconfigured.';
  if (!e2.response) {
    return 'Cannot reach the server. Check your connection. If you are on https://denialappealpro.com, the API should be reachable; otherwise confirm REACT_APP_API_URL and that the backend allows this origin (CORS).';
  }
  return 'Something went wrong';
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/queue';

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate(from, { replace: true });
    } catch (e2) {
      setErr(loginErrorMessage(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', background: PAGE_BG_SLATE, minHeight: 'calc(100vh - 60px)' }}>
      <div style={box}>
        <h1 style={{ margin: '0 0 8px', fontSize: '20px' }}>Denial Queue</h1>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: TEXT_MUTED_ON_SLATE }}>
          {mode === 'login' ? 'Sign in to load your saved claims.' : 'Create an account to persist your queue.'}
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '8px',
              border: mode === 'login' ? '2px solid #333' : '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '8px',
              border: mode === 'register' ? '2px solid #333' : '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Register
          </button>
        </div>
        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '12px', boxSizing: 'border-box' }}
          />
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600 }}>Password (min 8)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: '8px', marginBottom: '12px', boxSizing: 'border-box' }}
          />
          {err && <p style={{ color: '#b00020', fontSize: '13px' }}>{err}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: '#222',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              marginTop: '8px',
            }}
          >
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p style={{ marginTop: '16px', fontSize: '13px' }}>
          <Link to="/start">Single appeal (no account)</Link>
          {' · '}
          <Link to="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
