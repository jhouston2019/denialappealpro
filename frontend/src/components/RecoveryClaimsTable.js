import React, { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { calculatePriority } from '../utils/claimPriority';

const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #0f172a', fontSize: 13, color: '#0f172a' };
const td = { padding: '8px 10px', borderBottom: '1px solid #e2e8f0', fontSize: 13, verticalAlign: 'middle' };

const TRACKING = [
  { value: '', label: 'All statuses' },
  { value: 'generated', label: 'Generated' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

function formatStatus(s) {
  const m = { generated: 'Generated', submitted: 'Submitted', pending: 'Pending', approved: 'Approved', denied: 'Denied' };
  return m[(s || '').toLowerCase()] || s || '—';
}

function formatDos(iso) {
  if (!iso) return '—';
  const s = String(iso);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Focused recovery table: priority = amount, sort high → low, filter status / payer.
 * When loading, filters + table chrome stay mounted; only tbody shows skeleton rows (no full-page block).
 */
export default function RecoveryClaimsTable({ claims, loading, onRefresh }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [payerFilter, setPayerFilter] = useState('');
  const [fuBusy, setFuBusy] = useState(null);

  const payers = useMemo(() => {
    const set = new Set();
    (claims || []).forEach((c) => {
      if (c.payer) set.add(c.payer);
    });
    return [...set].sort();
  }, [claims]);

  const rows = useMemo(() => {
    let list = [...(claims || [])];
    if (statusFilter) {
      list = list.filter((c) => (c.appeal_tracking_status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (payerFilter.trim()) {
      const q = payerFilter.trim().toLowerCase();
      list = list.filter((c) => (c.payer || '').toLowerCase().includes(q));
    }
    list.sort((a, b) => calculatePriority(b).priorityScore - calculatePriority(a).priorityScore);
    return list;
  }, [claims, statusFilter, payerFilter]);

  const runFollowUp = useCallback(
    async (e, appealId) => {
      e.preventDefault();
      setFuBusy(appealId);
      try {
        await api.post(`/api/queue/${appealId}/follow-up`, { days_no_response: 30 });
        if (onRefresh) onRefresh();
        navigate(`/queue/${appealId}`);
      } catch (err) {
        window.alert(err.response?.data?.error || err.response?.data?.follow_up_reason || 'Follow-up unavailable');
      } finally {
        setFuBusy(null);
      }
    },
    [navigate, onRefresh]
  );

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const skeletonRow = (key) => (
    <tr key={key}>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} style={{ ...td, padding: '12px 10px' }}>
          <div
            style={{
              height: 14,
              borderRadius: 4,
              background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'rqshimmer 1.2s ease-in-out infinite',
              maxWidth: i === 1 ? 120 : i === 4 ? 80 : '100%',
            }}
          />
        </td>
      ))}
    </tr>
  );

  return (
    <div>
      <style>{`
        @keyframes rqshimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <label style={{ fontSize: 13, color: '#334155' }}>
          Status{' '}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
          >
            {TRACKING.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13, color: '#334155' }}>
          Payer{' '}
          <input
            list="recovery-payer-filter"
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            placeholder="Filter…"
            style={{ marginLeft: 6, padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', minWidth: 160 }}
          />
        </label>
        <datalist id="recovery-payer-filter">
          {payers.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>Highest Recovery First</span>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>
              <th style={th}>Claim #</th>
              <th style={th}>Payer</th>
              <th style={th}>Date of service</th>
              <th style={th}>Amount</th>
              <th style={th}>Priority</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [0, 1, 2, 3, 4].map((k) => skeletonRow(`sk-${k}`))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, color: '#64748b', padding: 20 }}>
                  No claims match.{' '}
                  <Link to="/start" style={{ color: '#1d4ed8', fontWeight: 600 }}>
                    Add a claim
                  </Link>
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const pr = calculatePriority(c);
                const fuOk = c.follow_up_eligible && c.appeal_generation_kind !== 'follow_up';
                return (
                  <tr key={c.appeal_id}>
                    <td style={td}>{c.claim_id}</td>
                    <td style={td}>{c.payer}</td>
                    <td style={td}>{formatDos(c.date_of_service)}</td>
                    <td style={td}>${Number(c.amount).toFixed(2)}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{pr.label}</td>
                    <td style={td}>{formatStatus(c.appeal_tracking_status)}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <Link to={`/queue/${c.appeal_id}`} style={{ color: '#1d4ed8', fontWeight: 600, fontSize: 13 }}>
                          View appeal
                        </Link>
                        {c.has_letter && (
                          <a
                            href={`${baseUrl}/api/appeals/${c.appeal_id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#059669', fontWeight: 600, fontSize: 13 }}
                          >
                            Download PDF
                          </a>
                        )}
                        {fuOk && (
                          <button
                            type="button"
                            disabled={fuBusy === c.appeal_id}
                            onClick={(e) => runFollowUp(e, c.appeal_id)}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: fuBusy === c.appeal_id ? 'wait' : 'pointer',
                              border: '1px solid #0f172a',
                              background: '#fff',
                              color: '#0f172a',
                              borderRadius: 6,
                            }}
                          >
                            {fuBusy === c.appeal_id ? '…' : 'Generate Follow-Up Appeal'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
