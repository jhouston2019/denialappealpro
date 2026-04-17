import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CodeMultiInput from '../components/CodeMultiInput';
import CodingIntelligencePanel from '../components/CodingIntelligencePanel';
import DenialDocumentDropZone from '../components/DenialDocumentDropZone';
import IntakeStepper from '../components/IntakeStepper';
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
const border = '#e2e8f0';
const softBlue = '#eff6ff';
const pageBg = '#f8fafc';
const cardBg = '#ffffff';
const primaryCta = '#22c55e';
const primaryCtaHover = '#16a34a';
const extractedBorder = '#bbf7d0';
const orangeBorder = '#fb923c';
const orangeBg = '#fff7ed';
const disclaimerBorder = '#fde047';

const VERIFY_TOOLTIP = 'Please verify this field';

const SINGLE_STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'review', label: 'Review Extraction' },
  { key: 'confirm', label: 'Confirm Details' },
  { key: 'generate', label: 'Generate' },
];

const BULK_STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'queue', label: 'Processing Queue' },
];

function parseServiceDate(s) {
  if (!s) return '';
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return '';
}

/** Per-file/row status from aggregate job progress (API returns current/total only). */
function deriveLineStatus(index, job) {
  const cur = job?.current || 0;
  if (job?.status === 'error') {
    if (cur === index + 1) return 'failed';
    if (cur > index + 1) return 'complete';
    return 'pending';
  }
  if (job?.status === 'done') {
    return 'complete';
  }
  if (job?.status === 'running') {
    if (cur > index + 1) return 'complete';
    if (cur === index + 1) return 'processing';
    return 'pending';
  }
  return 'pending';
}

