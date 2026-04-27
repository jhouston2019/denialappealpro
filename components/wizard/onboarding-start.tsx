// @ts-nocheck — ported from CRA; tighten types incrementally
'use client';

import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api-client';
import {
  PAGE_BG_SLATE,
  TEXT_ON_SLATE,
  TEXT_MUTED_ON_SLATE,
  BORDER_MUTED,
  PRIMARY_GREEN,
  PRIMARY_GREEN_HOVER,
  DISABLED_SLATE,
  CARD_WHITE,
} from '@/lib/theme/app-shell';
import { useAuth } from '@/hooks/use-auth';
import CodeMultiInput from '@/components/wizard/code-multi-input';
import CodingIntelligencePanel from '@/components/wizard/coding-intelligence-panel';
import DenialDocumentDropZone from '@/components/wizard/denial-document-drop-zone';
import IntakeStepper from '@/components/wizard/intake-stepper';
import {
  parseCsvText,
  parseExcelFile,
  rowToStructuredIntake,
  rowsToBatchPayload,
  rowsToWorkerBatchPayload,
} from '@/lib/wizard/intake-csv';
import {
  emptyIntake,
  getDenialCategoryFromCodes,
  mapDenialToStrategy,
  serializeIntakeForBackend,
  normalizeIcdCodesFromExtract,
  PAYER_SUGGESTIONS,
  normalizeCarcToken,
} from '@/lib/wizard/denial-intake-engine';
import {
  DAP_PREVIEW_PAYLOAD_KEY,
  DAP_PRACTICE_PROFILE_KEY,
  DAP_WIZARD_RESUME_KEY,
  snapshotIntakeFromWizard,
} from '@/lib/dap/preview-flow';
import { applyPracticeToDapPreviewPayload } from '@/lib/dap/apply-practice-to-preview-payload';

const navy = '#0f172a';
const border = '#e2e8f0';
const softBlue = '#eff6ff';
const pageBg = PAGE_BG_SLATE;
const cardBg = CARD_WHITE;
const primaryCta = PRIMARY_GREEN;
const primaryCtaHover = PRIMARY_GREEN_HOVER;
const extractedBorder = '#bbf7d0';
const orangeBorder = '#fb923c';
const orangeBg = '#fff7ed';
const disclaimerBorder = '#fde047';

const VERIFY_TOOLTIP = 'Please verify this field';

const STEP1_EXTRACTION_FAILED_MSG =
  'Extraction failed — please check your file and try again.';

const FLASK_URL = process.env.NEXT_PUBLIC_FLASK_API_URL;

/** Safe string for profile text fields (API may return numbers). */
function profileTextField(v) {
  if (v == null || v === '') return '';
  return String(v).trim();
}

/** True only for exactly 10 digits (ignores formatting characters). */
function isValidNpi10Digits(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.length === 10;
}

/** Normalize saved profile NPI; reject placeholders like "1". */
function normalizeProfileNpi(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length === 10 ? d : '';
}

function shouldRetryApiCall(status) {
  if (status == null) return true;
  return [408, 502, 503, 504].includes(Number(status));
}

const backBtnStyle = {
  marginTop: 0,
  marginBottom: 14,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: TEXT_ON_SLATE,
  fontSize: 15,
  fontWeight: 600,
};

