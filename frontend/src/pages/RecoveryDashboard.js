import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import RecoveryClaimsTable from '../components/RecoveryClaimsTable';

const QUEUE_LIMIT = 25;

export default function RecoveryDashboard() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queuePage, setQueuePage] = useState(1);
  const [queueTotal, setQueueTotal] = useState(null);
  const [countLoading, setCountLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    setCountLoading(true);

    const queueP = api.get(`/api/queue?limit=${QUEUE_LIMIT}&page=${queuePage}`);
    const countP = api.get('/api/queue/count');

    await Promise.all([
      queueP
        .then((res) => {
          setClaims(res.data.claims || []);
        })
        .catch((e) => {
          const raw = e.response?.data?.error ?? e.response?.data?.message ?? e.message;
          setError(typeof raw === 'string' && raw.trim() ? raw : 'Failed to load queue');
        })
        .finally(() => {
          setLoading(false);
        }),
      countP
        .then((res) => {
          const t = res.data?.total;
          setQueueTotal(typeof t === 'number' ? t : null);
        })
        .catch(() => {
          /* total optional for pagination hint */
        })
        .finally(() => {
          setCountLoading(false);
        }),
    ]);
  }, [queuePage]);

  useEffect(() => {
    void load();
  }, [load]);

  const countKnown = typeof queueTotal === 'number';
  const totalPages = countKnown ? Math.max(1, Math.ceil(queueTotal / QUEUE_LIMIT)) : null;
  const canNext = countKnown ? queuePage * QUEUE_LIMIT < queueTotal : claims.length === QUEUE_LIMIT;
  const canPrev = queuePage > 1;
  const paginationTotalHint = countLoading || (!countKnown && canNext);

  const hideTableForFatalError = Boolean(error && claims.length === 0 && !loading);

  const queuePagination =
    canPrev || canNext
      ? {
          page: queuePage,
          totalPages,
          totalClaims: queueTotal,
          countKnown,
          paginationTotalHint,
          canPrev,
          canNext,
          onPrev: () => setQueuePage((p) => Math.max(1, p - 1)),
          onNext: () => setQueuePage((p) => p + 1),
        }
      : undefined;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto', padding: '20px 16px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Recovery dashboard</h1>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: '#475569', maxWidth: 640 }}>
          A simple tool to recover the most money, starting with the highest-value claims.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#64748b' }}>
          <Link to="/start" style={{ color: '#1d4ed8', fontWeight: 600 }}>
            Upload new denial
          </Link>
          {' · '}
          <Link to="/queue" style={{ color: '#1d4ed8', fontWeight: 600 }}>
            Batch queue
          </Link>
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '14px 16px',
            borderRadius: 8,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 14,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ flex: '1 1 220px' }}>{error}</span>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: loading ? '#94a3b8' : '#b91c1c',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!hideTableForFatalError && (
        <RecoveryClaimsTable
          claims={claims}
          loading={loading}
          onRefresh={load}
          queuePagination={queuePagination}
        />
      )}
    </div>
  );
}
