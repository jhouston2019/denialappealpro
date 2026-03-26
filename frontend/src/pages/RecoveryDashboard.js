import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import RecoveryClaimsTable from '../components/RecoveryClaimsTable';

export default function RecoveryDashboard() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/queue');
      setClaims(data.claims || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

      <RecoveryClaimsTable claims={claims} loading={loading} onRefresh={load} />
    </div>
  );
}
