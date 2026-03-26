import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CodeMultiInput from '../components/CodeMultiInput';
import CodingIntelligencePanel, { needsPreGenerationModal } from '../components/CodingIntelligencePanel';
import {
  parseCsvText,
  parseExcelFile,
  rowToStructuredIntake,
  rowsToBatchPayload,
} from '../utils/intakeCsv';
import {
  emptyIntake,
  getDenialCategoryFromCodes,
  mapDenialToStrategy,
  serializeIntakeForBackend,
  PAYER_SUGGESTIONS,
  normalizeCarcToken,
} from '../utils/denialIntakeEngine';

const navy = '#0f172a';
const accent = '#1e40af';
const border = '#e2e8f0';
const softBlue = '#eff6ff';

function WorkflowSteps() {
  const steps = [
    { n: 1, label: 'Upload denial' },
    { n: 2, label: 'We extract & analyze' },
    { n: 3, label: 'Generate submission-ready appeal' },
  ];
  return (
    <div
      style={{
        marginTop: 28,
        padding: '20px 16px',
        background: '#f8fafc',
        borderRadius: 10,
        border: `1px solid ${border}`,
      }}
    >
      <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
        HOW IT WORKS
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {steps.map((s) => (
          <div key={s.n} style={{ flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: navy,
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {s.n}
            </div>
            <span style={{ fontSize: 14, color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fieldBorder(fc, key) {
  return fc[key] === 'low' ? '2px solid #f59e0b' : `1px solid ${border}`;
}

function parseServiceDate(s) {
  if (!s) return '';
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return '';
}

export default function OnboardingStart() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [err, setErr] = useState('');
  const [intake, setIntake] = useState(() => emptyIntake());
  const [fieldConfidence, setFieldConfidence] = useState({});
  const [file, setFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [selectedCsvRow, setSelectedCsvRow] = useState(0);
  const [extractedMeta, setExtractedMeta] = useState(null);
  const [batchMsg, setBatchMsg] = useState('');
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [preGenModal, setPreGenModal] = useState(null);
  const intelDebounceRef = useRef(null);

  const buildIntelPayload = useCallback(() => {
    const carc = (intake.carcCodes || []).join(', ');
    const rarc = (intake.rarcCodes || []).join(', ');
    const serialized = serializeIntakeForBackend(intake);
    return {
      cpt_codes: (intake.cptCodes || []).join(', '),
      cptCodes: (intake.cptCodes || []).join(', '),
      icd_codes: (intake.icdCodes || []).join(', '),
      icdCodes: (intake.icdCodes || []).join(', '),
      diagnosis_code: serialized.diagnosis_code || '',
      denial_codes: `${carc} ${rarc}`.trim(),
      carc_codes: carc,
      carcCodes: [...(intake.carcCodes || [])],
      rarc_codes: rarc,
      denial_reason: serialized.denial_reason || '',
      modifiers: intake.modifiers || '',
      payer: intake.payer || '',
      planType: intake.planType || '',
      plan_type: intake.planType || '',
      record_feedback: true,
    };
  }, [intake]);

  const appendModifierToIntake = useCallback((m) => {
    const raw = String(m || '').trim();
    if (!raw) return;
    setIntake((s) => {
      const prev = (s.modifiers || '').trim();
      const token = raw.startsWith('-') ? raw : `-${raw}`;
      const next = prev ? `${prev}, ${token}` : token;
      return { ...s, modifiers: next };
    });
  }, []);

  useEffect(() => {
    if (!mode) return;
    if (intelDebounceRef.current) clearTimeout(intelDebounceRef.current);
    intelDebounceRef.current = setTimeout(async () => {
      setIntelligenceLoading(true);
      try {
        const { data } = await api.post('/api/intelligence/analyze', buildIntelPayload());
        setIntelligence(data);
      } catch {
        setIntelligence(null);
      } finally {
        setIntelligenceLoading(false);
      }
    }, 400);
    return () => {
      if (intelDebounceRef.current) clearTimeout(intelDebounceRef.current);
    };
  }, [mode, buildIntelPayload]);

  const runPreview = useCallback(async () => {
    const payload = serializeIntakeForBackend(intake);
    if (mode === 'upload' || mode === 'csv') {
      const fd = new FormData();
      fd.append('intake_mode', mode);
      fd.append('payer', intake.payer.trim());
      fd.append('denial_reason', payload.denial_reason);
      fd.append('billed_amount', intake.billedAmount || '0');
      fd.append('paste_details', payload.paste_details || '');
      fd.append('claim_number', intake.claimNumber.trim());
      fd.append('date_of_service', intake.dateOfService);
      fd.append('cpt_codes', payload.cpt_codes || '');
      fd.append('diagnosis_code', payload.diagnosis_code || '');
      fd.append('denial_code', payload.denial_code || '');
      if (file) fd.append('denial_file', file);
      const { data } = await api.post('/api/onboarding/preview', fd);
      navigate(`/start/preview/${data.appeal_id}`);
      return;
    }
    const { data } = await api.post('/api/onboarding/preview', {
      intake_mode: 'paste',
      payer: intake.payer.trim(),
      denial_reason: payload.denial_reason,
      billed_amount: intake.billedAmount || '0',
      paste_details: payload.paste_details || '',
      claim_number: intake.claimNumber.trim(),
      date_of_service: intake.dateOfService,
      cpt_codes: payload.cpt_codes || '',
      diagnosis_code: payload.diagnosis_code || '',
      denial_code: payload.denial_code || '',
    });
    navigate(`/start/preview/${data.appeal_id}`);
  }, [mode, intake, file, navigate]);

  const categoryInfo = useMemo(
    () => getDenialCategoryFromCodes(intake.carcCodes, intake.rarcCodes),
    [intake.carcCodes, intake.rarcCodes]
  );

  const strategies = useMemo(
    () => mapDenialToStrategy(intake.carcCodes, intake.rarcCodes),
    [intake.carcCodes, intake.rarcCodes]
  );

  const recoveryAmount = useMemo(() => {
    const b = parseFloat(intake.billedAmount) || 0;
    const p = parseFloat(intake.paidAmount) || 0;
    return Math.max(0, b - p);
  }, [intake.billedAmount, intake.paidAmount]);

  const resetIntake = () => {
    setMode(null);
    setFile(null);
    setCsvFile(null);
    setCsvRows([]);
    setSelectedCsvRow(0);
    setExtractedMeta(null);
    setErr('');
    setBatchMsg('');
    setIntake(emptyIntake());
    setFieldConfidence({});
    setIntelligence(null);
    setPreGenModal(null);
  };

  const applyCsvRow = useCallback(
    (index) => {
      const row = csvRows[index];
      if (!row) return;
      setSelectedCsvRow(index);
      setIntake(rowToStructuredIntake(row));
      setFieldConfidence({});
    },
    [csvRows]
  );

  const handleCsvOrExcel = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvFile(f);
    setErr('');
    setExtracting(true);
    try {
      let rows = [];
      const name = (f.name || '').toLowerCase();
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        rows = await parseExcelFile(f);
      } else {
        const text = await f.text();
        rows = parseCsvText(text);
      }
      setCsvRows(rows);
      setMode('csv');
      if (rows.length) {
        setIntake(rowToStructuredIntake(rows[0]));
        setSelectedCsvRow(0);
      }
    } catch (ex) {
      setErr(ex.message || 'Could not read file. Try CSV or re-export from Excel.');
      setCsvFile(null);
      setCsvRows([]);
    } finally {
      setExtracting(false);
    }
  };

  const runPdfExtract = async (f) => {
    setFile(f);
    setExtractedMeta(null);
    setErr('');
    const lower = (f.name || '').toLowerCase();
    const isPdf = lower.endsWith('.pdf');
    if (!isPdf) {
      setExtracting(true);
      await new Promise((r) => setTimeout(r, 700));
      setExtracting(false);
      setExtractedMeta({
        kind: 'image',
        fileName: f.name,
        message: 'Add structured fields below—we could not auto-extract text from this file type.',
      });
      setFieldConfidence({});
      return;
    }

    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await api.post('/api/parse/denial-letter', fd);
      if (data.success === false && data.error) {
        throw new Error(data.message || data.error);
      }
      const carcFromPdf = (data.denial_codes || [])
        .map((c) => normalizeCarcToken(c))
        .filter(Boolean);
      setIntake({
        ...emptyIntake(),
        claimNumber: data.claim_number || '',
        dateOfService: parseServiceDate(data.service_date || data.denial_date),
        payer: data.payer_name || '',
        carcCodes: carcFromPdf.length ? carcFromPdf : [],
        rarcCodes: [],
        billedAmount: data.billed_amount != null && data.billed_amount !== '' ? String(data.billed_amount) : '',
        paidAmount: data.denied_amount != null && data.denied_amount !== '' ? String(data.denied_amount) : '',
        treatmentProvided: '',
        medicalNecessity: (data.raw_text || '').slice(0, 1200) || 'Document payer denial rationale from uploaded letter.',
        specialCircumstances: '',
        planType: 'Commercial',
      });
      const conf = data.confidence || 'medium';
      setFieldConfidence({
        claimNumber: data.claim_number ? 'high' : 'low',
        dateOfService: data.service_date ? 'high' : 'low',
        payer: data.payer_name ? 'high' : 'low',
        carcCodes: carcFromPdf.length ? 'high' : 'low',
        _overall: conf,
      });
      setExtractedMeta({
        kind: 'pdf',
        confidence: conf,
        claim_number: data.claim_number,
        payer_name: data.payer_name,
        warning: data.warning,
      });
    } catch (ex) {
      const msg =
        ex.response?.data?.message || ex.response?.data?.error || ex.message || 'Extraction failed';
      setErr(msg);
      setExtractedMeta({ kind: 'error', message: msg });
      setFieldConfidence({});
    } finally {
      setExtracting(false);
    }
  };

  const validate = () => {
    if (!intake.claimNumber?.trim()) return 'Claim number is required.';
    if (!intake.dateOfService) return 'Date of service is required.';
    if (!intake.payer?.trim()) return 'Payer is required.';
    if (!intake.carcCodes?.length) return 'At least one CARC code is required.';
    if (!intake.rarcCodes?.length) return 'At least one RARC code is required.';
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setLoading(true);
    try {
      let intel = intelligence;
      try {
        const { data } = await api.post('/api/intelligence/analyze', buildIntelPayload());
        intel = data;
        setIntelligence(data);
      } catch {
        /* analysis optional */
      }
      if (needsPreGenerationModal(intel)) {
        setPreGenModal({ intel });
        return;
      }
      await runPreview();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Could not create preview');
    } finally {
      setLoading(false);
    }
  };

  const proceedPreviewAfterModal = async () => {
    setPreGenModal(null);
    setLoading(true);
    try {
      await runPreview();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Could not create preview');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestedFixesFromModal = () => {
    const intel = preGenModal?.intel;
    setPreGenModal(null);
    if (!intel) return;
    const rm = intel.modifiers?.recommendedModifiers || [];
    if (rm.length) {
      setIntake((s) => ({
        ...s,
        modifiers: [s.modifiers, rm.join(', ')].filter(Boolean).join(', ').replace(/\s+/g, ' ').trim(),
      }));
    }
  };

  const importAllToQueue = async () => {
    if (!token || !csvRows.length) return;
    setBatchMsg('');
    setLoading(true);
    try {
      const rows = rowsToBatchPayload(csvRows).filter((r) => r.claim_number && r.payer && r.denial_reason);
      if (!rows.length) {
        setBatchMsg('No valid rows: each row needs claim_number, payer, and denial_reason.');
        return;
      }
      const { data } = await api.post('/api/queue/batch', { rows, defaults: {} });
      setBatchMsg(`Imported ${data.created_count} claim(s). ${data.errors?.length ? `${data.errors.length} row(s) skipped.` : ''}`);
      navigate('/queue');
    } catch (ex) {
      setBatchMsg(ex.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const showExtractBanner = mode === 'upload' && extractedMeta?.kind === 'pdf' && !extracting;

  if (!mode) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 40px', fontFamily: '"Inter", system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: navy, margin: '0 0 12px', lineHeight: 1.2 }}>
          Upload a denial → get a submission-ready appeal in seconds
        </h1>
        <p style={{ fontSize: 17, color: '#475569', margin: '0 0 28px', lineHeight: 1.5 }}>
          Works with payer letters, EOBs, and bulk claim exports
        </p>

        <div style={{ display: 'grid', gap: 14 }}>
          <button
            type="button"
            onClick={() => {
              setIntake(emptyIntake());
              setFieldConfidence({});
              setMode('upload');
            }}
            style={{
              position: 'relative',
              textAlign: 'left',
              border: '2px solid #2563eb',
              borderRadius: 12,
              padding: '22px 20px',
              cursor: 'pointer',
              background: softBlue,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.12)',
              minHeight: 108,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 12,
                right: 14,
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#1d4ed8',
                background: '#fff',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid #93c5fd',
              }}
            >
              Recommended
            </span>
            <strong style={{ fontSize: 19, color: navy, display: 'block', marginBottom: 8 }}>Upload Denial Letter or EOB</strong>
            <div style={{ fontSize: 15, color: '#475569', lineHeight: 1.45 }}>
              We extract claim details, denial codes, and generate your appeal automatically
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIntake(emptyIntake());
              setFieldConfidence({});
              setMode('paste');
            }}
            style={{
              textAlign: 'left',
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: '18px 16px',
              cursor: 'pointer',
              background: '#fff',
            }}
          >
            <strong style={{ fontSize: 17, color: navy, display: 'block', marginBottom: 6 }}>Paste Denial / EOB Text</strong>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.45 }}>
              Paste directly from your billing system or payer portal
            </div>
          </button>

          <label
            style={{
              display: 'block',
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: '18px 16px',
              cursor: extracting ? 'wait' : 'pointer',
              background: '#fff',
            }}
          >
            <strong style={{ fontSize: 17, color: navy, display: 'block', marginBottom: 6 }}>Upload Denial File (CSV or Excel)</strong>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.45, marginBottom: 10 }}>
              Process multiple denied claims at once
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.4 }}>
              Supports claim_number, payer, date_of_service, CPT, ICD-10, denial codes, billed and paid amounts
            </div>
            <input
              type="file"
              accept=".csv,.txt,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              disabled={extracting}
              style={{ marginTop: 4, fontSize: 14 }}
              onChange={handleCsvOrExcel}
            />
          </label>
        </div>

        {extracting && (
          <p style={{ marginTop: 16, color: accent, fontWeight: 600, fontSize: 15 }}>Reading file…</p>
        )}

        <WorkflowSteps />
      </div>
    );
  }

  const inputBase = {
    width: '100%',
    boxSizing: 'border-box',
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    fontSize: 15,
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 48px', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <button
        type="button"
        onClick={resetIntake}
        style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 15, fontWeight: 600 }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Claim intake</h1>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 16px' }}>
        Structured fields power accurate appeals—defaults save time on repeat claims.
      </p>

      {showExtractBanner && (
        <div
          style={{
            border: '1px solid #86efac',
            background: '#f0fdf4',
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
            fontSize: 14,
            color: '#14532d',
            fontWeight: 600,
          }}
        >
          We extracted your claim details. Review and adjust if needed.
          {extractedMeta.warning && (
            <span style={{ display: 'block', marginTop: 8, fontWeight: 500, color: '#a16207' }}>{extractedMeta.warning}</span>
          )}
        </div>
      )}

      {mode === 'upload' && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: navy, marginBottom: 8 }}>
            Denial letter or EOB (PDF, PNG, JPG)
          </label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) runPdfExtract(f);
            }}
            style={{ fontSize: 14 }}
          />
          {extracting && (
            <p style={{ marginTop: 14, color: accent, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  border: '2px solid #bfdbfe',
                  borderTopColor: accent,
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Extracting claim details…
            </p>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {extractedMeta && extractedMeta.kind === 'pdf' && !extracting && (
        <div
          style={{
            border: '1px solid #bae6fd',
            background: '#f0f9ff',
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
            fontSize: 14,
            color: '#0c4a6e',
          }}
        >
          <strong>Extracted preview:</strong> {extractedMeta.payer_name || '—'} · Claim {extractedMeta.claim_number || '—'} ·
          Confidence: {extractedMeta.confidence || '—'}
        </div>
      )}

      {extractedMeta && extractedMeta.kind === 'image' && (
        <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: '#92400e' }}>
          {extractedMeta.message}
        </div>
      )}

      {extractedMeta && extractedMeta.kind === 'error' && (
        <div style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: '#991b1b' }}>
          {extractedMeta.message} — complete structured fields below.
        </div>
      )}

      {mode === 'csv' && csvRows.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {csvFile && (
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px' }}>
              File: <strong>{csvFile.name}</strong>
            </p>
          )}
          <div style={{ fontWeight: 800, color: navy, marginBottom: 8 }}>
            {csvRows.length} claim{csvRows.length === 1 ? '' : 's'} loaded — select row to edit intake
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 200, border: `1px solid ${border}`, borderRadius: 8, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>#</th>
                  <th style={{ padding: 8 }}>Claim</th>
                  <th style={{ padding: 8 }}>Payer</th>
                  <th style={{ padding: 8 }}>Amount</th>
                  <th style={{ padding: 8 }}>Denial</th>
                </tr>
              </thead>
              <tbody>
                {csvRows.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => applyCsvRow(i)}
                    style={{
                      cursor: 'pointer',
                      background: selectedCsvRow === i ? softBlue : '#fff',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <td style={{ padding: 8 }}>{i + 1}</td>
                    <td style={{ padding: 8 }}>{row.claim_number || '—'}</td>
                    <td style={{ padding: 8 }}>{row.payer || '—'}</td>
                    <td style={{ padding: 8 }}>{row.billed_amount || '—'}</td>
                    <td style={{ padding: 8, maxWidth: 180 }}>{(row.denial_reason || '').slice(0, 80)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {token && (
            <button
              type="button"
              onClick={importAllToQueue}
              disabled={loading}
              style={{
                marginTop: 12,
                padding: '10px 16px',
                fontWeight: 700,
                background: '#fff',
                border: `2px solid ${accent}`,
                color: accent,
                borderRadius: 8,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              Import all {csvRows.length} to denial queue
            </button>
          )}
          {batchMsg && <p style={{ fontSize: 13, marginTop: 8, color: '#64748b' }}>{batchMsg}</p>}
        </div>
      )}

      {preGenModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Resolve issues before generating appeal?</h2>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              Validation failed and/or denial risk is High. Review below, apply fixes to update the form, or proceed
              anyway.
            </p>
            {preGenModal.intel && (
              <div
                style={{
                  maxHeight: 220,
                  overflow: 'auto',
                  marginBottom: 14,
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 13,
                  border: '1px solid #e2e8f0',
                }}
              >
                {(preGenModal.intel.coding?.issues || []).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <strong style={{ color: navy }}>Coding</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {preGenModal.intel.coding.issues.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(preGenModal.intel.risk?.risks || []).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <strong style={{ color: navy }}>Risk</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {preGenModal.intel.risk.risks.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(preGenModal.intel.modifiers?.recommendedModifiers || []).length > 0 && (
                  <div>
                    <strong style={{ color: navy }}>Suggested modifiers</strong>
                    <p style={{ margin: '6px 0 0' }}>
                      {preGenModal.intel.modifiers.recommendedModifiers.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                onClick={applySuggestedFixesFromModal}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: navy,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Apply fixes
              </button>
              <button
                type="button"
                onClick={proceedPreviewAfterModal}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit}>
        <fieldset style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <legend style={{ fontWeight: 800, color: navy, padding: '0 8px' }}>Claim information</legend>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Claim number *</span>
            <input
              required
              value={intake.claimNumber}
              onChange={(e) => setIntake((s) => ({ ...s, claimNumber: e.target.value }))}
              style={{ ...inputBase, border: fieldBorder(fieldConfidence, 'claimNumber') }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Date of service *</span>
            <input
              required
              type="date"
              value={intake.dateOfService}
              onChange={(e) => setIntake((s) => ({ ...s, dateOfService: e.target.value }))}
              style={{ ...inputBase, border: fieldBorder(fieldConfidence, 'dateOfService') }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Payer *</span>
            <input
              required
              list="payer-suggestions"
              value={intake.payer}
              onChange={(e) => setIntake((s) => ({ ...s, payer: e.target.value }))}
              placeholder="Start typing…"
              style={{ ...inputBase, border: fieldBorder(fieldConfidence, 'payer') }}
            />
            <datalist id="payer-suggestions">
              {PAYER_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Plan type *</span>
            <select
              value={intake.planType}
              onChange={(e) => setIntake((s) => ({ ...s, planType: e.target.value }))}
              style={{ ...inputBase, border: `1px solid ${border}` }}
            >
              <option value="Commercial">Commercial</option>
              <option value="Medicare">Medicare</option>
              <option value="Medicaid">Medicaid</option>
            </select>
          </label>
        </fieldset>

        <fieldset style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <legend style={{ fontWeight: 800, color: navy, padding: '0 8px' }}>Denial information</legend>
          <CodeMultiInput
            id="carc-codes"
            label="CARC code(s)"
            required
            values={intake.carcCodes}
            onChange={(v) => setIntake((s) => ({ ...s, carcCodes: v }))}
            placeholder="e.g. 50 — Enter"
            lowConfidence={fieldConfidence.carcCodes === 'low'}
          />
          <CodeMultiInput
            id="rarc-codes"
            label="RARC / remark code(s)"
            required
            values={intake.rarcCodes}
            onChange={(v) => setIntake((s) => ({ ...s, rarcCodes: v }))}
            placeholder="e.g. N115 — Enter"
          />
          {(intake.carcCodes.length > 0 || intake.rarcCodes.length > 0) && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                fontSize: 14,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: 800, color: navy, marginBottom: 6 }}>Detected Denial Type: {categoryInfo.category}</div>
              <div style={{ color: '#475569' }}>Explanation: {categoryInfo.explanation}</div>
            </div>
          )}
          {(intake.carcCodes.length > 0 || intake.rarcCodes.length > 0) && (
            <div
              style={{
                background: '#fefce8',
                border: '1px solid #fde047',
                borderRadius: 8,
                padding: 12,
                marginBottom: 4,
              }}
            >
              <div style={{ fontWeight: 800, color: navy, marginBottom: 8 }}>Appeal Strategy Detected:</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#422006' }}>
                {strategies.map((st) => (
                  <li key={st} style={{ marginBottom: 4 }}>
                    {st}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </fieldset>

        <fieldset style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <legend style={{ fontWeight: 800, color: navy, padding: '0 8px' }}>Billing information</legend>
          <CodeMultiInput
            id="cpt-codes"
            label="CPT / HCPCS"
            values={intake.cptCodes}
            onChange={(v) => setIntake((s) => ({ ...s, cptCodes: v }))}
            placeholder="Code — Enter"
          />
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Modifiers</span>
            <input
              value={intake.modifiers}
              onChange={(e) => setIntake((s) => ({ ...s, modifiers: e.target.value }))}
              placeholder="-25, -59, -24"
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
          <CodeMultiInput
            id="icd-codes"
            label="ICD-10 code(s)"
            values={intake.icdCodes}
            onChange={(v) => setIntake((s) => ({ ...s, icdCodes: v }))}
            placeholder="ICD-10 — Enter"
            lowConfidence={fieldConfidence.icdCodes === 'low'}
            highlightCodes={intelligence?.coding?.weakIcdCodes || []}
          />
          <CodingIntelligencePanel
            analysis={intelligence}
            loading={intelligenceLoading}
            onApplyModifier={appendModifierToIntake}
          />
        </fieldset>

        <fieldset style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <legend style={{ fontWeight: 800, color: navy, padding: '0 8px' }}>Financials</legend>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Billed amount ($)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={intake.billedAmount}
              onChange={(e) => setIntake((s) => ({ ...s, billedAmount: e.target.value }))}
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Paid amount ($)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={intake.paidAmount}
              onChange={(e) => setIntake((s) => ({ ...s, paidAmount: e.target.value }))}
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#047857' }}>
            Estimated Recovery Opportunity: ${recoveryAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </fieldset>

        <fieldset style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <legend style={{ fontWeight: 800, color: navy, padding: '0 8px' }}>Clinical snapshot</legend>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Treatment provided</span>
            <input
              value={intake.treatmentProvided}
              onChange={(e) => setIntake((s) => ({ ...s, treatmentProvided: e.target.value }))}
              placeholder="Brief (e.g. PT session, infusion)"
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Medical necessity</span>
            <input
              value={intake.medicalNecessity}
              onChange={(e) => setIntake((s) => ({ ...s, medicalNecessity: e.target.value }))}
              placeholder="Why care was appropriate"
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Special circumstances (optional)</span>
            <input
              value={intake.specialCircumstances}
              onChange={(e) => setIntake((s) => ({ ...s, specialCircumstances: e.target.value }))}
              placeholder="Auth delays, member transition, etc."
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
        </fieldset>

        {err && <p style={{ color: '#b91c1c', fontSize: 14, fontWeight: 600 }}>{err}</p>}
        <button
          type="submit"
          disabled={loading || extracting}
          style={{
            width: '100%',
            padding: 16,
            background: loading || extracting ? '#94a3b8' : navy,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 16,
            cursor: loading || extracting ? 'not-allowed' : 'pointer',
            marginTop: 8,
          }}
        >
          {loading ? 'Generating…' : extracting ? 'Please wait…' : 'Generate Submission-Ready Appeal'}
        </button>
      </form>

      <WorkflowSteps />
    </div>
  );
}
