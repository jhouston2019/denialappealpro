import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AppealDownload() {
  const { appealId } = useParams();
  const navigate = useNavigate();
  const [appeal, setAppeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppeal();
  }, [appealId]);

  const fetchAppeal = async () => {
    try {
      const response = await api.get(`/api/appeals/${appealId}`);
      if (response.data.status !== 'completed') {
        alert('Appeal not ready');
        navigate('/history');
        return;
      }
      setAppeal(response.data);
    } catch (error) {
      alert('Appeal not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    window.open(`${baseURL}/api/appeals/${appealId}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="download-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{
          display: 'inline-block',
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1e3a8a',
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
        <p style={{ fontSize: '18px', color: '#666' }}>Loading your appeal...</p>
      </div>
    );
  }

  if (!appeal) {
    return null;
  }

  return (
    <div className="download-container">
      <h2>Appeal Ready</h2>
      <div style={{ maxWidth: '500px', margin: '2rem auto', background: 'white', padding: '2rem', borderRadius: '4px' }}>
        <p style={{ marginBottom: '1rem' }}>Claim Number: <strong>{appeal.claim_number}</strong></p>
        <p style={{ marginBottom: '1rem' }}>Payer: <strong>{appeal.payer_name}</strong></p>
        <p style={{ marginBottom: '2rem' }}>Appeal generated and ready for download</p>
        <button className="btn btn-primary btn-large" onClick={handleDownload} style={{ width: '100%' }}>
          Download Appeal PDF
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/history')} style={{ width: '100%', marginTop: '1rem' }}>
          View History
        </button>
      </div>
    </div>
  );
}

export default AppealDownload;
