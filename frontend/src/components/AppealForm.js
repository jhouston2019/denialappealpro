import React, { useState } from 'react';
import axios from 'axios';

function AppealForm() {
  const [formData, setFormData] = useState({
    payer_name: '',
    plan_type: 'commercial',
    claim_number: '',
    patient_id: '',
    provider_npi: '',
    date_of_service: '',
    denial_date: '',
    denial_reason_codes: '',
    appeal_level: '1',
    submission_channel: 'fax'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/appeals', formData);
      setResult(response.data);
      
      // Reset form on success
      setFormData({
        payer_name: '',
        plan_type: 'commercial',
        claim_number: '',
        patient_id: '',
        provider_npi: '',
        date_of_service: '',
        denial_date: '',
        denial_reason_codes: '',
        appeal_level: '1',
        submission_channel: 'fax'
      });
    } catch (err) {
      setError(err.response?.data || { error: 'Appeal execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = (appealId, docType) => {
    window.open(`/api/appeals/${appealId}/download/${docType}`, '_blank');
  };

  return (
    <div className="form-container">
      <h2>Appeal Execution</h2>
      
      {error && (
        <div className="alert alert-error">
          <strong>Execution Stopped:</strong> {error.error}
          {error.rules_applied && (
            <pre style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {JSON.stringify(error.rules_applied, null, 2)}
            </pre>
          )}
        </div>
      )}

      {result && (
        <div className="alert alert-success">
          <strong>Appeal Prepared</strong>
          <p style={{ marginTop: '0.5rem' }}>Appeal ID: <strong>{result.appeal_id}</strong></p>
          <p>Status: {result.status}</p>
          <p>Denial Category: {result.denial_category}</p>
          {result.deadline && <p>Deadline: {result.deadline}</p>}
          <p>Price: ${result.price_charged}</p>
          
          <div style={{ marginTop: '1rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => downloadDocument(result.appeal_id, 'letter')}
              style={{ marginRight: '0.5rem' }}
            >
              Download Appeal Letter
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => downloadDocument(result.appeal_id, 'checklist')}
            >
              Download Checklist
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Payer Name *</label>
            <input
              type="text"
              name="payer_name"
              value={formData.payer_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Plan Type *</label>
            <select
              name="plan_type"
              value={formData.plan_type}
              onChange={handleChange}
              required
            >
              <option value="commercial">Commercial</option>
              <option value="medicare">Medicare</option>
              <option value="medicaid">Medicaid</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Claim Number *</label>
            <input
              type="text"
              name="claim_number"
              value={formData.claim_number}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Patient ID *</label>
            <input
              type="text"
              name="patient_id"
              value={formData.patient_id}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Provider NPI *</label>
            <input
              type="text"
              name="provider_npi"
              value={formData.provider_npi}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Date of Service *</label>
            <input
              type="date"
              name="date_of_service"
              value={formData.date_of_service}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Denial Date *</label>
            <input
              type="date"
              name="denial_date"
              value={formData.denial_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Denial Reason Codes (comma-separated) *</label>
            <input
              type="text"
              name="denial_reason_codes"
              value={formData.denial_reason_codes}
              onChange={handleChange}
              placeholder="e.g., 29, 16, 50"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Appeal Level</label>
            <select
              name="appeal_level"
              value={formData.appeal_level}
              onChange={handleChange}
            >
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
            </select>
          </div>

          <div className="form-group">
            <label>Submission Channel *</label>
            <select
              name="submission_channel"
              value={formData.submission_channel}
              onChange={handleChange}
              required
            >
              <option value="portal">Portal</option>
              <option value="fax">Fax</option>
              <option value="mail">Mail</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Execute Appeal'}
        </button>
      </form>
    </div>
  );
}

export default AppealForm;
