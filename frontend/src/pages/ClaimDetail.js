import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import UpgradeModal from '../components/UpgradeModal';

const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function ClaimDetail() {
  const { appealId } = useParams();
  const [sp] = useSearchParams();
  const highlightGen = sp.get('gen') === '1';

  const [claim, setClaim] = useState(null);
  const [notes, setNotes] = useState('');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState(null);
  const [postGen, setPostGen] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get(`/api/queue/${appealId}`);
    setClaim(data.claim);
    setNotes(data.claim.queue_notes || '');
    setLetter(data.claim.generated_letter_text || '');
    setPaymentStatus((data.claim.payment_status || 'unpaid').toLowerCase());
    setLoading(false);
  }, [appealId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveNotes = async () => {
    await api.patch(`/api/queue/${appealId}`, { queue_notes: notes });
  };

  const generate = async () => {
    setErr('');
    setBusy(true);
    try {
      const { data } = await api.post(`/api/queue/${appealId}/generate`);
      setClaim(data.claim);
      setLetter(data.claim.generated_letter_text || '');
      if (data.post_generation) {
        setPostGen(data.post_generation);
      }
    } catch (e) {
      if (e.response?.status === 402) {
        setPaywallUsage(e.response.data?.usage || null);
        setPaywallOpen(true);
      } else {
        setErr(e.response?.data?.error || 'Generate failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const saveLetter = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/api/queue/${appealId}`, { generated_letter_text: letter });
      setClaim(data.claim);
    } finally {
      setBusy(false);
    }
  };

  const rebuildPdf = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/queue/${appealId}/rebuild-pdf`);
      setClaim(data.claim);
    } catch (e) {
      setErr(e.response?.data?.error || 'Rebuild failed');
    } finally {
      setBusy(false);
    }
  };

  const markSubmitted = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/api/queue/${appealId}`, { queue_status: 'submitted' });
      setClaim(data.claim);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !claim) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  const canGenerate = claim.status !== 'completed';
  const hasPdf = claim.has_letter;

  return (
    <div style={{ padding: '16px 20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <UpgradeModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        currentTier={paywallUsage?.subscription_tier}
        usageStats={paywallUsage}
      />

      {postGen && (
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
            <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>Appeal generated</h2>
            <p style={{ margin: '0 0 8px', fontSize: 15, color: '#334155' }}>
              <strong>Claim value:</strong> $
              {Number(postGen.claim_amount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 15, color: '#334155' }}>
              <strong>Estimated recovery potential (~35%):</strong> $
              {Number(postGen.recovery_potential_estimate || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {postGen.free_trial_remaining != null && (
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>
                Free generations remaining: {postGen.free_trial_remaining} of 3
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Link
                to="/pricing"
                style={{
                  display: 'inline-block',
                  padding: '10px 18px',
                  background: '#0f766e',
                  color: '#fff',
                  borderRadius: 6,
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                Upgrade plan
              </Link>
              <button
                type="button"
                onClick={() => setPostGen(null)}
                style={{ padding: '10px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Continue to appeal
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{ margin: '0 0 12px' }}>
        <Link to="/queue">← Queue</Link>
      </p>
      <h1 style={{ margin: '0 0 8px', fontSize: '20px' }}>Claim {claim.claim_id}</h1>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#444' }}>
        {claim.payer} · ${Number(claim.amount).toFixed(2)} · {claim.queue_status}
      </p>

      {highlightGen && canGenerate && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffc107', padding: 8, marginBottom: 12, fontSize: 13 }}>
          Ready to generate — uses your subscription, credits, or up to 3 free onboarding generations.
        </div>
      )}
      {err && <p style={{ color: '#b00020', fontSize: 14 }}>{err}</p>}

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Claim data</h2>
        <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Patient ID', claim.patient_id],
              ['Provider', claim.provider_name],
              ['NPI', claim.provider_npi],
              ['DOS', claim.date_of_service],
              ['Denial code', claim.denial_code],
              ['CPT', claim.cpt_codes],
              ['ICD', claim.diagnosis_code],
              ['Denial reason', claim.denial_reason],
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: '4px 12px 4px 0', color: '#555', verticalAlign: 'top' }}>{k}</td>
                <td style={{ padding: '4px 0' }}>{v || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Payment / recovery status</h2>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#555' }}>
          Track payer outcome (Pending → Submitted → Paid).
        </p>
        <select
          value={paymentStatus}
          onChange={async (e) => {
            const v = e.target.value;
            setPaymentStatus(v);
            try {
              const { data } = await api.patch(`/api/queue/${appealId}`, { payment_status: v });
              setClaim(data.claim);
            } catch {
              setErr('Could not save payment status');
            }
          }}
          style={{ padding: 6, fontSize: 13, minWidth: 200 }}
        >
          <option value="pending">Pending</option>
          <option value="unpaid">Unpaid</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
        </select>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }}
        />
        <button type="button" onClick={saveNotes} style={{ marginTop: 6, padding: '4px 10px' }}>
          Save notes
        </button>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Appeal</h2>
        {canGenerate && (
          <button type="button" disabled={busy} onClick={generate} style={{ padding: '8px 14px', marginBottom: 12 }}>
            {busy ? 'Working…' : 'Generate structured appeal'}
          </button>
        )}
        {!canGenerate && (
          <>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={14}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 12 }}
            />
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" disabled={busy} onClick={saveLetter} style={{ padding: '6px 12px' }}>
                Save edits
              </button>
              <button type="button" disabled={busy} onClick={rebuildPdf} style={{ padding: '6px 12px' }}>
                Approve &amp; rebuild PDF
              </button>
              {hasPdf && (
                <a
                  href={`${baseUrl}/api/appeals/${appealId}/download`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '6px 12px', border: '1px solid #333', color: '#111', textDecoration: 'none' }}
                >
                  Download PDF
                </a>
              )}
              <button type="button" disabled={busy || claim.queue_status === 'submitted'} onClick={markSubmitted} style={{ padding: '6px 12px' }}>
                Mark submitted
              </button>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>History</h2>
        <ul style={{ paddingLeft: 18, fontSize: 13 }}>
          {(claim.history || []).map((h) => (
            <li key={h.id} style={{ marginBottom: 6 }}>
              <strong>{h.event_type}</strong>
              {h.message ? ` — ${h.message}` : ''}
              <span style={{ color: '#777' }}> ({h.created_at})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
