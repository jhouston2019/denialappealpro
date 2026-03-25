import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const box = {
  maxWidth: '400px',
  margin: '48px auto',
  padding: '24px',
  background: '#fff',
  border: '1px solid #ccc',
  fontFamily: 'system-ui, sans-serif',
};

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
      setErr(e2.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '70vh' }}>
      <div style={box}>
        <h1 style={{ margin: '0 0 8px', fontSize: '20px' }}>Denial Queue</h1>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#444' }}>
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
          <Link to="/appeal-form">Single appeal (no account)</Link>
          {' · '}
          <Link to="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
