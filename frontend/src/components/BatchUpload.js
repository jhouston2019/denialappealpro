import React, { useState } from 'react';
import axios from 'axios';

function BatchUpload() {
  const [batchData, setBatchData] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Parse JSON batch data
      const appeals = JSON.parse(batchData);
      
      const response = await axios.post('/api/appeals/batch', {
        appeals: appeals
      });
      
      setResults(response.data);
      setBatchData('');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format');
      } else {
        setError(err.response?.data?.error || 'Batch processing failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const exampleData = [
    {
      payer_name: "UnitedHealthcare",
      plan_type: "commercial",
      claim_number: "CLM001",
      patient_id: "PT001",
      provider_npi: "1234567890",
      date_of_service: "2024-01-15",
      denial_date: "2024-02-01",
      denial_reason_codes: "16,M80",
      appeal_level: "1",
      submission_channel: "fax"
    },
    {
      payer_name: "Aetna",
      plan_type: "commercial",
      claim_number: "CLM002",
      patient_id: "PT002",
      provider_npi: "1234567890",
      date_of_service: "2024-01-20",
      denial_date: "2024-02-05",
      denial_reason_codes: "50,197",
      appeal_level: "1",
      submission_channel: "portal"
    }
  ];

  const loadExample = () => {
    setBatchData(JSON.stringify(exampleData, null, 2));
  };

  return (
    <div className="form-container">
      <h2>Batch Appeal Processing</h2>
      
      <p style={{ marginBottom: '1rem', color: '#7f8c8d' }}>
        Process multiple appeals simultaneously. Provide JSON array of appeal data.
      </p>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div className="alert alert-success">
          <strong>Batch Processing Complete</strong>
          <p style={{ marginTop: '0.5rem' }}>
            Total: {results.total} | 
            Success: {results.results.filter(r => r.status === 'success').length} | 
            Failed: {results.results.filter(r => r.status === 'failed').length}
          </p>
          
          <div style={{ marginTop: '1rem', maxHeight: '300px', overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Claim Number</th>
                  <th>Status</th>
                  <th>Appeal ID / Error</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((result, idx) => (
                  <tr key={idx}>
                    <td>{result.claim_number}</td>
                    <td>
                      <span className={`badge ${result.status === 'success' ? 'badge-success' : 'badge-warning'}`}>
                        {result.status}
                      </span>
                    </td>
                    <td>
                      {result.status === 'success' 
                        ? result.result.appeal_id 
                        : result.result.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Batch Data (JSON Array)</label>
          <textarea
            value={batchData}
            onChange={(e) => setBatchData(e.target.value)}
            rows="15"
            placeholder="Paste JSON array of appeal data here"
            required
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : 'Process Batch'}
          </button>
          <button 
            type="button" 
            className="btn" 
            onClick={loadExample}
            style={{ backgroundColor: '#95a5a6', color: 'white' }}
          >
            Load Example
          </button>
        </div>
      </form>
    </div>
  );
}

export default BatchUpload;