function BulkQueueRows({ labels, job, jobKind }) {
  if (!labels.length) return null;
  return (
    <div
      style={{
        marginTop: 12,
        border: `1px solid ${border}`,
        borderRadius: 10,
        overflow: 'hidden',
        background: cardBg,
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          background: '#f1f5f9',
          fontWeight: 700,
          fontSize: 13,
          color: navy,
        }}
      >
        {jobKind === 'pdf' ? 'Files' : 'Rows'} ({labels.length})
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 280, overflow: 'auto' }}>
        {labels.map((label, i) => {
          const st = deriveLineStatus(i, job);
          const dot =
            st === 'complete'
              ? { bg: '#22c55e', label: 'Complete' }
              : st === 'processing'
                ? { bg: '#3b82f6', label: 'Processing' }
                : st === 'failed'
                  ? { bg: '#ea580c', label: 'Failed' }
                  : { bg: '#94a3b8', label: 'Pending' };
          const pct = st === 'processing' ? 55 : st === 'complete' ? 100 : st === 'failed' ? 100 : 0;
          return (
            <li
              key={`${label}-${i}`}
              style={{
                padding: '10px 14px',
                borderBottom: i < labels.length - 1 ? `1px solid ${border}` : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 10,
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ marginTop: 6, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: dot.bg,
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: dot.bg,
                  whiteSpace: 'nowrap',
                }}
              >
                {dot.label}
              </span>
            </li>
          );
        })}
      </ul>
      {job?.status === 'done' && (
        <p style={{ margin: 0, padding: '10px 14px', fontSize: 12, color: '#64748b', background: '#f8fafc' }}>
          Per-file outcomes are also listed in <code>processing_report.txt</code> inside the ZIP.
        </p>
      )}
    </div>
  );
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
  const [fieldErrors, setFieldErrors] = useState({
    patientName: '',
    providerName: '',
    providerNpi: '',
  });
  const [singleStep, setSingleStep] = useState(0);
  const [bulkStep, setBulkStep] = useState(0);
  const profileSnapshotRef = useRef(null);
  const [codingAccordionOpen, setCodingAccordionOpen] = useState(false);
  const intelDebounceRef = useRef(null);
  const firstGapRef = useRef(null);

  const advanceSingle = (next) => {
    setSingleStep(next);
  };

  const mergeProfileSnapshotIntoIntake = useCallback(() => {
    const p = profileSnapshotRef.current;
    if (!p) return;
    setIntake((s) => ({
      ...s,
      ...(p.providerName && !s.providerName?.trim() ? { providerName: p.providerName } : {}),
      ...(p.providerNpi && !s.providerNpi?.trim() ? { providerNpi: p.providerNpi } : {}),
      ...(p.providerAddress && !s.providerAddress?.trim() ? { providerAddress: p.providerAddress } : {}),
      ...(p.providerPhone && !s.providerPhone?.trim() ? { providerPhone: p.providerPhone } : {}),
      ...(p.providerFax && !s.providerFax?.trim() ? { providerFax: p.providerFax } : {}),
    }));
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/user/profile');
        if (cancelled) return;
        const pn = (data?.provider_name || '').trim();
        const npi = (data?.provider_npi || '').trim();
        const addr = (data?.provider_address || '').trim();
        const ph = (data?.provider_phone || '').trim();
        const fx = (data?.provider_fax || '').trim();
        profileSnapshotRef.current = {
          providerName: pn,
          providerNpi: npi,
          providerAddress: addr,
          providerPhone: ph,
          providerFax: fx,
        };
        setIntake((s) => ({
          ...s,
          ...(pn && !s.providerName?.trim() ? { providerName: pn } : {}),
          ...(npi && !s.providerNpi?.trim() ? { providerNpi: npi } : {}),
          ...(addr && !s.providerAddress?.trim() ? { providerAddress: addr } : {}),
          ...(ph && !s.providerPhone?.trim() ? { providerPhone: ph } : {}),
          ...(fx && !s.providerFax?.trim() ? { providerFax: fx } : {}),
        }));
      } catch {
        /* not logged in or profile unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
    if (singleStep !== 1) return;
    const t = window.setTimeout(() => {
      try {
        firstGapRef.current?.focus?.();
      } catch {
        /* ignore */
      }
    }, 100);
    return () => clearTimeout(t);
  }, [singleStep]);

  const runPreview = useCallback(async () => {
    const payload = serializeIntakeForBackend(intake);
    const payer = (intake.payer || '').trim() || 'Unknown payer';
    const claimNum = (intake.claimNumber || '').trim();
    const pasteSupplement = mode === 'paste' && pasteText.trim() ? pasteText.trim().slice(0, 15000) : '';
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
    setFieldErrors({ patientName: '', providerName: '', providerNpi: '' });
    setSingleStep(0);
    setBulkStep(0);
    setCodingAccordionOpen(false);
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
        setBulkStep(1);
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
      mergeProfileSnapshotIntoIntake();
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
      mergeProfileSnapshotIntoIntake();
      setExtractedMeta({
        kind: 'pdf',
        confidence: data.confidence || 'medium',
        claim_number: data.claim_number,
        payer_name: data.payer_name,
        warning: data.warning,
      });
    } catch (ex) {
      const msg = ex.response?.data?.message || ex.response?.data?.error || ex.message || 'Extraction failed';
      setErr(msg);
      setExtractedMeta({ kind: 'error', message: msg });
      setFieldConfidence({});
    } finally {
      setExtracting(false);
    }
  };

  const runPasteExtract = async () => {
    const t = pasteText.trim();
    setExtracting(true);
    setErr('');
    try {
      const { data } = await api.post('/api/parse/denial-text', { text: t });
      if (data.success === false && data.error) {
        throw new Error(data.message || data.error);
      }
      applyExtractionData(data);
      mergeProfileSnapshotIntoIntake();
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
  };

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
    e?.preventDefault?.();
    setErr('');
    const fe = {
      patientName: !(intake.patientName || '').trim() ? 'Patient name is required.' : '',
      providerName: !(intake.providerName || '').trim() ? 'Provider or practice name is required.' : '',
      providerNpi: !(intake.providerNpi || '').trim() ? 'Provider NPI is required.' : '',
    };
    setFieldErrors(fe);
    const v = validate();
    if (fe.patientName || fe.providerName || fe.providerNpi || v) {
      if (v) setErr(v);
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

  const extractedReady = !extracting && (extractedMeta?.kind === 'pdf' || extractedMeta?.kind === 'text');

  const step2Fields = useMemo(() => {
    const order = [
      { key: 'claimNumber', label: 'Claim number', type: 'text', fc: 'claimNumber' },
      { key: 'dateOfService', label: 'Date of service', type: 'date', fc: 'dateOfService' },
      { key: 'payer', label: 'Payer', type: 'payer', fc: 'payer' },
      { key: 'patientName', label: 'Patient name', type: 'text', fc: null },
    ];
    const firstGapKey =
      order.find((f) => (f.fc ? fieldConfidence[f.fc] === 'low' : !(intake[f.key] || '').trim()))?.key ||
      null;
    return { order, firstGapKey };
  }, [fieldConfidence, intake]);

  const showStep3Carc = !(intake.carcCodes || []).length || fieldConfidence.carcCodes === 'low';
  const showStep3Rarc = !(intake.rarcCodes || []).length || fieldConfidence.rarcCodes === 'low';
  const showStep3Cpt = !(intake.cptCodes || []).length || fieldConfidence.cptCodes === 'low';
  const showStep3Mod = !(intake.modifiers || '').trim() || fieldConfidence.modifiers === 'low';
  const showStep3Icd = !(intake.icdCodes || []).length || fieldConfidence.icdCodes === 'low';
  const showStep3Billed =
    !(intake.billedAmount || '').trim() || fieldConfidence.billedAmount === 'low';
  const showStep3Paid = !(intake.paidAmount || '').trim() || fieldConfidence.paidAmount === 'low';
  const showStep3ProviderName = !(intake.providerName || '').trim();
  const showStep3ProviderNpi = !(intake.providerNpi || '').trim();
  const showStep3Addr = !(intake.providerAddress || '').trim();
  const showStep3Phone = !(intake.providerPhone || '').trim();
  const showStep3Fax = !(intake.providerFax || '').trim();
  const showStep3Patient = !(intake.patientName || '').trim();

  const inputBase = {
    width: '100%',
    boxSizing: 'border-box',
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    fontSize: 15,
  };

  const ctaButton = (disabled, loadingLabel, label) => ({
    width: '100%',
    padding: 16,
    background: disabled ? '#94a3b8' : primaryCta,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 16,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 8,
    transition: 'background 0.15s ease',
  });

  const handleStepperBack = (idx) => {
    setSingleStep(idx);
  };

  const onSingleStep1Next = async () => {
    setErr('');
    if (mode === 'upload') {
      if (!file) {
        setErr('Choose or drop a denial letter or EOB file first.');
        return;
      }
      await runPdfExtract(file);
      advanceSingle(1);
      return;
    }
    if (mode === 'paste') {
      if (pasteText.trim().length < 20) {
        setErr('Paste a bit more denial text so we can extract details.');
        return;
      }
      await runPasteExtract();
      advanceSingle(1);
    }
  };

  if (!mode) {
    return (
      <div
        style={{
          background: pageBg,
          minHeight: 'calc(100vh - 60px)',
          fontFamily: '"Inter", system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 48px' }}>
          <h1
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 800,
              color: navy,
              margin: '0 0 12px',
              lineHeight: 1.2,
            }}
          >
            Start an appeal
          </h1>
          <p style={{ fontSize: 17, color: '#475569', margin: '0 0 28px', lineHeight: 1.5 }}>
            Choose a single claim or a bulk workflow — same engine, different throughput.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                background: cardBg,
                borderRadius: 14,
                padding: 22,
                border: `1px solid ${border}`,
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
              }}
            >
              <p
                style={{
                  margin: '0 0 16px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#64748b',
                  letterSpacing: '0.06em',
                }}
              >
                SINGLE CLAIM
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIntake(emptyIntake());
                    setFieldConfidence({});
                    setSingleStep(0);
                    setMode('upload');
                  }}
                  style={{
                    textAlign: 'left',
                    border: `2px solid ${primaryCta}`,
                    borderRadius: 12,
                    padding: '20px 18px',
                    cursor: 'pointer',
                    background: softBlue,
                    minHeight: 100,
                  }}
                >
                  <strong style={{ fontSize: 18, color: navy, display: 'block', marginBottom: 8 }}>
                    Upload denial letter or EOB
                  </strong>
                  <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.45 }}>
                    PDF, PNG, or JPG — we extract claim details before you confirm
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIntake(emptyIntake());
                    setFieldConfidence({});
                    setSingleStep(0);
                    setMode('paste');
                  }}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: '18px 16px',
                    cursor: 'pointer',
                    background: cardBg,
                  }}
                >
                  <strong style={{ fontSize: 17, color: navy, display: 'block', marginBottom: 6 }}>
                    Paste denial / EOB text
                  </strong>
                  <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.45 }}>
                    From your billing system or payer portal
                  </div>
                </button>
              </div>
            </div>

            <div
              style={{
                background: cardBg,
                borderRadius: 14,
                padding: 22,
                border: `1px solid ${border}`,
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
              }}
            >
              <p
                style={{
                  margin: '0 0 16px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#64748b',
                  letterSpacing: '0.06em',
                }}
              >
                BULK PROCESSING
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                <label
                  style={{
                    display: 'block',
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: '18px 16px',
                    cursor: extracting ? 'wait' : 'pointer',
                    background: cardBg,
                  }}
                >
                  <strong style={{ fontSize: 17, color: navy, display: 'block', marginBottom: 6 }}>
                    Upload CSV or Excel
                  </strong>
                  <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.45, marginBottom: 10 }}>
                    Multiple denied claims in one spreadsheet
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
                    setBulkStep(0);
                    setMode('bulkPdf');
                  }}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: '18px 16px',
                    cursor: 'pointer',
                    background: cardBg,
                  }}
                >
                  <strong style={{ fontSize: 17, color: navy, display: 'block', marginBottom: 6 }}>
                    Upload multiple denial PDFs
                  </strong>
                  <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.45 }}>
                    Up to 100 files — extraction and appeals packaged in one ZIP
                  </div>
                </button>
              </div>
            </div>
          </div>

          {extracting && (
            <p style={{ marginTop: 20, color: navy, fontWeight: 600, fontSize: 15 }}>Reading file…</p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'bulkPdf') {
    const labels = bulkPdfFiles.map((f) => f.name);
    return (
      <div
        style={{
          background: pageBg,
          minHeight: 'calc(100vh - 60px)',
          fontFamily: '"Inter", system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 48px' }}>
          <IntakeStepper
            steps={BULK_STEPS}
            activeIndex={bulkStep}
            onStepClick={(i) => {
              if (i < bulkStep) setBulkStep(i);
            }}
          />
          <button
            type="button"
            onClick={resetIntake}
            style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: navy, fontSize: 15, fontWeight: 600 }}
          >
            ← Back
          </button>
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Bulk PDF denials</h1>
            <p style={{ fontSize: 15, color: '#475569', marginBottom: 18 }}>
              Log in required. Each successful appeal uses your plan credits. Failed extractions are skipped and listed in{' '}
              <code style={{ fontSize: 13 }}>processing_report.txt</code> inside the ZIP.
            </p>

            {!token && (
              <p style={{ color: '#c2410c', fontWeight: 600, marginBottom: 14, fontSize: 14 }}>
                Sign in to run bulk PDF processing and download your appeals ZIP.
              </p>
            )}

            {bulkStep === 0 && (
              <>
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
                    border: `2px dashed ${bulkDrag ? primaryCta : border}`,
                    borderRadius: 12,
                    padding: 28,
                    textAlign: 'center',
                    background: bulkDrag ? softBlue : pageBg,
                    marginBottom: 16,
                  }}
                >
                  <p style={{ margin: '0 0 10px', fontWeight: 700, color: navy }}>Drag & drop PDF denial letters here</p>
                  <input type="file" accept=".pdf,application/pdf" multiple style={{ fontSize: 14 }} onChange={(e) => addBulkPdfFiles(e.target.files)} />
                </div>
                {bulkPdfFiles.length > 0 && (
                  <p style={{ fontSize: 14, color: '#64748b', marginBottom: 10 }}>
                    {bulkPdfFiles.length} PDF{bulkPdfFiles.length === 1 ? '' : 's'} selected (max 100)
                  </p>
                )}
                <button
                  type="button"
                  disabled={!bulkPdfFiles.length}
                  onClick={() => setBulkStep(1)}
                  style={{
                    ...ctaButton(!bulkPdfFiles.length, false, ''),
                    marginTop: 0,
                    background: !bulkPdfFiles.length ? '#94a3b8' : navy,
                  }}
                >
                  Continue to processing queue
                </button>
              </>
            )}

            {bulkStep === 1 && (
              <>
                <BulkQueueRows labels={labels} job={bulkJob} jobKind="pdf" />
                {!bulkProcessing && bulkDoneJobId && bulkJob?.status === 'done' && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 16,
                      background: '#f0fdf4',
                      border: `1px solid ${extractedBorder}`,
                      borderRadius: 10,
                    }}
                  >
                    <p style={{ margin: '0 0 12px', fontWeight: 800, color: '#14532d', fontSize: 17 }}>
                      {bulkJob.ok_count ?? 0} appeals generated
                    </p>
                    <button
                      type="button"
                      onClick={() => downloadBatchZip(bulkDoneJobId)}
                      style={{
                        padding: '12px 20px',
                        fontWeight: 800,
                        fontSize: 15,
                        background: primaryCta,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = primaryCtaHover;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = primaryCta;
                      }}
                    >
                      Download ZIP
                    </button>
                  </div>
                )}
                {batchMsg && <p style={{ fontSize: 14, color: '#475569', marginTop: 12 }}>{batchMsg}</p>}
                {err && <p style={{ color: '#c2410c', fontWeight: 600, marginTop: 12, fontSize: 14 }}>{err}</p>}
                {bulkProcessing && (
                  <p style={{ marginTop: 12, fontSize: 14, color: '#475569' }}>
                    Overall progress: {bulkJob?.current ?? 0} / {bulkJob?.total ?? labels.length} files
                  </p>
                )}
                <button
                  type="button"
                  disabled={!token || !bulkPdfFiles.length || bulkProcessing}
                  onClick={runPdfBulkAppeals}
                  style={{
                    width: '100%',
                    padding: 16,
                    marginTop: 16,
                    background: !token || !bulkPdfFiles.length || bulkProcessing ? '#94a3b8' : primaryCta,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: !token || !bulkPdfFiles.length || bulkProcessing ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!token || !bulkPdfFiles.length || bulkProcessing) return;
                    e.target.style.background = primaryCtaHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!token || !bulkPdfFiles.length || bulkProcessing) return;
                    e.target.style.background = primaryCta;
                  }}
                >
                  {bulkProcessing ? 'Processing…' : 'Generate all appeals (ZIP)'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'csv') {
    const rowLabels = csvRows.map((row, i) => row.claim_number || `Row ${i + 1}`);
    return (
      <div style={{ background: pageBg, minHeight: 'calc(100vh - 60px)', fontFamily: '"Inter", system-ui, sans-serif' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 48px' }}>
          <IntakeStepper
            steps={BULK_STEPS}
            activeIndex={bulkStep}
            onStepClick={(i) => {
              if (i < bulkStep) setBulkStep(i);
            }}
          />
          <button
            type="button"
            onClick={resetIntake}
            style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: navy, fontSize: 15, fontWeight: 600 }}
          >
            ← Back
          </button>
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Bulk spreadsheet intake</h1>
            {bulkStep === 0 && (
              <label style={{ display: 'block', marginTop: 12 }}>
                <strong style={{ fontSize: 15, color: navy }}>Upload CSV or Excel</strong>
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  disabled={extracting}
                  style={{ display: 'block', marginTop: 8, fontSize: 14 }}
                  onChange={handleCsvOrExcel}
                />
              </label>
            )}
            {bulkStep === 1 && csvRows.length > 0 && (
              <>
                {csvFile && (
                  <p style={{ fontSize: 13, color: '#64748b', margin: '12px 0 8px' }}>
                    File: <strong>{csvFile.name}</strong>
                  </p>
                )}
                <div style={{ fontWeight: 800, color: navy, marginBottom: 8 }}>
                  {csvRows.length} claim{csvRows.length === 1 ? '' : 's'} loaded
                </div>
                <BulkQueueRows labels={rowLabels} job={bulkJob} jobKind="csv" />
                <div style={{ overflowX: 'auto', maxHeight: 200, border: `1px solid ${border}`, borderRadius: 8, background: cardBg, marginTop: 12 }}>
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
                            background: selectedCsvRow === i ? softBlue : cardBg,
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
                        background: loading || bulkProcessing ? '#94a3b8' : primaryCta,
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
                        background: cardBg,
                        border: `2px solid ${navy}`,
                        color: navy,
                        borderRadius: 8,
                        cursor: loading || bulkProcessing ? 'wait' : 'pointer',
                      }}
                    >
                      Import all to denial queue
                    </button>
                  </div>
                )}
                {!token && (
                  <p style={{ fontSize: 13, marginTop: 10, color: '#c2410c', fontWeight: 600 }}>
                    Sign in to generate all appeals as PDFs in one ZIP (up to {csvRows.length} rows).
                  </p>
                )}
                {!bulkProcessing && bulkDoneJobId && bulkJob?.status === 'done' && (
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => downloadBatchZip(bulkDoneJobId)}
                      style={{
                        padding: '12px 18px',
                        fontWeight: 800,
                        background: primaryCta,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      Download ZIP
                    </button>
                  </div>
                )}
                {batchMsg && <p style={{ fontSize: 13, marginTop: 8, color: '#64748b' }}>{batchMsg}</p>}
                {err && <p style={{ color: '#c2410c', fontWeight: 600, marginTop: 8 }}>{err}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: pageBg, minHeight: 'calc(100vh - 60px)', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 48px' }}>
        <IntakeStepper
          steps={SINGLE_STEPS}
          activeIndex={singleStep}
          onStepClick={(i) => i < singleStep && handleStepperBack(i)}
        />
        <button
          type="button"
          onClick={resetIntake}
          style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: navy, fontSize: 15, fontWeight: 600 }}
        >
          ← Back
        </button>

        {singleStep === 0 && (
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Step 1 — Upload</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 18 }}>
              Add your denial once. We&apos;ll extract details on the next step.
            </p>
            {mode === 'upload' && (
              <div style={{ marginBottom: 8 }}>
                <DenialDocumentDropZone
                  accept=".pdf,.png,.jpg,.jpeg"
                  onFile={(f) => {
                    setFile(f);
                    setExtractedMeta(null);
                    setErr('');
                  }}
                  disabled={extracting}
                  inputId="onboarding-denial-letter-file"
                  onPasteText={(text) => {
                    setMode('paste');
                    setPasteText(text);
                    setFile(null);
                  }}
                >
                  <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                    <strong style={{ color: navy, fontSize: 15 }}>Drag, drop, or paste your denial here</strong>
                    <p style={{ margin: '8px 0 4px', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
                      Paste text, screenshot, or PDF — we&apos;ll extract on Continue
                    </p>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>PDF, PNG, or JPG · max 10MB on server</span>
                  </div>
                </DenialDocumentDropZone>
              </div>
            )}
            {mode === 'paste' && (
              <div>
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
            {extracting && (
              <p style={{ marginTop: 14, color: navy, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                <style>{`@keyframes dapSpin { to { transform: rotate(360deg); } }`}</style>
                <span
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    border: '2px solid #bbf7d0',
                    borderTopColor: primaryCta,
                    borderRadius: '50%',
                    animation: 'dapSpin 0.8s linear infinite',
                  }}
                />
                Extracting claim details…
              </p>
            )}
            {err && <p style={{ color: '#c2410c', fontWeight: 600, marginTop: 12, fontSize: 14 }}>{err}</p>}
            <button
              type="button"
              disabled={extracting}
              onClick={onSingleStep1Next}
              style={ctaButton(extracting, false, '')}
              onMouseEnter={(e) => {
                if (extracting) return;
                e.target.style.background = primaryCtaHover;
              }}
              onMouseLeave={(e) => {
                if (extracting) return;
                e.target.style.background = primaryCta;
              }}
            >
              {extracting ? 'Please wait…' : 'Next — extract & review'}
            </button>
          </div>
        )}

        {singleStep === 1 && (
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Step 2 — Review extraction</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Confirmed fields are highlighted in green. Gaps use an orange edge — edit anything inline.
            </p>
            {extractedReady && extractedMeta?.warning && (
              <div
                style={{
                  border: '1px solid #fde047',
                  background: '#fef9c3',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 14,
                  fontSize: 14,
                  color: '#854d0e',
                  fontWeight: 600,
                }}
              >
                {extractedMeta.warning}
              </div>
            )}
            {extractedMeta && extractedMeta.kind === 'image' && (
              <div
                style={{
                  border: `1px solid ${orangeBorder}`,
                  background: orangeBg,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16,
                  fontSize: 14,
                  color: '#9a3412',
                }}
              >
                {extractedMeta.message}
              </div>
            )}
            {extractedMeta && extractedMeta.kind === 'error' && (
              <div
                style={{
                  border: `1px solid ${orangeBorder}`,
                  background: orangeBg,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16,
                  fontSize: 14,
                  color: '#9a3412',
                }}
              >
                {extractedMeta.message} — continue and fill details in the next steps.
              </div>
            )}
            {extractedMeta && extractedMeta.kind === 'text_error' && (
              <div
                style={{
                  border: '1px solid #fde047',
                  background: '#fef9c3',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16,
                  fontSize: 14,
                  color: '#854d0e',
                }}
              >
                {extractedMeta.message}
              </div>
            )}
            {(extractedMeta?.kind === 'pdf' || extractedMeta?.kind === 'text') && !extracting && (
              <div
                style={{
                  border: `1px solid ${extractedBorder}`,
                  background: '#f0fdf4',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16,
                  fontSize: 14,
                  color: '#14532d',
                }}
              >
                <strong>Extracted preview:</strong> {extractedMeta.payer_name || '—'} · Claim {extractedMeta.claim_number || '—'} ·
                Confidence: {extractedMeta.confidence || '—'}
              </div>
            )}
            {step2Fields.order.map((f) => {
              const fcKey = f.fc;
              const hasVal = !!(intake[f.key] || '').toString().trim();
              const confirmed = fcKey ? fieldConfidence[fcKey] !== 'low' && hasVal : hasVal;
              const needsAttention = fcKey
                ? fieldConfidence[fcKey] === 'low' || !hasVal
                : !hasVal;
              const borderLeft = confirmed ? `3px solid ${extractedBorder}` : needsAttention ? `3px solid ${orangeBorder}` : `3px solid ${border}`;
              const isFirstGap = f.key === step2Fields.firstGapKey;
              return (
                <label key={f.key} style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: navy, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {f.label}
                    {confirmed ? (
                      <span style={{ color: primaryCta, fontSize: 12 }} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </span>
                  {f.type === 'payer' ? (
                    <input
                      ref={isFirstGap ? firstGapRef : undefined}
                      list="payer-suggestions"
                      value={intake.payer}
                      onChange={(e) => setIntake((s) => ({ ...s, payer: e.target.value }))}
                      placeholder="Start typing…"
                      title={fieldConfidence.payer === 'low' ? VERIFY_TOOLTIP : undefined}
                      style={{
                        ...inputBase,
                        border: needsAttention ? `1px solid ${orangeBorder}` : `1px solid ${border}`,
                        borderLeft,
                        backgroundColor: needsAttention ? orangeBg : cardBg,
                      }}
                    />
                  ) : (
                    <input
                      ref={isFirstGap ? firstGapRef : undefined}
                      type={f.type === 'date' ? 'date' : 'text'}
                      value={intake[f.key]}
                      onChange={(e) => setIntake((s) => ({ ...s, [f.key]: e.target.value }))}
                      title={fcKey && fieldConfidence[fcKey] === 'low' ? VERIFY_TOOLTIP : undefined}
                      style={{
                        ...inputBase,
                        border: needsAttention ? `1px solid ${orangeBorder}` : `1px solid ${border}`,
                        borderLeft,
                        backgroundColor: needsAttention ? orangeBg : cardBg,
                      }}
                    />
                  )}
                </label>
              );
            })}
            <datalist id="payer-suggestions">
              {PAYER_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => advanceSingle(2)}
              style={ctaButton(false, false, '')}
              onMouseEnter={(e) => {
                e.target.style.background = primaryCtaHover;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = primaryCta;
              }}
            >
              Looks good — next
            </button>
          </div>
        )}

        {singleStep === 2 && (
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Step 3 — Confirm details</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Only fields that still need you are shown. Provider profile values are filled automatically when saved on your account.
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              {showStep3Patient && (
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>
                    Patient name <span style={{ color: '#c2410c' }} aria-hidden="true">*</span>
                  </span>
                  <input
                    value={intake.patientName}
                    onChange={(e) => {
                      setFieldErrors((fe) => ({ ...fe, patientName: '' }));
                      setIntake((s) => ({ ...s, patientName: e.target.value }));
                    }}
                    placeholder="Jane Doe"
                    style={{ ...inputBase, border: fieldErrors.patientName ? '1px solid #dc2626' : `1px solid ${border}` }}
                  />
                  {fieldErrors.patientName ? (
                    <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{fieldErrors.patientName}</div>
                  ) : null}
                </label>
              )}
              {showStep3Carc && (
                <CodeMultiInput
                  id="carc-codes"
                  label="CARC code(s)"
                  values={intake.carcCodes}
                  onChange={(v) => setIntake((s) => ({ ...s, carcCodes: v }))}
                  placeholder="e.g. 50 — Enter"
                  lowConfidence={fieldConfidence.carcCodes === 'low'}
                />
              )}
              {showStep3Rarc && (
                <CodeMultiInput
                  id="rarc-codes"
                  label="RARC / remark code(s)"
                  values={intake.rarcCodes}
                  onChange={(v) => setIntake((s) => ({ ...s, rarcCodes: v }))}
                  placeholder="e.g. N115 — Enter"
                  lowConfidence={fieldConfidence.rarcCodes === 'low'}
                />
              )}
              {showStep3Cpt && (
                <CodeMultiInput
                  id="cpt-codes"
                  label="CPT / HCPCS"
                  values={intake.cptCodes}
                  onChange={(v) => setIntake((s) => ({ ...s, cptCodes: v }))}
                  placeholder="Code — Enter"
                  lowConfidence={fieldConfidence.cptCodes === 'low'}
                />
              )}
              {showStep3Mod && (
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Modifiers</span>
                  <input
                    value={intake.modifiers}
                    onChange={(e) => setIntake((s) => ({ ...s, modifiers: e.target.value }))}
                    placeholder="-25, -59, -24"
                    style={{ ...inputBase, border: `1px solid ${border}` }}
                  />
                </label>
              )}
              {showStep3Icd && (
                <CodeMultiInput
                  id="icd-codes"
                  label="ICD-10 code(s)"
                  values={intake.icdCodes}
                  onChange={(v) => setIntake((s) => ({ ...s, icdCodes: v }))}
                  placeholder="ICD-10 — Enter"
                  lowConfidence={fieldConfidence.icdCodes === 'low'}
                  highlightCodes={intelligence?.coding?.weakIcdCodes || []}
                />
              )}
              {showStep3Billed && (
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Billed amount ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={intake.billedAmount}
                    onChange={(e) => setIntake((s) => ({ ...s, billedAmount: e.target.value }))}
                    title={fieldConfidence.billedAmount === 'low' ? VERIFY_TOOLTIP : undefined}
                    style={{ ...inputBase, border: `1px solid ${border}` }}
                  />
                </label>
              )}
              {showStep3Paid && (
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Paid amount ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={intake.paidAmount}
                    onChange={(e) => setIntake((s) => ({ ...s, paidAmount: e.target.value }))}
                    title={fieldConfidence.paidAmount === 'low' ? VERIFY_TOOLTIP : undefined}
                    style={{ ...inputBase, border: `1px solid ${border}` }}
                  />
                </label>
              )}
              {(showStep3ProviderName || showStep3ProviderNpi || showStep3Addr || showStep3Phone || showStep3Fax) && (
                <fieldset style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 14, margin: 0 }}>
                  <legend style={{ fontWeight: 800, color: navy, padding: '0 8px', fontSize: 13 }}>Provider (from profile or enter missing)</legend>
                  {showStep3ProviderName && (
                    <label style={{ display: 'block', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Provider or practice name *</span>
                      <input
                        value={intake.providerName}
                        onChange={(e) => {
                          setFieldErrors((fe) => ({ ...fe, providerName: '' }));
                          setIntake((s) => ({ ...s, providerName: e.target.value }));
                        }}
                        style={{ ...inputBase, border: fieldErrors.providerName ? '1px solid #dc2626' : `1px solid ${border}` }}
                      />
                      {fieldErrors.providerName ? (
                        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{fieldErrors.providerName}</div>
                      ) : null}
                    </label>
                  )}
                  {showStep3ProviderNpi && (
                    <label style={{ display: 'block', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Provider NPI *</span>
                      <input
                        value={intake.providerNpi}
                        onChange={(e) => {
                          setFieldErrors((fe) => ({ ...fe, providerNpi: '' }));
                          setIntake((s) => ({ ...s, providerNpi: e.target.value }));
                        }}
                        style={{ ...inputBase, border: fieldErrors.providerNpi ? '1px solid #dc2626' : `1px solid ${border}` }}
                      />
                      {fieldErrors.providerNpi ? (
                        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{fieldErrors.providerNpi}</div>
                      ) : null}
                    </label>
                  )}
                  {showStep3Addr && (
                    <label style={{ display: 'block', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Provider address</span>
                      <input
                        value={intake.providerAddress || ''}
                        onChange={(e) => setIntake((s) => ({ ...s, providerAddress: e.target.value }))}
                        style={{ ...inputBase, border: `1px solid ${border}` }}
                      />
                    </label>
                  )}
                  {showStep3Phone && (
                    <label style={{ display: 'block', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Provider phone</span>
                      <input
                        value={intake.providerPhone || ''}
                        onChange={(e) => setIntake((s) => ({ ...s, providerPhone: e.target.value }))}
                        style={{ ...inputBase, border: `1px solid ${border}` }}
                      />
                    </label>
                  )}
                  {showStep3Fax && (
                    <label style={{ display: 'block' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: navy }}>Provider fax</span>
                      <input
                        value={intake.providerFax || ''}
                        onChange={(e) => setIntake((s) => ({ ...s, providerFax: e.target.value }))}
                        style={{ ...inputBase, border: `1px solid ${border}` }}
                      />
                    </label>
                  )}
                </fieldset>
              )}
            </div>

            <details
              open={codingAccordionOpen}
              onToggle={(e) => setCodingAccordionOpen(e.target.open)}
              style={{ marginTop: 18, border: `1px solid ${border}`, borderRadius: 10, padding: '4px 12px', background: pageBg }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 800, color: navy, padding: '10px 4px', listStyle: 'none' }}>
                Coding insights (optional)
              </summary>
              <div style={{ paddingBottom: 12 }}>
                {(intake.carcCodes.length > 0 || intake.rarcCodes.length > 0) && (
                  <div
                    style={{
                      background: pageBg,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      fontSize: 14,
                      border: `1px solid ${border}`,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: navy, marginBottom: 6 }}>Detected denial type: {categoryInfo.category}</div>
                    <div style={{ color: '#475569' }}>{categoryInfo.explanation}</div>
                  </div>
                )}
                {(intake.carcCodes.length > 0 || intake.rarcCodes.length > 0) && (
                  <div
                    style={{
                      background: '#fef9c3',
                      border: `1px solid ${disclaimerBorder}`,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: navy, marginBottom: 8 }}>Appeal strategy hints</div>
                    <ul style={{ margin: 0, paddingLeft: 20, color: '#422006' }}>
                      {strategies.map((st) => (
                        <li key={st} style={{ marginBottom: 4 }}>
                          {st}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <CodingIntelligencePanel analysis={intelligence} loading={intelligenceLoading} onApplyModifier={appendModifierToIntake} />
              </div>
            </details>

            {err && <p style={{ color: '#c2410c', fontSize: 14, fontWeight: 600, marginTop: 12 }}>{err}</p>}
            <button
              type="button"
              onClick={() => advanceSingle(3)}
              style={{ ...ctaButton(false, false, ''), marginTop: 16 }}
              onMouseEnter={(e) => {
                e.target.style.background = primaryCtaHover;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = primaryCta;
              }}
            >
              Next — review & generate
            </button>
          </div>
        )}

        {singleStep === 3 && (
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}`, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 16 }}>Step 4 — Generate</h1>
            <div
              style={{
                textAlign: 'left',
                background: pageBg,
                borderRadius: 10,
                padding: 16,
                marginBottom: 20,
                fontSize: 14,
                color: '#334155',
                lineHeight: 1.5,
                border: `1px solid ${border}`,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8, color: navy }}>Claim summary</div>
              <div>
                <strong>Claim #:</strong> {intake.claimNumber || '—'}
              </div>
              <div>
                <strong>Date of service:</strong> {intake.dateOfService || '—'}
              </div>
              <div>
                <strong>Payer:</strong> {intake.payer || '—'}
              </div>
              <div>
                <strong>Patient:</strong> {intake.patientName || '—'}
              </div>
              <div>
                <strong>Provider:</strong> {intake.providerName || '—'} (NPI {intake.providerNpi || '—'})
              </div>
              <div>
                <strong>CARC / RARC:</strong> {(intake.carcCodes || []).join(', ') || '—'} / {(intake.rarcCodes || []).join(', ') || '—'}
              </div>
              <div>
                <strong>CPT / ICD:</strong> {(intake.cptCodes || []).join(', ') || '—'} / {(intake.icdCodes || []).join(', ') || '—'}
              </div>
              <div>
                <strong>Billed / paid:</strong> ${intake.billedAmount || '0'} / ${intake.paidAmount || '0'}
              </div>
              <div style={{ marginTop: 8, fontWeight: 700, color: '#15803d' }}>
                Est. recovery: ${recoveryAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            {fieldErrors.patientName ? (
              <p style={{ color: '#c2410c', fontSize: 14, marginBottom: 12 }}>{fieldErrors.patientName}</p>
            ) : null}
            <button
              type="button"
              disabled={loading || extracting}
              onClick={submit}
              style={{
                width: '100%',
                maxWidth: 420,
                margin: '0 auto',
                display: 'block',
                padding: '18px 24px',
                background: loading || extracting ? '#94a3b8' : primaryCta,
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 17,
                cursor: loading || extracting ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (loading || extracting) return;
                e.target.style.background = primaryCtaHover;
              }}
              onMouseLeave={(e) => {
                if (loading || extracting) return;
                e.target.style.background = primaryCta;
              }}
            >
              {loading ? 'Generating…' : 'Generate submission-ready appeal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
