import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { applyPayerFormatting } from '../utils/payerFormatting';

const th = { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #1e293b', fontSize: '13px', fontWeight: 600 };
const td = { padding: '10px 8px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', verticalAlign: 'middle' };

const TRACKING = [
  { value: 'generated', label: 'Generated' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

function formatMoney(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return `$${x.toFixed(2)}`;
}

export default function AppealTrackingDashboard({ embedded = false }) {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [payerFilter, setPayerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set('q', debouncedQ);
    if (payerFilter.trim()) p.set('payer', payerFilter.trim());
    if (statusFilter) p.set('status', statusFilter);
    return p.toString();
  }, [debouncedQ, payerFilter, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = params ? `/api/queue?${params}` : '/api/queue';
      const { data } = await api.get(url);
      setClaims(data.claims || []);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const patchStatus = async (appealId, appeal_tracking_status) => {
    await api.patch(`/api/queue/${appealId}`, { appeal_tracking_status });
    load();
  };

  return (
    <div style={{ padding: embedded ? '0' : '16px 20px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Appeal tracking</h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#475569', maxWidth: 560 }}>
              Daily workflow: filter by payer or status, update submission state, then open a claim for PDFs and notes.
            </p>
          </div>
          <Link
            to="/queue"
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Batch queue &amp; CSV upload →
          </Link>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
          marginTop: embedded ? 0 : 20,
          marginBottom: 16,
        }}
      >
        <input
          placeholder="Search claim #"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
        />
        <input
          placeholder="Filter payer"
          value={payerFilter}
          onChange={(e) => setPayerFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
        >
          <option value="">All statuses</option>
          {TRACKING.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>Claim #</th>
                <th style={th}>Payer</th>
                <th style={th}>Payer style</th>
                <th style={th}>DOS</th>
                <th style={th}>Amount</th>
                <th style={th}>Status</th>
                <th style={th}>Last updated</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...td, color: '#64748b' }}>
                    No claims match. Try clearing filters or{' '}
                    <Link to="/start">add a claim</Link>.
                  </td>
                </tr>
              )}
              {claims.map((c) => {
                const dos = c.date_of_service ? String(c.date_of_service).slice(0, 10) : '—';
                const updated = c.tracking_updated_at || c.appeal_date || c.created_at || '—';
                const pf = applyPayerFormatting({ payer: c.payer }, c.payer);
                return (
                  <tr key={c.appeal_id}>
                    <td style={td}>{c.claim_id}</td>
                    <td style={td}>{c.payer}</td>
                    <td style={{ ...td, fontSize: 12, color: '#475569' }} title={pf.instructionBlock}>
                      {pf.styleSummary}
                    </td>
                    <td style={td}>{dos}</td>
                    <td style={td}>{formatMoney(c.amount)}</td>
                    <td style={td}>
                      <select
                        value={c.appeal_tracking_status || 'pending'}
                        onChange={(e) => patchStatus(c.appeal_id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 13, maxWidth: 140 }}
                      >
                        {TRACKING.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...td, fontSize: 12, color: '#64748b' }}>{String(updated).replace('T', ' ').slice(0, 19)}</td>
                    <td style={td}>
                      <button
                        type="button"
                        onClick={() => navigate(`/queue/${c.appeal_id}`)}
                        style={{ padding: '4px 10px', cursor: 'pointer' }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
