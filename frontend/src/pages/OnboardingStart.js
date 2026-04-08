import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CodeMultiInput from '../components/CodeMultiInput';
import CodingIntelligencePanel from '../components/CodingIntelligencePanel';
import DenialDocumentDropZone from '../components/DenialDocumentDropZone';
import {
  parseCsvText,
  parseExcelFile,
  rowToStructuredIntake,
  rowsToBatchPayload,
  rowsToWorkerBatchPayload,
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

function fieldBg(fc, key) {
  return fc[key] === 'low' ? '#fffbeb' : '#fff';
}

const VERIFY_TOOLTIP = 'Please verify this field';

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
  const [pasteText, setPasteText] = useState('');
  const [batchMsg, setBatchMsg] = useState('');
  const [bulkPdfFiles, setBulkPdfFiles] = useState([]);
  const [bulkDrag, setBulkDrag] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkJob, setBulkJob] = useState(null);
  const [bulkDoneJobId, setBulkDoneJobId] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const intelDebounceRef = useRef(null);
  const pasteExtractTimerRef = useRef(null);

  const applyExtractionData = useCallback((data) => {
    const sfc = data.field_confidence || data.fieldConfidence || {};
    const hasServerFc = Object.keys(sfc).length > 0;
    const uiFc = (key) => (sfc[key] === 'low' ? 'low' : 'high');

    const carcFromDoc = (data.denial_codes || [])
      .map((c) => normalizeCarcToken(c))
      .filter(Boolean);
    const rarcs = (data.rarc_codes || [])
      .map((r) => String(r).trim().toUpperCase())
      .filter(Boolean);
    const cpts = (data.cpt_codes || []).map((c) => String(c).trim()).filter(Boolean);
    const icds = (data.icd_codes || []).map((c) => String(c).trim().toUpperCase()).filter(Boolean);
    const overall = data.confidence || 'medium';
    const forceLow = overall === 'low' && !hasServerFc;

    let paid = '';
    if (data.paid_amount != null && data.paid_amount !== '') paid = String(data.paid_amount);
    else if (data.denied_amount != null && data.denied_amount !== '') paid = String(data.denied_amount);

    const rawSnippet = [data.denial_reason_text, data.raw_text]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 1200);

    const modStr = Array.isArray(data.modifiers)
      ? data.modifiers.map((m) => String(m).trim()).filter(Boolean).join(', ')
      : '';

    const pick = (camelKey, hasValue) => {
      if (hasServerFc && Object.prototype.hasOwnProperty.call(sfc, camelKey)) {
        return uiFc(camelKey);
      }
      return forceLow || !hasValue ? 'low' : 'high';
    };

    setIntake({
      ...emptyIntake(),
      claimNumber: data.claim_number || '',
      dateOfService: parseServiceDate(data.service_date || data.denial_date),
      payer: data.payer_name || '',
      patientName: data.patient_name || '',
      carcCodes: carcFromDoc.length ? carcFromDoc : [],
      rarcCodes: rarcs,
      cptCodes: cpts,
      icdCodes: icds,
      billedAmount: data.billed_amount != null && data.billed_amount !== '' ? String(data.billed_amount) : '',
      paidAmount: paid,
      treatmentProvided: data.patient_name ? `Patient: ${data.patient_name}` : '',
      medicalNecessity: rawSnippet || 'Document payer denial rationale from uploaded or pasted content.',
      modifiers: modStr,
      specialCircumstances: '',
      planType: 'Commercial',
    });

    setFieldConfidence({
      claimNumber: pick('claimNumber', !!data.claim_number),
      dateOfService: pick('dateOfService', !!(data.service_date || data.denial_date)),
      payer: pick('payer', !!data.payer_name),
      carcCodes: pick('carcCodes', carcFromDoc.length > 0),
      rarcCodes: pick('rarcCodes', rarcs.length > 0),
      cptCodes: pick('cptCodes', cpts.length > 0),
      icdCodes: pick('icdCodes', icds.length > 0),
      billedAmount: pick('billedAmount', data.billed_amount != null && data.billed_amount !== ''),
      paidAmount: pick('paidAmount', paid !== ''),
      modifiers: pick('modifiers', !!modStr),
      _overall: overall,
    });
  }, []);

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

  useEffect(() => {
    if (mode !== 'paste') return undefined;
    const t = pasteText.trim();
    if (pasteExtractTimerRef.current) clearTimeout(pasteExtractTimerRef.current);
    if (t.length < 20) {
      return undefined;
    }
    pasteExtractTimerRef.current = setTimeout(async () => {
      setExtracting(true);
      setErr('');
      try {
        const { data } = await api.post('/api/parse/denial-text', { text: t });
        if (data.success === false && data.error) {
          throw new Error(data.message || data.error);
        }
        applyExtractionData(data);
        setExtractedMeta({
          kind: 'text',
          confidence: data.confidence || 'medium',
          claim_number: data.claim_number,
          payer_name: data.payer_name,
          warning: data.warning,
        });
      } catch (ex) {
        const msg =
          ex.response?.data?.message || ex.response?.data?.error || ex.message || 'Extraction incomplete';
        setExtractedMeta({
          kind: 'text_error',
          message: `${msg} You can still generate your appeal without editing fields.`,
        });
      } finally {
        setExtracting(false);
      }
    }, 450);
    return () => {
      if (pasteExtractTimerRef.current) clearTimeout(pasteExtractTimerRef.current);
    };
  }, [pasteText, mode, applyExtractionData]);

  const runPreview = useCallback(async () => {
    const payload = serializeIntakeForBackend(intake);
    const payer = (intake.payer || '').trim() || 'Unknown payer';
    const claimNum = (intake.claimNumber || '').trim();
    const pasteSupplement =
      mode === 'paste' && pasteText.trim() ? pasteText.trim().slice(0, 15000) : '';
    const pasteBlock = [payload.paste_details, pasteSupplement].filter(Boolean).join('\n\n');
    try {
      if (mode === 'upload' || mode === 'csv') {
        const fd = new FormData();
        fd.append('intake_mode', mode);
        fd.append('payer', payer);
        fd.append('denial_reason', payload.denial_reason);
        fd.append('billed_amount', intake.billedAmount || '0');
        fd.append('paste_details', pasteBlock);
        fd.append('claim_number', claimNum);
        fd.append('patient_name', (intake.patientName || '').trim());
        fd.append('provider_name', (intake.providerName || '').trim());
        fd.append('provider_npi', (intake.providerNpi || '').trim());
        fd.append('date_of_service', intake.dateOfService || '');
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
        payer,
        denial_reason: payload.denial_reason,
        billed_amount: intake.billedAmount || '0',
        paste_details: pasteBlock,
        claim_number: claimNum,
        patient_name: (intake.patientName || '').trim(),
        provider_name: (intake.providerName || '').trim(),
        provider_npi: (intake.providerNpi || '').trim(),
        date_of_service: intake.dateOfService || '',
        cpt_codes: payload.cpt_codes || '',
        diagnosis_code: payload.diagnosis_code || '',
        denial_code: payload.denial_code || '',
      });
      navigate(`/start/preview/${data.appeal_id}`);
    } catch (err) {
      console.error('Preview error:', err.response?.data || err);
      throw err;
    }
  }, [mode, intake, file, navigate, pasteText]);

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
    setBulkPdfFiles([]);
    setBulkDrag(false);
    setBulkProcessing(false);
    setBulkJob(null);
    setBulkDoneJobId(null);
    setIntake(emptyIntake());
    setFieldConfidence({});
    setIntelligence(null);
    setPasteText('');
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
    setBulkJob(null);
    setBulkDoneJobId(null);
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
      setExtractedMeta({
        kind: 'image',
        fileName: f.name,
        message: 'We could not auto-extract from this file type. You can still generate an appeal — fields below are optional.',
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
      applyExtractionData(data);
      setExtractedMeta({
        kind: 'pdf',
        confidence: data.confidence || 'medium',
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

  /** Strict required fields only when user neither uploaded nor pasted (no such entry on this screen). */
  const validate = () => {
    const usedUploadOrPaste =
      mode === 'upload' || mode === 'paste' || mode === 'csv' || !!file || !!(pasteText && pasteText.trim());
    if (usedUploadOrPaste) return '';
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
      try {
        const { data } = await api.post('/api/intelligence/analyze', buildIntelPayload());
        setIntelligence(data);
      } catch {
        /* analysis optional; never blocks generation */
      }
      await runPreview();
    } catch (ex) {
      console.error('Preview error:', ex.response?.data || ex);
      setErr(ex.response?.data?.error || 'Could not create preview');
    } finally {
      setLoading(false);
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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const pollBatchJob = async (jobId) => {
    for (;;) {
      const { data: st } = await api.get(`/api/queue/batch-appeals/${jobId}`);
      setBulkJob(st);
      if (st.status === 'done' || st.status === 'error') {
        return st;
      }
      await sleep(1000);
    }
  };

  const downloadBatchZip = async (jobId) => {
    const res = await api.get(`/api/queue/batch-appeals/${jobId}/zip`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appeals_batch.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const runCsvBulkAppeals = async () => {
    if (!token || !csvRows.length) return;
    setErr('');
    setBatchMsg('');
    setBulkDoneJobId(null);
    setBulkProcessing(true);
    setBulkJob(null);
    try {
      const rows = rowsToWorkerBatchPayload(csvRows);
      const { data } = await api.post('/api/queue/batch-appeals', { rows, defaults: {} });
      const st = await pollBatchJob(data.job_id);
      if (st.status === 'done') {
        setBulkDoneJobId(data.job_id);
        setBatchMsg(
          `ZIP ready: ${st.ok_count ?? 0} appeal PDF(s). Summary: batch_summary.csv and processing_report.txt inside the archive.`
        );
      } else {
        setErr(st.error || 'Batch job failed');
      }
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Bulk batch failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const addBulkPdfFiles = (fileList) => {
    const arr = Array.from(fileList || []).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (!arr.length) return;
    setBulkPdfFiles((prev) => [...prev, ...arr].slice(0, 100));
  };

  const runPdfBulkAppeals = async () => {
    if (!token || !bulkPdfFiles.length) return;
    setErr('');
    setBatchMsg('');
    setBulkDoneJobId(null);
    setBulkProcessing(true);
    setBulkJob(null);
    try {
      const fd = new FormData();
      bulkPdfFiles.forEach((f) => fd.append('files', f));
      const { data } = await api.post('/api/queue/batch-appeals-pdfs', fd);
      const st = await pollBatchJob(data.job_id);
      if (st.status === 'done') {
        setBulkDoneJobId(data.job_id);
        setBatchMsg(`ZIP ready: ${st.ok_count ?? 0} appeal PDF(s) from ${bulkPdfFiles.length} file(s).`);
      } else {
        setErr(st.error || 'Batch job failed');
      }
    } catch (ex) {
      setErr(ex.response?.data?.error || 'PDF batch failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const extractedReady =
    !extracting && (extractedMeta?.kind === 'pdf' || extractedMeta?.kind === 'text');

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

          <button
            type="button"
            onClick={() => {
              setIntake(emptyIntake());
              setFieldConfidence({});
              setBulkPdfFiles([]);
              setBulkJob(null);
              setBulkDoneJobId(null);
              setMode('bulkPdf');
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
            <strong style={{ fontSize: 17, color: navy, display: 'block', marginBottom: 6 }}>
              Upload Multiple Denial Letters
            </strong>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.45 }}>
              Select or drag up to 100 PDFs — we extract each, generate appeals, and package PDFs in one ZIP
            </div>
          </button>
        </div>

        {extracting && (
          <p style={{ marginTop: 16, color: accent, fontWeight: 600, fontSize: 15 }}>Reading file…</p>
        )}

        <WorkflowSteps />
      </div>
    );
  }

  if (mode === 'bulkPdf') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 48px', fontFamily: '"Inter", system-ui, sans-serif' }}>
        <button
          type="button"
          onClick={resetIntake}
          style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 15, fontWeight: 600 }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Bulk PDF denials</h1>
        <p style={{ fontSize: 15, color: '#475569', marginBottom: 18 }}>
          Log in required. Each successful appeal uses your plan credits. Failed extractions are skipped and listed in{' '}
          <code style={{ fontSize: 13 }}>processing_report.txt</code> inside the ZIP.
        </p>

        {!token && (
          <p style={{ color: '#b45309', fontWeight: 600, marginBottom: 14 }}>
            Sign in to run bulk PDF processing and download your appeals ZIP.
          </p>
        )}

        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setBulkDrag(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setBulkDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setBulkDrag(false);
            addBulkPdfFiles(e.dataTransfer.files);
          }}
          style={{
            border: `2px dashed ${bulkDrag ? accent : border}`,
            borderRadius: 12,
            padding: 28,
            textAlign: 'center',
            background: bulkDrag ? softBlue : '#f8fafc',
            marginBottom: 16,
          }}
        >
          <p style={{ margin: '0 0 10px', fontWeight: 700, color: navy }}>Drag & drop PDF denial letters here</p>
          <input
            type="file"
            accept=".pdf,application/pdf"
            multiple
            style={{ fontSize: 14 }}
            onChange={(e) => addBulkPdfFiles(e.target.files)}
          />
        </div>

        {bulkPdfFiles.length > 0 && (
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 10 }}>
            {bulkPdfFiles.length} PDF{bulkPdfFiles.length === 1 ? '' : 's'} selected (max 100)
          </p>
        )}

        {bulkProcessing && (
          <div style={{ marginBottom: 16, padding: 16, background: softBlue, borderRadius: 10, border: `1px solid ${border}` }}>
            <div style={{ fontWeight: 800, color: navy, marginBottom: 8 }}>
              Processing {bulkJob?.total ?? bulkPdfFiles.length} denials…
            </div>
            {bulkJob && bulkJob.total > 0 && (
              <>
                <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.round(((bulkJob.current || 0) / bulkJob.total) * 100))}%`,
                      height: '100%',
                      background: accent,
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 13, marginTop: 8, color: '#475569' }}>
                  {bulkJob.current ?? 0} / {bulkJob.total} files
                </div>
              </>
            )}
          </div>
        )}

        {!bulkProcessing && bulkDoneJobId && bulkJob?.status === 'done' && (
          <div
            style={{
              marginBottom: 16,
              padding: 16,
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 10,
            }}
          >
            <p style={{ margin: '0 0 12px', fontWeight: 800, color: '#14532d', fontSize: 17 }}>
              {bulkJob.ok_count ?? 0} Appeals Generated
            </p>
            <button
              type="button"
              onClick={() => downloadBatchZip(bulkDoneJobId)}
              style={{
                padding: '12px 20px',
                fontWeight: 800,
                fontSize: 15,
                background: navy,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Download All Appeals
            </button>
          </div>
        )}

        {batchMsg && <p style={{ fontSize: 14, color: '#475569', marginBottom: 10 }}>{batchMsg}</p>}
        {err && <p style={{ color: '#b91c1c', fontWeight: 600, marginBottom: 10 }}>{err}</p>}

        <button
          type="button"
          disabled={!token || !bulkPdfFiles.length || bulkProcessing}
          onClick={runPdfBulkAppeals}
          style={{
            width: '100%',
            padding: 16,
            background: !token || !bulkPdfFiles.length || bulkProcessing ? '#94a3b8' : navy,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 16,
            cursor: !token || !bulkPdfFiles.length || bulkProcessing ? 'not-allowed' : 'pointer',
          }}
        >
          {bulkProcessing ? 'Processing…' : 'Generate all appeals (ZIP)'}
        </button>
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

      {(mode === 'upload' || mode === 'paste') && (
        <p style={{ fontSize: 15, color: '#334155', margin: '0 0 16px', lineHeight: 1.5, fontWeight: 600 }}>
          {extractedReady
            ? 'We extracted your claim details. Review if needed — or generate your appeal now.'
            : 'Upload or paste your denial. We extract claim details automatically when possible — you can generate without filling every field.'}
        </p>
      )}

      {extractedReady && extractedMeta?.warning && (
        <div
          style={{
            border: '1px solid #fde68a',
            background: '#fffbeb',
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
            fontSize: 14,
            color: '#92400e',
            fontWeight: 600,
          }}
        >
          {extractedMeta.warning}
        </div>
      )}

      {mode === 'upload' && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: navy, margin: '0 0 8px' }}>
            Denial letter or EOB (PDF, PNG, JPG)
          </p>
          <DenialDocumentDropZone
            accept=".pdf,.png,.jpg,.jpeg"
            onFile={(f) => runPdfExtract(f)}
            disabled={extracting}
            inputId="onboarding-denial-letter-file"
            onPasteText={(text) => {
              setMode('paste');
              setPasteText(text);
            }}
          >
            <div style={{ textAlign: 'center', padding: '8px 4px' }}>
              <strong style={{ color: navy, fontSize: 15 }}>Drag, drop, or paste your denial here</strong>
              <p style={{ margin: '8px 0 4px', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
                Paste text, screenshot, or PDF — we&apos;ll extract it automatically
              </p>
              <p style={{ margin: '10px 0 6px', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
                Release to upload — or click to choose from your device
              </p>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>PDF, PNG, or JPG · max 10MB on server</span>
            </div>
          </DenialDocumentDropZone>
        </div>
      )}

      {mode === 'paste' && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: navy, marginBottom: 8 }}>
            Paste denial letter or EOB text
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste from your payer portal or billing system…"
            rows={10}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 12,
              borderRadius: 8,
              fontSize: 14,
              border: `1px solid ${border}`,
              fontFamily: 'inherit',
              lineHeight: 1.45,
            }}
          />
        </div>
      )}

      {extracting && (mode === 'upload' || mode === 'paste') && (
        <p style={{ marginTop: 0, marginBottom: 18, color: accent, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <style>{`@keyframes dapSpin { to { transform: rotate(360deg); } }`}</style>
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              border: '2px solid #bfdbfe',
              borderTopColor: accent,
              borderRadius: '50%',
              animation: 'dapSpin 0.8s linear infinite',
            }}
          />
          Extracting claim details…
        </p>
      )}

      {(extractedMeta?.kind === 'pdf' || extractedMeta?.kind === 'text') && !extracting && (
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
          {extractedMeta.message} — you can still generate an appeal; fields below are optional.
        </div>
      )}

      {extractedMeta && extractedMeta.kind === 'text_error' && (
        <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: '#92400e' }}>
          {extractedMeta.message}
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
            {csvRows.length} claim{csvRows.length === 1 ? '' : 's'} loaded — every row can be processed into appeals (ZIP)
          </div>
          {token && bulkProcessing && (
            <div style={{ marginBottom: 14, padding: 14, background: softBlue, borderRadius: 10, border: `1px solid ${border}` }}>
              <div style={{ fontWeight: 800, color: navy, marginBottom: 8 }}>
                Processing {bulkJob?.total ?? csvRows.length} denials…
              </div>
              {bulkJob && bulkJob.total > 0 && (
                <>
                  <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.round(((bulkJob.current || 0) / bulkJob.total) * 100))}%`,
                        height: '100%',
                        background: accent,
                        transition: 'width 0.25s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 13, marginTop: 8, color: '#475569' }}>
                    {bulkJob.current ?? 0} / {bulkJob.total} rows
                  </div>
                </>
              )}
            </div>
          )}
          {!bulkProcessing && bulkDoneJobId && bulkJob?.status === 'done' && (
            <div
              style={{
                marginBottom: 14,
                padding: 14,
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 10,
              }}
            >
              <p style={{ margin: '0 0 10px', fontWeight: 800, color: '#14532d' }}>
                {bulkJob.ok_count ?? 0} Appeals Generated
              </p>
              <button
                type="button"
                onClick={() => downloadBatchZip(bulkDoneJobId)}
                style={{
                  padding: '10px 18px',
                  fontWeight: 800,
                  background: navy,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Download All Appeals
              </button>
            </div>
          )}
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
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                onClick={runCsvBulkAppeals}
                disabled={loading || bulkProcessing}
                style={{
                  padding: '12px 18px',
                  fontWeight: 800,
                  background: loading || bulkProcessing ? '#94a3b8' : navy,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: loading || bulkProcessing ? 'wait' : 'pointer',
                }}
              >
                {bulkProcessing ? 'Processing…' : `Generate all ${csvRows.length} appeals (ZIP)`}
              </button>
              <button
                type="button"
                onClick={importAllToQueue}
                disabled={loading || bulkProcessing}
                style={{
                  padding: '12px 18px',
                  fontWeight: 700,
                  background: '#fff',
                  border: `2px solid ${accent}`,
                  color: accent,
                  borderRadius: 8,
                  cursor: loading || bulkProcessing ? 'wait' : 'pointer',
                }}
              >
                Import all to denial queue
              </button>
            </div>
          )}
          {!token && (
            <p style={{ fontSize: 13, marginTop: 10, color: '#b45309', fontWeight: 600 }}>
              Sign in to generate all appeals as PDFs in one ZIP (up to {csvRows.length} rows).
            </p>
          )}
          {batchMsg && <p style={{ fontSize: 13, marginTop: 8, color: '#64748b' }}>{batchMsg}</p>}
        </div>
      )}

      <form onSubmit={submit}>
        <fieldset style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <legend style={{ fontWeight: 800, color: navy, padding: '0 8px' }}>Claim information</legend>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Claim number</span>
            <input
              value={intake.claimNumber}
              onChange={(e) => setIntake((s) => ({ ...s, claimNumber: e.target.value }))}
              title={fieldConfidence.claimNumber === 'low' ? VERIFY_TOOLTIP : undefined}
              style={{
                ...inputBase,
                border: fieldBorder(fieldConfidence, 'claimNumber'),
                backgroundColor: fieldBg(fieldConfidence, 'claimNumber'),
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Date of service</span>
            <input
              type="date"
              value={intake.dateOfService}
              onChange={(e) => setIntake((s) => ({ ...s, dateOfService: e.target.value }))}
              title={fieldConfidence.dateOfService === 'low' ? VERIFY_TOOLTIP : undefined}
              style={{
                ...inputBase,
                border: fieldBorder(fieldConfidence, 'dateOfService'),
                backgroundColor: fieldBg(fieldConfidence, 'dateOfService'),
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Payer</span>
            <input
              list="payer-suggestions"
              value={intake.payer}
              onChange={(e) => setIntake((s) => ({ ...s, payer: e.target.value }))}
              placeholder="Start typing…"
              title={fieldConfidence.payer === 'low' ? VERIFY_TOOLTIP : undefined}
              style={{
                ...inputBase,
                border: fieldBorder(fieldConfidence, 'payer'),
                backgroundColor: fieldBg(fieldConfidence, 'payer'),
              }}
            />
            <datalist id="payer-suggestions">
              {PAYER_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Patient name</span>
            <input
              value={intake.patientName}
              onChange={(e) => setIntake((s) => ({ ...s, patientName: e.target.value }))}
              placeholder="Jane Doe"
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Provider or practice name</span>
            <input
              value={intake.providerName}
              onChange={(e) => setIntake((s) => ({ ...s, providerName: e.target.value }))}
              placeholder="e.g. Riverside Medical Group"
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Provider NPI</span>
            <input
              value={intake.providerNpi}
              onChange={(e) => setIntake((s) => ({ ...s, providerNpi: e.target.value }))}
              placeholder="10-digit NPI"
              style={{ ...inputBase, border: `1px solid ${border}` }}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Plan type</span>
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
            values={intake.carcCodes}
            onChange={(v) => setIntake((s) => ({ ...s, carcCodes: v }))}
            placeholder="e.g. 50 — Enter"
            lowConfidence={fieldConfidence.carcCodes === 'low'}
          />
          <CodeMultiInput
            id="rarc-codes"
            label="RARC / remark code(s)"
            values={intake.rarcCodes}
            onChange={(v) => setIntake((s) => ({ ...s, rarcCodes: v }))}
            placeholder="e.g. N115 — Enter"
            lowConfidence={fieldConfidence.rarcCodes === 'low'}
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
            lowConfidence={fieldConfidence.cptCodes === 'low'}
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
              title={fieldConfidence.billedAmount === 'low' ? VERIFY_TOOLTIP : undefined}
              style={{
                ...inputBase,
                border: fieldBorder(fieldConfidence, 'billedAmount'),
                backgroundColor: fieldBg(fieldConfidence, 'billedAmount'),
              }}
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
              title={fieldConfidence.paidAmount === 'low' ? VERIFY_TOOLTIP : undefined}
              style={{
                ...inputBase,
                border: fieldBorder(fieldConfidence, 'paidAmount'),
                backgroundColor: fieldBg(fieldConfidence, 'paidAmount'),
              }}
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
