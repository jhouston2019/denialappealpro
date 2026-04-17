import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api from '../api/axios';

const stripePk = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePk && !stripePk.includes('your_') ? loadStripe(stripePk) : null;

const TESTING_PAYWALL_DISABLED = true; // TESTING: paywall disabled

const pageBg = '#f8fafc';
const navy = '#0f172a';
const cardBg = '#ffffff';
const primaryGreen = '#22c55e';
const primaryGreenHover = '#16a34a';
const disclaimerBg = '#fef9c3';
const disclaimerBorder = '#fde047';
const border = '#e2e8f0';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function OnboardingPreview() {
  const { appealId } = useParams();
  const [data, setData] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [err, setErr] = useState('');
  const [copyBusy, setCopyBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [docxBusy, setDocxBusy] = useState(false);
  const [fullLetter, setFullLetter] = useState(null);

  useEffect(() => {
    api
      .get(`/api/onboarding/appeal/${appealId}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => {
        console.error('Preview error:', err.response?.data || err);
        setErr('Could not load preview');
      })
      .finally(() => setLoading(false));
  }, [appealId]);

  useEffect(() => {
    if (!appealId || !data) return;
    if (!TESTING_PAYWALL_DISABLED && !data.account_linked) return;
    api
      .get(`/api/onboarding/appeal/${appealId}/full-text`)
      .then(({ data: d }) => setFullLetter(d.full_text || ''))
      .catch(() => {});
  }, [appealId, data]);

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

  const resolveLetterText = async () => {
    let t = fullLetter;
    if (t == null) {
      const { data: d } = await api.get(`/api/onboarding/appeal/${appealId}/full-text`);
      t = d.full_text || '';
      setFullLetter(t);
    }
    return (t || '').replace(/\r\n/g, '\n').trim();
  };

  const copyAppeal = async () => {
    setCopyBusy(true);
    setErr('');
    try {
      const t = await resolveLetterText();
      await navigator.clipboard.writeText(t);
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not copy appeal');
    } finally {
      setCopyBusy(false);
    }
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    setErr('');
    try {
      const res = await api.get(`/api/onboarding/appeal/${appealId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appeal_${appealId.replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not download PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const downloadDocx = async () => {
    setDocxBusy(true);
    setErr('');
    try {
      const text = await resolveLetterText();
      const safe = escapeHtml(text).replace(/\n/g, '<br/>');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;white-space:pre-wrap">${safe}</div></body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appeal_${appealId.replace(/[^a-z0-9_-]/gi, '_')}.doc`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not download document');
    } finally {
      setDocxBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, background: pageBg, minHeight: '50vh', fontFamily: '"Inter", system-ui, sans-serif', color: '#64748b' }}>
        Loading…
      </div>
    );
  }
  if (err && !data) {
    return (
      <div style={{ padding: 48, background: pageBg, minHeight: '50vh', fontFamily: '"Inter", system-ui, sans-serif', color: '#c2410c' }}>
        {err}
      </div>
    );
  }
  if (!data) return null;

  const excerpt = data.preview_excerpt || '';
  const blur = (
    <div
      style={{
        position: 'relative',
        marginTop: 12,
        minHeight: 120,
        border: `1px solid ${border}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#f1f5f9',
      }}
    >
      <div style={{ padding: 20, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: '#334155' }}>{excerpt}</div>
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
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: navy,
        }}
      >
        Unlock full appeal letter
      </div>
    </div>
  );
  const unlockedForDisplay = TESTING_PAYWALL_DISABLED || data.account_linked;
  const letterBody = fullLetter != null ? fullLetter : excerpt;
  const letterBlock = unlockedForDisplay ? (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 12,
        background: cardBg,
        padding: '28px 32px',
        fontSize: 15,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        color: '#1e293b',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
      }}
    >
      {letterBody}
    </div>
  ) : (
    blur
  );

  const disclaimerCopy = (
    <>
      <p style={{ color: '#854d0e', lineHeight: 1.6, marginBottom: 10, fontWeight: 700 }}>This is a template letter that requires your professional review.</p>
      <p style={{ color: '#854d0e', lineHeight: 1.6, marginBottom: 10 }}>You must:</p>
      <ul style={{ color: '#854d0e', lineHeight: 1.6, paddingLeft: 20, marginBottom: 10 }}>
        <li>Review the entire letter for accuracy</li>
        <li>Modify arguments as needed for your specific case</li>
        <li>Add or remove sections based on your clinical documentation</li>
        <li>Verify all patient and claim information</li>
        <li>Ensure medical appropriateness before submission</li>
      </ul>
      <p style={{ color: '#854d0e', lineHeight: 1.6, fontSize: 14, marginBottom: 0 }}>
        <strong>This is not medical or legal advice.</strong> You are solely responsible for the content of any appeal submitted to insurance companies.
      </p>
    </>
  );

  const btnPrimary = {
    padding: '12px 20px',
    fontWeight: 700,
    fontSize: 14,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: primaryGreen,
    color: '#fff',
    transition: 'background 0.15s ease',
  };

  const btnMuted = {
    padding: '12px 20px',
    fontWeight: 600,
    fontSize: 14,
    borderRadius: 8,
    border: `2px solid ${border}`,
    cursor: 'pointer',
    background: cardBg,
    color: '#475569',
    transition: 'border-color 0.15s ease, background 0.15s ease',
  };

  return (
    <div
      style={{
        background: pageBg,
        minHeight: 'calc(100vh - 60px)',
        fontFamily: '"Inter", system-ui, sans-serif',
        padding: '24px 20px 56px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link to="/start" style={{ color: navy, fontWeight: 600, textDecoration: 'none', fontSize: 15 }}>
          ← Edit details
        </Link>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', marginTop: 20, marginBottom: 8, color: navy, fontWeight: 800 }}>
          Your appeal preview
        </h1>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#15803d', marginBottom: 24 }}>{data.revenue_message}</p>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: navy, marginBottom: 12 }}>
          {TESTING_PAYWALL_DISABLED || data.account_linked ? 'Structured appeal (full)' : 'Structured appeal (excerpt)'}
        </h2>
        {letterBlock}

        <div
          style={{
            marginTop: 20,
            padding: '18px 20px',
            background: disclaimerBg,
            border: `1px solid ${disclaimerBorder}`,
            borderRadius: 12,
          }}
        >
          {disclaimerCopy}
        </div>

        {TESTING_PAYWALL_DISABLED || data.account_linked ? (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                disabled={copyBusy}
                onClick={copyAppeal}
                style={{ ...btnPrimary, cursor: copyBusy ? 'wait' : 'pointer', opacity: copyBusy ? 0.85 : 1 }}
                onMouseEnter={(e) => {
                  if (!copyBusy) e.currentTarget.style.background = primaryGreenHover;
                }}
                onMouseLeave={(e) => {
                  if (!copyBusy) e.currentTarget.style.background = primaryGreen;
                }}
              >
                {copyBusy ? 'Copying…' : 'Copy letter'}
              </button>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={downloadPdf}
                style={{ ...btnPrimary, cursor: pdfBusy ? 'wait' : 'pointer', opacity: pdfBusy ? 0.85 : 1 }}
                onMouseEnter={(e) => {
                  if (!pdfBusy) e.currentTarget.style.background = primaryGreenHover;
                }}
                onMouseLeave={(e) => {
                  if (!pdfBusy) e.currentTarget.style.background = primaryGreen;
                }}
              >
                {pdfBusy ? 'Preparing…' : 'Download PDF'}
              </button>
              <button
                type="button"
                disabled={docxBusy}
                onClick={downloadDocx}
                style={{ ...btnPrimary, cursor: docxBusy ? 'wait' : 'pointer', opacity: docxBusy ? 0.85 : 1 }}
                onMouseEnter={(e) => {
                  if (!docxBusy) e.currentTarget.style.background = primaryGreenHover;
                }}
                onMouseLeave={(e) => {
                  if (!docxBusy) e.currentTarget.style.background = primaryGreen;
                }}
              >
                {docxBusy ? 'Preparing…' : 'Download DOCX'}
              </button>
              <Link
                to="/start"
                style={{
                  ...btnMuted,
                  display: 'inline-block',
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              >
                Start over
              </Link>
            </div>
          </div>
        ) : null}

        {err && <p style={{ color: '#c2410c', marginTop: 16, fontWeight: 600 }}>{err}</p>}

        <div
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: `2px solid ${border}`,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 800, color: navy, marginBottom: 6 }}>Choose a plan</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Unlock downloads and ongoing appeals with a one-time purchase or subscription.</p>
          <div style={{ display: 'grid', gap: 14 }}>
            <button
              type="button"
              disabled={payLoading}
              onClick={startRetail}
              style={{
                padding: 16,
                textAlign: 'left',
                border: `1px solid ${border}`,
                borderRadius: 10,
                background: cardBg,
                cursor: payLoading ? 'wait' : 'pointer',
                boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
              }}
            >
              <strong style={{ color: navy }}>$79</strong> — single appeal
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Pay once, unlock PDF + account</div>
            </button>

            <div style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 16, background: cardBg }}>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 10, fontWeight: 600, color: '#334155' }}>
                Email (for subscription checkout)
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@practice.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${border}`,
                    fontSize: 15,
                  }}
                />
              </label>
              <button
                type="button"
                disabled={payLoading}
                onClick={() => startPlan('starter')}
                style={{
                  width: '100%',
                  padding: 14,
                  marginBottom: 10,
                  textAlign: 'left',
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  background: cardBg,
                  cursor: payLoading ? 'wait' : 'pointer',
                }}
              >
                <strong style={{ color: navy }}>$199/mo</strong> — 15 appeals
              </button>
              <button
                type="button"
                disabled={payLoading}
                onClick={() => startPlan('core')}
                style={{
                  width: '100%',
                  padding: 14,
                  textAlign: 'left',
                  border: `2px solid ${primaryGreen}`,
                  borderRadius: 8,
                  background: '#f0fdf4',
                  cursor: payLoading ? 'wait' : 'pointer',
                }}
              >
                <strong style={{ color: navy }}>$399/mo</strong> — best value · 40 appeals
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
