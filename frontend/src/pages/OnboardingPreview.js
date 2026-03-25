import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api from '../api/axios';

const stripePk = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePk && !stripePk.includes('your_') ? loadStripe(stripePk) : null;

export default function OnboardingPreview() {
  const { appealId } = useParams();
  const [data, setData] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get(`/api/onboarding/appeal/${appealId}`)
      .then(({ data: d }) => setData(d))
      .catch(() => setErr('Could not load preview'))
      .finally(() => setLoading(false));
  }, [appealId]);

  const startRetail = async () => {
    if (!stripePromise) {
      setErr('Stripe is not configured');
      return;
    }
    setPayLoading(true);
    setErr('');
    try {
      const { data: res } = await api.post('/api/onboarding/checkout-retail', { appeal_id: appealId });
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: res.session_id });
      if (error) setErr(error.message);
    } catch (e) {
      setErr(e.response?.data?.error || 'Checkout failed');
    } finally {
      setPayLoading(false);
    }
  };

  const startPlan = async (plan) => {
    if (!email.includes('@')) {
      setErr('Enter your work email for the subscription plan');
      return;
    }
    if (!stripePromise) {
      setErr('Stripe is not configured');
      return;
    }
    setPayLoading(true);
    setErr('');
    try {
      const { data: res } = await api.post('/api/onboarding/checkout-plan', {
        appeal_id: appealId,
        plan,
        email: email.trim(),
      });
      const stripe = await stripePromise;
      const url = res.url;
      if (url) {
        window.location.href = url;
        return;
      }
      const { error } = await stripe.redirectToCheckout({ sessionId: res.session_id });
      if (error) setErr(error.message);
    } catch (e) {
      setErr(e.response?.data?.error || 'Checkout failed');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err && !data) return <div style={{ padding: 24 }}>{err}</div>;
  if (!data) return null;

  const excerpt = data.preview_excerpt || '';
  const blur = (
    <div
      style={{
        position: 'relative',
        marginTop: 12,
        minHeight: 120,
        border: '1px solid #ddd',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#fafafa',
      }}
    >
      <div style={{ padding: 12, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{excerpt}</div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '70%',
          background: 'linear-gradient(transparent, rgba(255,255,255,0.92) 30%, #fff)',
          backdropFilter: 'blur(6px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: '#333',
        }}
      >
        Unlock full appeal letter
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <Link to="/start">← Edit details</Link>
      <h1 style={{ fontSize: 22, marginTop: 16 }}>Your appeal preview</h1>
      <p style={{ fontSize: 17, fontWeight: 600, color: '#0a0' }}>{data.revenue_message}</p>
      <h2 style={{ fontSize: 15, marginTop: 24 }}>Structured appeal (excerpt)</h2>
      {blur}
      {err && <p style={{ color: '#b00020', marginTop: 12 }}>{err}</p>}

      <h2 style={{ fontSize: 15, marginTop: 32 }}>Choose a plan</h2>
      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <button
          type="button"
          disabled={payLoading}
          onClick={startRetail}
          style={{
            padding: 14,
            textAlign: 'left',
            border: '1px solid #333',
            borderRadius: 6,
            background: '#fff',
            cursor: payLoading ? 'wait' : 'pointer',
          }}
        >
          <strong>$79</strong> — single appeal
          <div style={{ fontSize: 13, color: '#555' }}>Pay once, unlock PDF + account</div>
        </button>

        <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 12 }}>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Email (for subscription checkout)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@practice.com"
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 8 }}
            />
          </label>
          <button
            type="button"
            disabled={payLoading}
            onClick={() => startPlan('starter')}
            style={{
              width: '100%',
              padding: 12,
              marginBottom: 8,
              textAlign: 'left',
              border: '1px solid #ccc',
              borderRadius: 6,
              background: '#fff',
              cursor: payLoading ? 'wait' : 'pointer',
            }}
          >
            <strong>$199/mo</strong> — 15 appeals
          </button>
          <button
            type="button"
            disabled={payLoading}
            onClick={() => startPlan('core')}
            style={{
              width: '100%',
              padding: 12,
              textAlign: 'left',
              border: '2px solid #2563eb',
              borderRadius: 6,
              background: '#eff6ff',
              cursor: payLoading ? 'wait' : 'pointer',
            }}
          >
            <strong>$399/mo</strong> — best value · 40 appeals
          </button>
        </div>
      </div>
    </div>
  );
}
