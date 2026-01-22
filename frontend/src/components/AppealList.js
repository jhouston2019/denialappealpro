import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AppealList() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('/api/metrics');
      setMetrics(response.data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = (appealId, docType) => {
    window.open(`/api/appeals/${appealId}/download/${docType}`, '_blank');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="table-container">
      <h2>Appeal Execution Records</h2>
      
      {metrics && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ 
            padding: '1rem', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '600', color: '#2c3e50' }}>
              {metrics.appeals_initiated}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
              Appeals Initiated
            </div>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '600', color: '#2c3e50' }}>
              {metrics.appeals_submitted}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
              Appeals Submitted
            </div>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '600', color: '#2c3e50' }}>
              {metrics.appeals_prepared}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
              Appeals Prepared
            </div>
          </div>
        </div>
      )}

      <p style={{ color: '#7f8c8d', fontSize: '0.9rem', marginTop: '1rem' }}>
        Internal metrics only. No outcome tracking.
      </p>
    </div>
  );
}

export default AppealList;
