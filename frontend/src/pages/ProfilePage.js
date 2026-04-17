import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { PAGE_BG_SLATE, TEXT_ON_SLATE, TEXT_MUTED_ON_SLATE, CARD_WHITE } from '../theme/appShell';

const navy = '#0f172a';
const border = '#e2e8f0';
const accent = '#1e40af';

export default function ProfilePage() {
  const [practiceName, setPracticeName] = useState('');
  const [npi, setNpi] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [fax, setFax] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr('');
      try {
        const { data } = await api.get('/api/user/profile');
        if (cancelled) return;
        setPracticeName(data.provider_name || '');
        setNpi(data.provider_npi || '');
        setAddress(data.provider_address || '');
        setPhone(data.provider_phone || '');
        setFax(data.provider_fax || '');
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.error || 'Could not load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setSuccess(false);
    setSaving(true);
    try {
      await api.put('/api/user/profile', {
        provider_name: practiceName,
        provider_npi: npi,
        provider_address: address,
        provider_phone: phone,
        provider_fax: fax,
      });
      setSuccess(true);
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    maxWidth: 480,
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    fontSize: 15,
    boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontWeight: 700, fontSize: 13, color: navy, marginBottom: 6 };
  const fieldWrap = { marginBottom: 16 };

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          maxWidth: 560,
          margin: '0 auto',
          background: PAGE_BG_SLATE,
          minHeight: 'calc(100vh - 60px)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ color: TEXT_MUTED_ON_SLATE }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px 16px',
        background: PAGE_BG_SLATE,
        minHeight: 'calc(100vh - 60px)',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, color: TEXT_ON_SLATE, margin: '0 0 8px' }}>Practice profile</h1>
      <p style={{ color: TEXT_MUTED_ON_SLATE, margin: '0 0 24px', fontSize: 14, lineHeight: 1.5 }}>
        Save your practice details once; we will use them when starting new appeals.
      </p>
      <form
        onSubmit={submit}
        style={{
          background: CARD_WHITE,
          padding: 24,
          borderRadius: 14,
          border: `1px solid ${border}`,
        }}
      >
        <div style={fieldWrap}>
          <label style={labelStyle}>Practice name</label>
          <input
            type="text"
            value={practiceName}
            onChange={(e) => setPracticeName(e.target.value)}
            style={inputStyle}
            autoComplete="organization"
          />
        </div>
        <div style={fieldWrap}>
          <label style={labelStyle}>NPI</label>
          <input type="text" value={npi} onChange={(e) => setNpi(e.target.value)} style={inputStyle} />
        </div>
        <div style={fieldWrap}>
          <label style={labelStyle}>Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
          />
        </div>
        <div style={fieldWrap}>
          <label style={labelStyle}>Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
            autoComplete="tel"
          />
        </div>
        <div style={fieldWrap}>
          <label style={labelStyle}>Fax</label>
          <input type="text" value={fax} onChange={(e) => setFax(e.target.value)} style={inputStyle} />
        </div>
        {success ? (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 8,
              background: '#ecfdf5',
              color: '#065f46',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Profile saved.
          </div>
        ) : null}
        {err ? (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 8,
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: 14,
            }}
          >
            {err}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            background: saving ? '#94a3b8' : accent,
            border: 'none',
            borderRadius: 8,
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
      </div>
    </div>
  );
}