/** Main single-claim flow: back sits above the sticky stepper so it does not scroll under it */
const singleBackLinkButtonStyle = {
  marginTop: 0,
  marginBottom: 14,
  display: 'block' as const,
  width: '100%',
  textAlign: 'left' as const,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#94a3b8',
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
  padding: 0,
};

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
  const router = useRouter();
  const { isAuthenticated, authChecked, isPaid } = useAuth();
  const showUnlockPricingCta = !isAuthenticated || !isPaid;
  const unlockPricingCtaBar = useMemo(
    () =>
      showUnlockPricingCta ? (
        <div
          className="dap-unlock-cta"
          style={{
            marginTop: 24,
            padding: '16px 24px',
            background: '#0f172a',
            borderRadius: 8,
            border: '1px solid #22c55e',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#f1f5f9',
              fontSize: 14,
              lineHeight: 1.45,
              flex: 1,
              minWidth: 0,
            }}
          >
            See your full appeal letter — no subscription needed.
          </p>
          <Link
            className="dap-unlock-cta-link"
            href="/pricing"
            style={{
              display: 'inline-block',
              background: '#22c55e',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              padding: '10px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            Unlock My Appeal →
          </Link>
        </div>
      ) : null,
    [showUnlockPricingCta]
  );
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
  /** Step 4 client-side gate before preview API (missing patient/provider/NPI). */
  const [step4GenerateError, setStep4GenerateError] = useState('');
  const [singleStep, setSingleStep] = useState(0);
  const [bulkStep, setBulkStep] = useState(0);
  const [step2PreviewBusy, setStep2PreviewBusy] = useState(false);
  /** Pre-preview practice form (anonymous or no saved org name) before /preview. */
  const [showPracticeForPreview, setShowPracticeForPreview] = useState(false);
  const [ppName, setPpName] = useState('');
  const [ppNpi, setPpNpi] = useState('');
  const [ppAddress, setPpAddress] = useState('');
  const [ppPhone, setPpPhone] = useState('');
  const [ppErr, setPpErr] = useState('');
  const pendingPreviewPayloadRef = useRef(null);
  /** True after /app (e.g. post-Stripe) sent user here to finish provider/patient/NPI (no re-upload). */
  const [resumedNeedDetails, setResumedNeedDetails] = useState(false);
  /** Step 3: show provider/patient fields — snapped only when entering Step 3, not from live intake (avoids unmount while typing). */
  const [step3ProviderFieldMount, setStep3ProviderFieldMount] = useState({
    name: true,
    npi: true,
    address: true,
    phone: true,
    fax: true,
  });
  const [step3PatientFieldMount, setStep3PatientFieldMount] = useState(true);
  const intakeRef = useRef(intake);
  const prevSingleStepForStep3SnapRef = useRef(0);
  intakeRef.current = intake;

  useLayoutEffect(() => {
    if (singleStep !== 2) {
      prevSingleStepForStep3SnapRef.current = singleStep;
      return;
    }
    if (prevSingleStepForStep3SnapRef.current !== 2) {
      const cur = intakeRef.current;
      setStep3ProviderFieldMount({
        name: !(cur.providerName || '').trim(),
        npi: !isValidNpi10Digits(cur.providerNpi),
        address: !(cur.providerAddress || '').trim(),
        phone: !(cur.providerPhone || '').trim(),
        fax: !(cur.providerFax || '').trim(),
      });
      setStep3PatientFieldMount(!(cur.patientName || '').trim());
    }
    prevSingleStepForStep3SnapRef.current = singleStep;
  }, [singleStep]);

  const profileSnapshotRef = useRef(null);
  const [providerProfileEmpty, setProviderProfileEmpty] = useState(false);
  const [codingAccordionOpen, setCodingAccordionOpen] = useState(false);
  const intelDebounceRef = useRef(null);
  const firstGapRef = useRef(null);
  /** Latest Flask /api/extract/file|/api/extract/text payload for Step 2 debugging */
  const lastDenialParseResponseRef = useRef(null);
  const previewSubmitLockRef = useRef(false);

  const advanceSingle = (next) => {
    setSingleStep(next);
  };

  useEffect(() => {
    if (!showPracticeForPreview || typeof window === 'undefined') return;
    setPpErr('');
    try {
      const raw = sessionStorage.getItem(DAP_PRACTICE_PROFILE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') {
        if (p.provider_name) setPpName(String(p.provider_name));
        if (p.provider_npi) setPpNpi(String(p.provider_npi).replace(/\D/g, ''));
        if (p.provider_address) setPpAddress(String(p.provider_address));
        if (p.provider_phone) setPpPhone(String(p.provider_phone));
      }
    } catch {
      /* ignore */
    }
  }, [showPracticeForPreview]);

  const navigateToPreviewWithStored = useCallback((stored) => {
    sessionStorage.setItem(DAP_PREVIEW_PAYLOAD_KEY, JSON.stringify(stored));
    setShowPracticeForPreview(false);
    pendingPreviewPayloadRef.current = null;
    router.push('/preview');
  }, [router]);

  const onStep2ReviewContinue = async () => {
    setErr('');
    const shouldBypassPreview = authChecked && isAuthenticated && isPaid === true;
    if (shouldBypassPreview) {
      advanceSingle(2);
      return;
    }
    setStep2PreviewBusy(true);
    try {
      const payload = serializeIntakeForBackend(intake);
      const payer = (intake.payer || '').trim() || 'Unknown payer';
      const claimNum = (intake.claimNumber || '').trim();
      const pasteSupplement = mode === 'paste' && pasteText.trim() ? pasteText.trim().slice(0, 15000) : '';
      const pasteBlock = [payload.paste_details, pasteSupplement].filter(Boolean).join('\n\n');
      const rawParse = lastDenialParseResponseRef.current;
      const extractedParts = [rawParse?.raw_text, rawParse?.denial_reason_text, intake.medicalNecessity].filter(
        Boolean
      );
      const extractedText = String(extractedParts.join('\n\n').trim() || pasteText.trim() || '');
      if (extractedText.length < 10) {
        setErr('Add a bit more denial detail so we can analyze your letter.');
        return;
      }
      const intakeMode = mode === 'csv' ? 'csv' : mode === 'paste' ? 'paste' : 'upload';
      const claim_data = {
        intake_mode: intakeMode,
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
        icd10_codes: payload.icd10_codes || payload.diagnosis_code || '',
        denial_code: payload.denial_code || '',
      };
      const stored = {
        extracted_text: extractedText.slice(0, 50000),
        claim_data,
        intake_snapshot: snapshotIntakeFromWizard(intake),
        mode: intakeMode,
      };

      if (typeof window !== 'undefined') {
        const prRaw = sessionStorage.getItem(DAP_PRACTICE_PROFILE_KEY);
        if (prRaw) {
          try {
            const p = JSON.parse(prRaw);
            const nm = (p && String(p.provider_name || '').trim()) || '';
            const npiRaw = p && p.provider_npi != null ? String(p.provider_npi) : '';
            const npiDigits = npiRaw.replace(/\D/g, '');
            if (nm && npiDigits.length === 10) {
              const merged = applyPracticeToDapPreviewPayload(stored, {
                provider_name: nm,
                provider_npi: npiDigits,
                provider_address: p.provider_address ? String(p.provider_address) : undefined,
                provider_phone: p.provider_phone ? String(p.provider_phone) : undefined,
              });
              sessionStorage.setItem(
                DAP_PRACTICE_PROFILE_KEY,
                JSON.stringify({
                  provider_name: merged.practice_profile?.provider_name || nm,
                  provider_npi: merged.practice_profile?.provider_npi || npiDigits,
                  provider_address: merged.practice_profile?.provider_address,
                  provider_phone: merged.practice_profile?.provider_phone,
                })
              );
              navigateToPreviewWithStored(merged);
              return;
            }
          } catch {
            /* fall through */
          }
        }
      }

      if (authChecked && isAuthenticated) {
        try {
          const res = await fetch('/api/preview/saved-practice', { credentials: 'include' });
          if (res.ok) {
            const d = await res.json();
            if (d.hasProviderName && d.profile) {
              const m = d.profile;
              const merged = applyPracticeToDapPreviewPayload(stored, {
                provider_name: m.provider_name,
                provider_npi: String(m.provider_npi || '')
                  .replace(/\D/g, '')
                  .slice(0, 10),
                provider_address: m.provider_address || undefined,
                provider_phone: m.provider_phone || undefined,
              });
              navigateToPreviewWithStored(merged);
              return;
            }
          }
        } catch {
          /* fall through to practice form */
        }
      }

      pendingPreviewPayloadRef.current = stored;
      setShowPracticeForPreview(true);
    } finally {
      setStep2PreviewBusy(false);
    }
  };

  const commitPracticeForPreview = () => {
    setPpErr('');
    const name = (ppName || '').trim();
    const npiD = (ppNpi || '').replace(/\D/g, '');
    if (!name) {
      setPpErr('Practice name is required.');
      return;
    }
    if (npiD.length !== 10) {
      setPpErr('Provider NPI must be exactly 10 digits.');
      return;
    }
    const stored = pendingPreviewPayloadRef.current;
    if (!stored) {
      setPpErr('Preview data was lost. Go back to Step 2 and try again.');
      return;
    }
    const practice = {
      provider_name: name,
      provider_npi: npiD,
      provider_address: (ppAddress || '').trim() || undefined,
      provider_phone: (ppPhone || '').trim() || undefined,
    };
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DAP_PRACTICE_PROFILE_KEY, JSON.stringify(practice));
    }
    const merged = applyPracticeToDapPreviewPayload(stored, practice);
    setStep2PreviewBusy(true);
    try {
      navigateToPreviewWithStored(merged);
    } finally {
      setStep2PreviewBusy(false);
    }
  };

  const cancelPracticeForPreview = () => {
    setShowPracticeForPreview(false);
    setPpErr('');
    pendingPreviewPayloadRef.current = null;
  };

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('dap_need_details') !== '1') return;
    const raw = sessionStorage.getItem(DAP_WIZARD_RESUME_KEY);
    if (!raw) return;
    try {
      const blob = JSON.parse(raw);
      const intakeSnap = blob?.intake;
      const resumeMode = blob?.mode;
      if (!intakeSnap || !resumeMode) return;
      setIntake({ ...emptyIntake(), ...intakeSnap });
      setMode(resumeMode);
      setSingleStep(2);
      setResumedNeedDetails(true);
      sessionStorage.removeItem(DAP_WIZARD_RESUME_KEY);
      window.history.replaceState({}, '', '/start');
    } catch {
      /* ignore */
    }
  }, []);

  const applyProviderProfilePayload = useCallback((data) => {
    const pn = profileTextField(data?.provider_name);
    const npi = normalizeProfileNpi(data?.provider_npi);
    const addr = profileTextField(data?.provider_address);
    const ph = profileTextField(data?.provider_phone);
    const fx = profileTextField(data?.provider_fax);
    profileSnapshotRef.current = {
      providerName: pn,
      providerNpi: npi,
      providerAddress: addr,
      providerPhone: ph,
      providerFax: fx,
    };
    setProviderProfileEmpty(!pn && !npi && !addr && !ph && !fx);
    setIntake((s) => {
      const next = { ...s };
      if (pn && !s.providerName?.trim()) next.providerName = pn;
      if (npi) {
        if (!isValidNpi10Digits(s.providerNpi)) next.providerNpi = npi;
      } else if (s.providerNpi && !isValidNpi10Digits(s.providerNpi)) {
        next.providerNpi = '';
      }
      if (addr && !s.providerAddress?.trim()) next.providerAddress = addr;
      if (ph && !s.providerPhone?.trim()) next.providerPhone = ph;
      if (fx && !s.providerFax?.trim()) next.providerFax = fx;
      return next;
    });
  }, []);

  const mergeProfileSnapshotIntoIntake = useCallback(() => {
    const p = profileSnapshotRef.current;
    if (!p) return;
    setIntake((s) => {
      const next = { ...s };
      if (p.providerName && !s.providerName?.trim()) next.providerName = p.providerName;
      if (p.providerNpi) {
        if (!isValidNpi10Digits(s.providerNpi)) next.providerNpi = p.providerNpi;
      } else if (s.providerNpi && !isValidNpi10Digits(s.providerNpi)) {
        next.providerNpi = '';
      }
      if (p.providerAddress && !s.providerAddress?.trim()) next.providerAddress = p.providerAddress;
      if (p.providerPhone && !s.providerPhone?.trim()) next.providerPhone = p.providerPhone;
      if (p.providerFax && !s.providerFax?.trim()) next.providerFax = p.providerFax;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProviderProfileEmpty(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/user/profile');
        if (cancelled) return;
        applyProviderProfilePayload(data);
      } catch {
        if (isAuthenticated) setProviderProfileEmpty(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, applyProviderProfilePayload]);

  /** Re-hydrate after landing actions call setIntake(emptyIntake()) and clear provider fields. */
  useEffect(() => {
    if (!isAuthenticated || !mode) return undefined;
    if (mode !== 'upload' && mode !== 'paste') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/user/profile');
        if (cancelled) return;
        applyProviderProfilePayload(data);
      } catch {
        if (!cancelled) setProviderProfileEmpty(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, isAuthenticated, applyProviderProfilePayload]);

  /**
   * Extraction → intake mapping (ICD pipeline):
   * - API: icd10_codes (canonical) + icd_codes (legacy arrays) from Flask extract responses
   * - State: intake.icdCodes (camelCase array)
   * - Preview POST: diagnosis_code + icd10_codes (comma string via serializeIntakeForBackend)
   * - Backend: Appeal.diagnosis_code; generators use structured icd10_codes list from _split_codes(diagnosis_code)
   */
  const applyExtractionData = useCallback((data) => {
    lastDenialParseResponseRef.current = data;
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
    /** Parse response: icd10_codes (canonical) + icd_codes (legacy). */
    const icds = normalizeIcdCodesFromExtract(data);
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

    const patientRaw =
      data.patient_name ??
      data.patientName ??
      data.member_name ??
      data.memberName ??
      data.patient;
    const patientStr =
      patientRaw != null && String(patientRaw).trim() !== '' ? String(patientRaw).trim() : '';

    setIntake({
      ...emptyIntake(),
      claimNumber: data.claim_number || '',
      dateOfService: parseServiceDate(data.service_date || data.denial_date),
      payer: data.payer_name || data.payer || '',
      patientName: patientStr,
      carcCodes: carcFromDoc.length ? carcFromDoc : [],
      rarcCodes: rarcs,
      cptCodes: cpts,
      icdCodes: icds,
      billedAmount: data.billed_amount != null && data.billed_amount !== '' ? String(data.billed_amount) : '',
      paidAmount: paid,
      treatmentProvided: patientStr ? `Patient: ${patientStr}` : '',
      medicalNecessity: rawSnippet || 'Document payer denial rationale from uploaded or pasted content.',
      modifiers: modStr,
      specialCircumstances: '',
      planType: 'Commercial',
    });

    setFieldConfidence({
      claimNumber: pick('claimNumber', !!data.claim_number),
      dateOfService: pick('dateOfService', !!(data.service_date || data.denial_date)),
      payer: pick('payer', !!(data.payer_name || data.payer)),
      patientName: pick('patientName', !!patientStr),
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
      icd10_codes: serialized.icd10_codes || serialized.diagnosis_code || '',
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
    if (singleStep === 0) return; /* no coding intelligence on step 1 (upload) */
    if (!authChecked || !isAuthenticated) return;
    if (singleStep >= 3) return;
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
  }, [mode, singleStep, buildIntelPayload, authChecked, isAuthenticated]);

  /** Refresh profile when user reaches Step 3 so Settings saves apply mid-flow. */
  useEffect(() => {
    if (singleStep !== 2 || !isAuthenticated) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/user/profile');
        if (cancelled) return;
        applyProviderProfilePayload(data);
      } catch {
        if (!cancelled) setProviderProfileEmpty(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [singleStep, isAuthenticated, applyProviderProfilePayload]);

  useEffect(() => {
    if (singleStep !== 1) return;
    const raw = lastDenialParseResponseRef.current;
    if (raw != null) {
      console.log('[Denial extraction] raw API response (Step 2 — review):', raw);
    }
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
        fd.append('icd10_codes', payload.icd10_codes || payload.diagnosis_code || '');
        fd.append('denial_code', payload.denial_code || '');
        if (file) fd.append('denial_file', file);
        const { data } = await api.post('/api/intake/preview', fd);
        router.push(`/appeal/${data.appeal_id}`);
        return;
      }
      const { data } = await api.post('/api/intake/preview', {
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
        icd10_codes: payload.icd10_codes || payload.diagnosis_code || '',
        denial_code: payload.denial_code || '',
      });
      router.push(`/appeal/${data.appeal_id}`);
    } catch (err) {
      console.error('Preview error:', err.response?.data || err);
      throw err;
    }
  }, [mode, intake, file, router, pasteText]);

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
    setStep4GenerateError('');
    setStep3ProviderFieldMount({ name: true, npi: true, address: true, phone: true, fax: true });
    setStep3PatientFieldMount(true);
    prevSingleStepForStep3SnapRef.current = 0;
    setSingleStep(0);
    setBulkStep(0);
    setCodingAccordionOpen(false);
    setResumedNeedDetails(false);
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

  /**
   * @returns {Promise<boolean>} true if caller should advance to Step 2
   */
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
      return true;
    }

    setExtracting(true);
    try {
      if (!FLASK_URL) {
        throw new Error('NEXT_PUBLIC_FLASK_API_URL is not set');
      }
      const formData = new FormData();
      formData.append('file', f);
      const res = await fetch(`${FLASK_URL}/api/extract/file`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data.message || data.error)) || res.statusText || 'Extraction request failed'
        );
      }
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
      return true;
    } catch (ex) {
      setErr(STEP1_EXTRACTION_FAILED_MSG);
      setExtractedMeta(null);
      setFieldConfidence({});
      return false;
    } finally {
      setExtracting(false);
    }
  };

  /**
   * @returns {Promise<boolean>} true if caller should advance to Step 2
   */
  const runPasteExtract = async () => {
    const t = pasteText.trim();
    setExtracting(true);
    setErr('');
    try {
      if (!FLASK_URL) {
        throw new Error('NEXT_PUBLIC_FLASK_API_URL is not set');
      }
      const res = await fetch(`${FLASK_URL}/api/extract/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data.message || data.error)) || res.statusText || 'Extraction request failed'
        );
      }
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
      return true;
    } catch {
      setErr(STEP1_EXTRACTION_FAILED_MSG);
      setExtractedMeta(null);
      setFieldConfidence({});
      return false;
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
    if (previewSubmitLockRef.current) return;
    setErr('');
    setStep4GenerateError('');

    const missing = [];
    if (!(intake.patientName || '').trim()) missing.push('patient name');
    if (!(intake.providerName || '').trim()) missing.push('provider name');
    if (!isValidNpi10Digits(intake.providerNpi)) missing.push('provider NPI (10 digits)');

    const fe = {
      patientName: !(intake.patientName || '').trim() ? 'Patient name is required.' : '',
      providerName: !(intake.providerName || '').trim() ? 'Provider name is required.' : '',
      providerNpi: !isValidNpi10Digits(intake.providerNpi) ? 'Enter a valid 10-digit NPI.' : '',
    };
    setFieldErrors(fe);

    if (missing.length) {
      setStep4GenerateError(missing.join(', '));
      return;
    }

    const v = validate();
    if (fe.patientName || fe.providerName || fe.providerNpi || v) {
      if (v) setErr(v);
      return;
    }

    previewSubmitLockRef.current = true;
    setLoading(true);
    try {
      try {
        await runPreview();
      } catch (ex) {
        const status = ex.response?.status;
        if (shouldRetryApiCall(status)) {
          await new Promise((r) => setTimeout(r, 500));
          await runPreview();
        } else {
          throw ex;
        }
      }
    } catch (ex) {
      console.error('Preview error:', ex.response?.data || ex);
      setErr(ex.response?.data?.error || 'Could not create preview');
    } finally {
      setLoading(false);
      previewSubmitLockRef.current = false;
    }
  };

  const importAllToQueue = async () => {
    if (!isAuthenticated || !csvRows.length) return;
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
      router.push('/queue');
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
    if (!isAuthenticated || !csvRows.length) return;
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
    if (!isAuthenticated || !bulkPdfFiles.length) return;
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
      { key: 'patientName', label: 'Patient name', type: 'text', fc: 'patientName' },
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
  const showStep3ProviderFieldset = useMemo(
    () => Object.values(step3ProviderFieldMount).some(Boolean),
    [step3ProviderFieldMount]
  );

  const inputBorderDefault = '1.5px solid #cbd5e1';
  const inputBorderGap = '2px solid #f97316';
  const inputBorderConfirmed = '2px solid #22c55e';
  const inputBorderError = '2px solid #dc2626';
  const flowFieldLabelStyle = {
    fontWeight: 600,
    fontSize: 14,
    color: '#1e293b',
    display: 'block',
    marginBottom: 6,
  };
  const flowFieldLabelOptionalStyle = {
    ...flowFieldLabelStyle,
    color: '#64748b',
  };

  const inputBase = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 48,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 16,
    outline: 'none',
    border: inputBorderDefault,
    fontFamily: 'inherit',
    lineHeight: 1.25,
  };

  const ctaButton = (disabled, loadingLabel, label) => ({
    width: '100%',
    padding: 16,
    background: disabled ? DISABLED_SLATE : primaryCta,
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
      const ok = await runPdfExtract(file);
      if (ok) advanceSingle(1);
      return;
    }
    if (mode === 'paste') {
      if (pasteText.trim().length < 20) {
        setErr('Paste a bit more denial text so we can extract details.');
        return;
      }
      const ok = await runPasteExtract();
      if (ok) advanceSingle(1);
    }
  };

  const pasteTextStats = useMemo(() => {
    const t = pasteText.trim();
    const words = t ? t.split(/\s+/).filter(Boolean).length : 0;
    const chars = t.length;
    return { words, chars, ready: chars > 20 };
  }, [pasteText]);

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
              color: TEXT_ON_SLATE,
              margin: '0 0 12px',
              lineHeight: 1.2,
            }}
          >
            Start an appeal
          </h1>
          <p style={{ fontSize: 17, color: TEXT_MUTED_ON_SLATE, margin: '0 0 28px', lineHeight: 1.5 }}>
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
                    border: `1px solid ${border}`,
                    borderLeft: `5px solid ${primaryCta}`,
                    borderTop: `3px solid ${primaryCta}`,
                    borderRadius: 12,
                    padding: '20px 18px',
                    cursor: 'pointer',
                    background: softBlue,
                    minHeight: 100,
                    boxShadow: '0 2px 12px rgba(34, 197, 94, 0.12)',
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
                border: `1px solid ${BORDER_MUTED}`,
                boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
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
                    border: `1px solid ${BORDER_MUTED}`,
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
                    border: `1px solid ${BORDER_MUTED}`,
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
            <p style={{ marginTop: 20, color: TEXT_ON_SLATE, fontWeight: 600, fontSize: 15 }}>Reading file…</p>
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
          <button type="button" onClick={resetIntake} style={backBtnStyle}>
            ← Back
          </button>
          <IntakeStepper
            steps={BULK_STEPS}
            activeIndex={bulkStep}
            onStepClick={(i) => {
              if (i < bulkStep) setBulkStep(i);
            }}
          />
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Bulk PDF denials</h1>
            <p style={{ fontSize: 15, color: '#475569', marginBottom: 18 }}>
              Log in required. Each successful appeal uses your plan credits. Failed extractions are skipped and listed in{' '}
              <code style={{ fontSize: 13 }}>processing_report.txt</code> inside the ZIP.
            </p>

            {!isAuthenticated && (
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
                    background: bulkDrag ? softBlue : '#f1f5f9',
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
                    width: '100%',
                    padding: 16,
                    marginTop: 0,
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: !bulkPdfFiles.length ? 'not-allowed' : 'pointer',
                    background: !bulkPdfFiles.length ? DISABLED_SLATE : primaryCta,
                    color: '#fff',
                    transition: 'background 0.2s ease, opacity 0.2s ease',
                    opacity: !bulkPdfFiles.length ? 0.85 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!bulkPdfFiles.length) return;
                    e.currentTarget.style.background = primaryCtaHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!bulkPdfFiles.length) return;
                    e.currentTarget.style.background = primaryCta;
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
                  disabled={!isAuthenticated || !bulkPdfFiles.length || bulkProcessing}
                  onClick={runPdfBulkAppeals}
                  style={{
                    width: '100%',
                    padding: 16,
                    marginTop: 16,
                    background: !isAuthenticated || !bulkPdfFiles.length || bulkProcessing ? '#94a3b8' : primaryCta,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: !isAuthenticated || !bulkPdfFiles.length || bulkProcessing ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isAuthenticated || !bulkPdfFiles.length || bulkProcessing) return;
                    e.target.style.background = primaryCtaHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isAuthenticated || !bulkPdfFiles.length || bulkProcessing) return;
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
          <button type="button" onClick={resetIntake} style={backBtnStyle}>
            ← Back
          </button>
          <IntakeStepper
            steps={BULK_STEPS}
            activeIndex={bulkStep}
            onStepClick={(i) => {
              if (i < bulkStep) setBulkStep(i);
            }}
          />
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
                {isAuthenticated && (
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
                {!isAuthenticated && (
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
        <style>{`
          .dap-flow-input:focus {
            outline: none !important;
            border: 2px solid #22c55e !important;
          }
          .dap-flow-code-input:focus-within {
            outline: none !important;
            border: 2px solid #22c55e !important;
          }
          .dap-flow-coding-details > summary {
            list-style: none;
          }
          .dap-flow-coding-details > summary::-webkit-details-marker {
            display: none;
          }
          .dap-unlock-cta {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
            gap: 14px;
            box-sizing: border-box;
          }
          .dap-unlock-cta .dap-unlock-cta-link {
            width: 100%;
            box-sizing: border-box;
          }
          @media (min-width: 640px) {
            .dap-unlock-cta {
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            }
            .dap-unlock-cta .dap-unlock-cta-link {
              width: auto;
            }
          }
        `}</style>
        <button
          type="button"
          onClick={resetIntake}
          style={singleBackLinkButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          ← Back
        </button>
        <IntakeStepper
          steps={SINGLE_STEPS}
          activeIndex={singleStep}
          onStepClick={(i) => i < singleStep && handleStepperBack(i)}
        />

        {singleStep === 0 && (
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Step 1 — Upload</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 18 }}>
              Add your denial once. We&apos;ll extract details on the next step.
            </p>
            {mode === 'upload' && (
              <div style={{ marginBottom: 8 }}>
                <DenialDocumentDropZone
                  key={file ? `dz-${file.name}-${file.size}` : 'dz-empty'}
                  accept=".pdf,.png,.jpg,.jpeg"
                  confirmedFile={file}
                  extracting={extracting && singleStep === 0}
                  onRemoveFile={() => {
                    setFile(null);
                    setExtractedMeta(null);
                    setErr('');
                  }}
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
                    setErr('');
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
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    if (err) setErr('');
                  }}
                  disabled={extracting}
                  placeholder="Paste from your payer portal or billing system…"
                  rows={10}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    border: pasteTextStats.ready ? '2px solid #22c55e' : `1px solid ${border}`,
                    fontFamily: 'inherit',
                    lineHeight: 1.45,
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    minHeight: 160,
                  }}
                />
                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: 13,
                    color: pasteTextStats.ready ? '#15803d' : TEXT_MUTED_ON_SLATE,
                    fontWeight: pasteTextStats.ready ? 600 : 400,
                  }}
                >
                  {pasteTextStats.words} word{pasteTextStats.words === 1 ? '' : 's'}
                  {pasteTextStats.ready ? ' — ready to extract' : ' — add more text (20+ characters)'}
                  <span style={{ color: TEXT_MUTED_ON_SLATE, fontWeight: 400 }}>
                    {' '}
                    · {pasteTextStats.chars} character{pasteTextStats.chars === 1 ? '' : 's'}
                  </span>
                </p>
                {extracting && (
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 10,
                      padding: 12,
                      border: '2px solid rgba(34, 197, 94, 0.45)',
                      animation: 'dapZonePulsePaste 1.2s ease-in-out infinite',
                    }}
                  >
                    <style>{`
                      @keyframes dapZonePulsePaste {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.2); }
                        50% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.25); }
                      }
                    `}</style>
                    <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>Extracting claim details…</span>
                  </div>
                )}
              </div>
            )}
            {err && (
              <div style={{ marginTop: 14 }}>
                <p
                  style={{
                    color: err === STEP1_EXTRACTION_FAILED_MSG ? '#ef4444' : '#c2410c',
                    fontWeight: 600,
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {err}
                </p>
                {err === STEP1_EXTRACTION_FAILED_MSG && (
                  <button
                    type="button"
                    onClick={() => {
                      setErr('');
                      setExtractedMeta(null);
                    }}
                    style={{
                      marginTop: 10,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: primaryCta,
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: 'underline',
                    }}
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
            <style>{`@keyframes dapBtnSpin { to { transform: rotate(360deg); } }`}</style>
            <button
              type="button"
              disabled={extracting}
              onClick={onSingleStep1Next}
              style={{
                width: '100%',
                padding: 16,
                background: extracting ? primaryCta : primaryCta,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 16,
                cursor: extracting ? 'wait' : 'pointer',
                marginTop: 8,
                transition: 'opacity 0.15s ease, background 0.15s ease',
                opacity: extracting ? 0.92 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
              onMouseEnter={(e) => {
                if (extracting) return;
                e.currentTarget.style.background = primaryCtaHover;
              }}
              onMouseLeave={(e) => {
                if (extracting) return;
                e.currentTarget.style.background = primaryCta;
              }}
            >
              {extracting ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 18,
                      height: 18,
                      border: '2px solid rgba(255,255,255,0.45)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'dapBtnSpin 0.75s linear infinite',
                      flexShrink: 0,
                    }}
                  />
                  Extracting claim details…
                </>
              ) : (
                'Next — extract & review'
              )}
            </button>
          </div>
        )}

        {singleStep === 1 && (
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            {showPracticeForPreview ? (
              <>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Tell us about your practice</h1>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>
                  We&apos;ll use this to personalize your appeal letter.
                </p>
                {ppErr ? (
                  <p style={{ color: '#b91c1c', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{ppErr}</p>
                ) : null}
                <div style={{ display: 'grid', gap: 14, maxWidth: '100%' }}>
                  <label style={{ display: 'block' }}>
                    <span style={flowFieldLabelStyle}>
                      Practice name <span style={{ color: '#c2410c' }} aria-hidden="true">*</span>
                    </span>
                    <input
                      className="dap-flow-input"
                      value={ppName}
                      onChange={(e) => {
                        setPpName(e.target.value);
                        if (ppErr) setPpErr('');
                      }}
                      placeholder="e.g. Riverside Medical Group"
                      style={{ ...inputBase, width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={flowFieldLabelStyle}>
                      Provider NPI <span style={{ color: '#c2410c' }} aria-hidden="true">*</span>
                    </span>
                    <input
                      className="dap-flow-input"
                      value={ppNpi}
                      onChange={(e) => setPpNpi(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="10-digit NPI"
                      style={{ ...inputBase, width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={flowFieldLabelStyle}>Practice address (optional)</span>
                    <input
                      className="dap-flow-input"
                      value={ppAddress}
                      onChange={(e) => setPpAddress(e.target.value)}
                      placeholder="Street address"
                      style={{ ...inputBase, width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={flowFieldLabelStyle}>Phone (optional)</span>
                    <input
                      className="dap-flow-input"
                      value={ppPhone}
                      onChange={(e) => setPpPhone(e.target.value)}
                      placeholder="(xxx) xxx-xxxx"
                      type="tel"
                      style={{ ...inputBase, width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20, alignItems: 'center' }}
                >
                  <button
                    type="button"
                    onClick={cancelPracticeForPreview}
                    style={{
                      ...singleBackLinkButtonStyle,
                      display: 'inline-block',
                      width: 'auto',
                    }}
                  >
                    ← Back to review
                  </button>
                  <button
                    type="button"
                    onClick={commitPracticeForPreview}
                    disabled={step2PreviewBusy}
                    style={ctaButton(step2PreviewBusy, false, '')}
                    onMouseEnter={(e) => {
                      if (step2PreviewBusy) return;
                      e.currentTarget.style.background = primaryCtaHover;
                    }}
                    onMouseLeave={(e) => {
                      if (step2PreviewBusy) return;
                      e.currentTarget.style.background = primaryCta;
                    }}
                  >
                    {step2PreviewBusy ? 'Preparing…' : 'Generate My Preview →'}
                  </button>
                </div>
                {unlockPricingCtaBar}
              </>
            ) : (
              <>
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
              const fieldBorder = needsAttention ? inputBorderGap : confirmed ? inputBorderConfirmed : inputBorderDefault;
              const isFirstGap = f.key === step2Fields.firstGapKey;
              return (
                <label key={f.key} style={{ display: 'block', marginBottom: 14 }}>
                  <span
                    style={{
                      ...flowFieldLabelStyle,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    {f.label}
                    {confirmed ? (
                      <span style={{ color: primaryCta, fontSize: 12 }} aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </span>
                  {f.type === 'payer' ? (
                    <input
                      className="dap-flow-input"
                      ref={isFirstGap ? firstGapRef : undefined}
                      list="payer-suggestions"
                      value={intake.payer}
                      onChange={(e) => setIntake((s) => ({ ...s, payer: e.target.value }))}
                      placeholder="Start typing…"
                      title={fieldConfidence.payer === 'low' ? VERIFY_TOOLTIP : undefined}
                      style={{
                        ...inputBase,
                        border: fieldBorder,
                        backgroundColor: needsAttention ? orangeBg : cardBg,
                      }}
                    />
                  ) : (
                    <input
                      className="dap-flow-input"
                      ref={isFirstGap ? firstGapRef : undefined}
                      type={f.type === 'date' ? 'date' : 'text'}
                      value={intake[f.key]}
                      onChange={(e) => setIntake((s) => ({ ...s, [f.key]: e.target.value }))}
                      title={fcKey && fieldConfidence[fcKey] === 'low' ? VERIFY_TOOLTIP : undefined}
                      style={{
                        ...inputBase,
                        border: fieldBorder,
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
              disabled={step2PreviewBusy || !authChecked}
              onClick={() => void onStep2ReviewContinue()}
              style={ctaButton(step2PreviewBusy || !authChecked, false, '')}
              onMouseEnter={(e) => {
                if (step2PreviewBusy || !authChecked) return;
                e.target.style.background = primaryCtaHover;
              }}
              onMouseLeave={(e) => {
                if (step2PreviewBusy || !authChecked) return;
                e.target.style.background = primaryCta;
              }}
            >
              {!authChecked ? 'Loading…' : step2PreviewBusy ? 'Preparing preview…' : 'Looks good — next'}
            </button>
            {unlockPricingCtaBar}
              </>
            )}
          </div>
        )}

        {singleStep === 2 && (
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}` }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 8 }}>Step 3 — Confirm details</h1>
            {resumedNeedDetails ? (
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: 10,
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  fontSize: 14,
                  color: '#14532d',
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                Your denial details were restored after checkout — complete any missing fields below. You do not need to
                upload the letter again.
              </div>
            ) : null}
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Only fields that still need you are shown. Provider profile values are filled automatically when saved on your account.
            </p>
            {isAuthenticated && providerProfileEmpty && (
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 1.45 }}>
                Save your provider details in{' '}
                <Link href="/profile" style={{ color: primaryCta, fontWeight: 700 }}>
                  Settings
                </Link>{' '}
                to auto-fill these fields.
              </p>
            )}
            <div style={{ display: 'grid', gap: 14 }}>
              {step3PatientFieldMount && (
                <label style={{ display: 'block' }}>
                  <span style={flowFieldLabelStyle}>
                    Patient name <span style={{ color: '#c2410c' }} aria-hidden="true">*</span>
                  </span>
                  <input
                    className="dap-flow-input"
                    value={intake.patientName}
                    onChange={(e) => {
                      setFieldErrors((fe) => ({ ...fe, patientName: '' }));
                      setIntake((s) => ({ ...s, patientName: e.target.value }));
                    }}
                    placeholder="Jane Doe"
                    style={{
                      ...inputBase,
                      border: fieldErrors.patientName ? inputBorderError : inputBorderDefault,
                    }}
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
                  <span style={flowFieldLabelStyle}>Modifiers</span>
                  <input
                    className="dap-flow-input"
                    value={intake.modifiers}
                    onChange={(e) => setIntake((s) => ({ ...s, modifiers: e.target.value }))}
                    placeholder="-25, -59, -24"
                    title={fieldConfidence.modifiers === 'low' ? VERIFY_TOOLTIP : undefined}
                    style={{
                      ...inputBase,
                      border: fieldConfidence.modifiers === 'low' ? inputBorderGap : inputBorderDefault,
                      backgroundColor: fieldConfidence.modifiers === 'low' ? orangeBg : undefined,
                    }}
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
                  <span style={flowFieldLabelStyle}>Billed amount ($)</span>
                  <input
                    className="dap-flow-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={intake.billedAmount}
                    onChange={(e) => setIntake((s) => ({ ...s, billedAmount: e.target.value }))}
                    title={fieldConfidence.billedAmount === 'low' ? VERIFY_TOOLTIP : undefined}
                    style={{
                      ...inputBase,
                      border: fieldConfidence.billedAmount === 'low' ? inputBorderGap : inputBorderDefault,
                      backgroundColor: fieldConfidence.billedAmount === 'low' ? orangeBg : undefined,
                    }}
                  />
                </label>
              )}
              {showStep3Paid && (
                <label style={{ display: 'block' }}>
                  <span style={flowFieldLabelStyle}>Paid amount ($)</span>
                  <input
                    className="dap-flow-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={intake.paidAmount}
                    onChange={(e) => setIntake((s) => ({ ...s, paidAmount: e.target.value }))}
                    title={fieldConfidence.paidAmount === 'low' ? VERIFY_TOOLTIP : undefined}
                    style={{
                      ...inputBase,
                      border: fieldConfidence.paidAmount === 'low' ? inputBorderGap : inputBorderDefault,
                      backgroundColor: fieldConfidence.paidAmount === 'low' ? orangeBg : undefined,
                    }}
                  />
                </label>
              )}
              {showStep3ProviderFieldset && (
                <fieldset
                  style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 16,
                    margin: 0,
                    background: '#f8fafc',
                  }}
                >
                  <legend style={{ fontWeight: 600, color: '#64748b', padding: '0 8px', fontSize: 14 }}>
                    Provider (from profile or enter missing)
                  </legend>
                  {step3ProviderFieldMount.name && (
                    <label style={{ display: 'block', marginBottom: 10 }}>
                      <span style={flowFieldLabelStyle}>
                        Provider or practice name <span style={{ color: '#c2410c' }} aria-hidden="true">*</span>
                      </span>
                      <input
                        className="dap-flow-input"
                        value={intake.providerName}
                        onChange={(e) => {
                          setFieldErrors((fe) => ({ ...fe, providerName: '' }));
                          setIntake((s) => ({ ...s, providerName: e.target.value }));
                        }}
                        style={{
                          ...inputBase,
                          border: fieldErrors.providerName ? inputBorderError : inputBorderDefault,
                          backgroundColor: cardBg,
                        }}
                      />
                      {fieldErrors.providerName ? (
                        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{fieldErrors.providerName}</div>
                      ) : null}
                    </label>
                  )}
                  {step3ProviderFieldMount.npi && (
                    <label style={{ display: 'block', marginBottom: 10 }}>
                      <span style={flowFieldLabelStyle}>
                        Provider NPI <span style={{ color: '#c2410c' }} aria-hidden="true">*</span>
                      </span>
                      <input
                        className="dap-flow-input"
                        inputMode="numeric"
                        autoComplete="off"
                        value={intake.providerNpi}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFieldErrors((fe) => ({ ...fe, providerNpi: '' }));
                          setIntake((s) => ({ ...s, providerNpi: digits }));
                        }}
                        placeholder="10-digit NPI"
                        style={{
                          ...inputBase,
                          border: fieldErrors.providerNpi ? inputBorderError : inputBorderDefault,
                          backgroundColor: cardBg,
                        }}
                      />
                      {fieldErrors.providerNpi ? (
                        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{fieldErrors.providerNpi}</div>
                      ) : null}
                    </label>
                  )}
                  {step3ProviderFieldMount.address && (
                    <label style={{ display: 'block', marginBottom: 10 }}>
                      <span style={flowFieldLabelOptionalStyle}>Provider address</span>
                      <input
                        className="dap-flow-input"
                        value={intake.providerAddress || ''}
                        onChange={(e) => setIntake((s) => ({ ...s, providerAddress: e.target.value }))}
                        style={{ ...inputBase, backgroundColor: cardBg }}
                      />
                    </label>
                  )}
                  {step3ProviderFieldMount.phone && (
                    <label style={{ display: 'block', marginBottom: 10 }}>
                      <span style={flowFieldLabelOptionalStyle}>Provider phone</span>
                      <input
                        className="dap-flow-input"
                        value={intake.providerPhone || ''}
                        onChange={(e) => setIntake((s) => ({ ...s, providerPhone: e.target.value }))}
                        style={{ ...inputBase, backgroundColor: cardBg }}
                      />
                    </label>
                  )}
                  {step3ProviderFieldMount.fax && (
                    <label style={{ display: 'block' }}>
                      <span style={flowFieldLabelOptionalStyle}>Provider fax</span>
                      <input
                        className="dap-flow-input"
                        value={intake.providerFax || ''}
                        onChange={(e) => setIntake((s) => ({ ...s, providerFax: e.target.value }))}
                        style={{ ...inputBase, backgroundColor: cardBg }}
                      />
                    </label>
                  )}
                </fieldset>
              )}
            </div>

            <details
              className="dap-flow-coding-details"
              open={codingAccordionOpen}
              onToggle={(e) => setCodingAccordionOpen(e.target.open)}
              style={{
                marginTop: 18,
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                padding: 0,
                background: '#f1f5f9',
                overflow: 'hidden',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: navy,
                  minHeight: 48,
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 15,
                  boxSizing: 'border-box',
                }}
              >
                Coding insights (optional)
              </summary>
              <div style={{ padding: '0 14px 14px' }}>
                {(intake.carcCodes.length > 0 || intake.rarcCodes.length > 0) && (
                  <div
                    style={{
                      background: '#f8fafc',
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
              onClick={() => {
                setStep4GenerateError('');
                advanceSingle(3);
              }}
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
            {unlockPricingCtaBar}
          </div>
        )}

        {singleStep === 3 && (
          <div style={{ background: cardBg, borderRadius: 14, padding: 22, border: `1px solid ${border}`, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: navy, marginBottom: 16 }}>Step 4 — Generate</h1>
            <div
              style={{
                textAlign: 'left',
                background: '#f8fafc',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
                fontSize: 16,
                color: '#334155',
                lineHeight: 1.5,
                border: inputBorderDefault,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#1e293b', fontSize: 15 }}>Claim summary</div>
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
                <strong>Provider:</strong> {intake.providerName || '—'} (NPI{' '}
                {isValidNpi10Digits(intake.providerNpi)
                  ? String(intake.providerNpi).replace(/\D/g, '')
                  : '—'}
                )
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
            {step4GenerateError ? (
              <div
                style={{
                  textAlign: 'left',
                  maxWidth: 420,
                  margin: '0 auto 16px',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  fontSize: 14,
                  color: '#991b1b',
                  lineHeight: 1.55,
                }}
              >
                Missing required fields: <strong>{step4GenerateError}</strong>.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setStep4GenerateError('');
                    setSingleStep(2);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    color: primaryCta,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: 'underline',
                  }}
                >
                  Go back to Step 3
                </button>{' '}
                to complete them.
              </div>
            ) : null}
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
            {unlockPricingCtaBar}
          </div>
        )}
      </div>
    </div>
  );
}
