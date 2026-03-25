import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const card = {
  border: '1px solid #ccc',
  padding: '16px',
  cursor: 'pointer',
  borderRadius: 6,
  background: '#fff',
};

export default function OnboardingStart() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    denial_reason: '',
    billed_amount: '',
    payer: '',
    cpt_icd: '',
    paste_details: '',
  });
  const [file, setFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const parseCsvFirstRow = (text) => {
    const line = text.split(/\r?\n/).find((l) => l.trim());
    if (!line) return;
    const parts = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    if (parts.length >= 3) {
      update('payer', parts[0] || '');
      update('denial_reason', parts[1] || '');
      update('billed_amount', parts[2] || '');
    } else if (parts.length === 1) {
      update('denial_reason', parts[0]);
    }
  };

  const handleCsv = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvFile(f);
    const text = await f.text();
    parseCsvFirstRow(text);
    setMode('csv');
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (mode === 'upload' || mode === 'csv') {
        const fd = new FormData();
        fd.append('intake_mode', mode);
        fd.append('payer', form.payer);
        fd.append('denial_reason', form.denial_reason);
        fd.append('billed_amount', form.billed_amount || '0');
        fd.append('cpt_icd', form.cpt_icd || '');
        fd.append('paste_details', form.paste_details || '');
        if (file) fd.append('denial_file', file);
        const { data } = await api.post('/api/onboarding/preview', fd);
        navigate(`/start/preview/${data.appeal_id}`);
        return;
      }
      const { data } = await api.post('/api/onboarding/preview', {
        intake_mode: 'paste',
        payer: form.payer,
        denial_reason: form.denial_reason,
        billed_amount: form.billed_amount || '0',
        cpt_icd: form.cpt_icd || '',
        paste_details: form.paste_details || '',
      });
      navigate(`/start/preview/${data.appeal_id}`);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Could not create preview');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Process your first denied claim in under 2 minutes</h1>
        <p style={{ color: '#444', marginBottom: 24 }}>Choose how you want to start.</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <button
            type="button"
            style={card}
            onClick={() => setMode('upload')}
          >
            <strong>Upload denial (PDF)</strong>
            <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>Attach a payer letter or EOB</div>
          </button>
          <button type="button" style={card} onClick={() => setMode('paste')}>
            <strong>Paste denial details</strong>
            <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>Type or paste from your system</div>
          </button>
          <label style={{ ...card, display: 'block', cursor: 'pointer' }}>
            <strong>Upload CSV</strong>
            <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>We&apos;ll use the first row (claim, payer, reason, amount)</div>
            <input type="file" accept=".csv,text/csv" style={{ marginTop: 8 }} onChange={handleCsv} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <button type="button" onClick={() => { setMode(null); setFile(null); setCsvFile(null); }} style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#06c' }}>
        ← Back
      </button>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Claim details</h1>
      <form onSubmit={submit}>
        {mode === 'upload' && (
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Denial document (optional)</span>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'block', marginTop: 4 }} />
          </label>
        )}
        {mode === 'csv' && csvFile && (
          <p style={{ fontSize: 13, color: '#333' }}>Using: {csvFile.name} — edit fields below.</p>
        )}
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Denial reason *</span>
          <textarea
            required
            value={form.denial_reason}
            onChange={(e) => update('denial_reason', e.target.value)}
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Amount ($) *</span>
          <input
            required
            type="text"
            inputMode="decimal"
            value={form.billed_amount}
            onChange={(e) => update('billed_amount', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Payer *</span>
          <input
            required
            value={form.payer}
            onChange={(e) => update('payer', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>CPT / ICD (optional)</span>
          <input
            value={form.cpt_icd}
            onChange={(e) => update('cpt_icd', e.target.value)}
            placeholder="e.g. 99213, Z00.00"
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 8 }}
          />
        </label>
        {mode === 'paste' && (
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Extra context (optional)</span>
            <textarea
              value={form.paste_details}
              onChange={(e) => update('paste_details', e.target.value)}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 4 }}
            />
          </label>
        )}
        {err && <p style={{ color: '#b00020', fontSize: 14 }}>{err}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            marginTop: 8,
          }}
        >
          {loading ? '…' : 'Generate Appeal'}
        </button>
      </form>
    </div>
  );
}
