import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AppealForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    payer_name: '',
    claim_number: '',
    patient_id: '',
    denial_reason: '',
    denial_code: '',
    date_of_service: '',
    cpt_codes: '',
    provider_name: '',
    provider_npi: '',
    timely_filing_deadline: '',
    denial_letter: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, denial_letter: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) data.append(key, formData[key]);
      });

      const response = await axios.post('/api/appeals/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate(`/payment/${response.data.appeal_id}`);
    } catch (error) {
      alert(error.response?.data?.error || 'Submission failed');
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Appeal Submission</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Payer Information</h3>
          <div className="form-group">
            <label>Payer Name *</label>
            <input type="text" name="payer_name" value={formData.payer_name} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-section">
          <h3>Claim Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Claim Number *</label>
              <input type="text" name="claim_number" value={formData.claim_number} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Patient ID / Internal Reference *</label>
              <input type="text" name="patient_id" value={formData.patient_id} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Denial Reason *</label>
            <textarea name="denial_reason" value={formData.denial_reason} onChange={handleChange} rows="3" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Denial Code (Optional)</label>
              <input type="text" name="denial_code" value={formData.denial_code} onChange={handleChange} placeholder="e.g., CO-50, CARC-16" />
            </div>
            <div className="form-group">
              <label>Date of Service *</label>
              <input type="date" name="date_of_service" value={formData.date_of_service} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>CPT / Revenue Codes (Optional)</label>
            <input type="text" name="cpt_codes" value={formData.cpt_codes} onChange={handleChange} placeholder="e.g., 99213, 99214" />
          </div>
        </div>

        <div className="form-section">
          <h3>Provider Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Provider Name *</label>
              <input type="text" name="provider_name" value={formData.provider_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Provider NPI *</label>
              <input type="text" name="provider_npi" value={formData.provider_npi} onChange={handleChange} required />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Timely Filing</h3>
          <div className="form-group">
            <label>Timely Filing Deadline (If Known)</label>
            <input type="date" name="timely_filing_deadline" value={formData.timely_filing_deadline} onChange={handleChange} />
          </div>
        </div>

        <div className="form-section">
          <h3>Documentation</h3>
          <div className="form-group">
            <label>Denial Letter / EOB *</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} required />
            <small>PDF or image format</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Continue to Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AppealForm;
