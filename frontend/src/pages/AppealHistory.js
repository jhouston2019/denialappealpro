import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { PAGE_BG_SLATE, TEXT_ON_SLATE } from '../theme/appShell';

function AppealHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appeals, setAppeals] = useState([]);

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    try {
      const response = await api.get('/api/appeals/history');
      setAppeals(response.data.appeals || []);
    } catch (error) {
      console.error('Failed to load appeals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: PAGE_BG_SLATE,
          minHeight: 'calc(100vh - 60px)',
          color: TEXT_ON_SLATE,
        }}
      >
        <div style={{
          display: 'inline-block',
          width: '50px',
          height: '50px',
          border: '4px solid rgba(148, 163, 184, 0.35)',
          borderTop: '4px solid #22c55e',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ fontSize: '18px', color: TEXT_ON_SLATE }}>Loading appeal history...</p>
      </div>
    );
  }

  return (
    <div style={{ background: PAGE_BG_SLATE, minHeight: 'calc(100vh - 60px)', padding: '2rem 1rem' }}>
    <div className="history-container">
      <h2>Appeal History</h2>
      {appeals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>No appeals yet</p>
          <button className="btn btn-primary" onClick={() => navigate('/submit')} style={{ marginTop: '1rem' }}>
            Generate Appeal
          </button>
        </div>
      ) : (
        <ul className="history-list">
          {appeals.map(appeal => (
            <li key={appeal.id} className="history-item">
              <div>
                <strong>Claim {appeal.claim_number}</strong>
                <p>Payer: {appeal.payer_name}</p>
                <p>Status: {appeal.status}</p>
                {appeal.status === 'completed' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const base = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                      window.open(`${base}/api/appeals/${appeal.appeal_id}/download`, '_blank');
                    }}
                  >
                    Download
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
    </div>
  );
}

export default AppealHistory;
