import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

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

  const validateNPI = (npi) => {
    // NPI must be exactly 10 digits
    return /^\d{10}$/.test(npi);
  };

  const validateClaimNumber = (claimNumber) => {
    // Claim number should be alphanumeric and at least 5 characters
    return claimNumber.length >= 5 && /^[a-zA-Z0-9-]+$/.test(claimNumber);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, denial_letter: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate NPI
    if (!validateNPI(formData.provider_npi)) {
      alert('Provider NPI must be exactly 10 digits');
      return;
    }

    // Validate claim number
    if (!validateClaimNumber(formData.claim_number)) {
      alert('Claim number must be at least 5 characters and contain only letters, numbers, and hyphens');
      return;
    }

    // Validate date of service is not in the future
    const serviceDate = new Date(formData.date_of_service);
    if (serviceDate > new Date()) {
      alert('Date of service cannot be in the future');
      return;
    }

    // Validate timely filing deadline if provided
    if (formData.timely_filing_deadline) {
      const deadline = new Date(formData.timely_filing_deadline);
      if (deadline < new Date()) {
        alert('Warning: Timely filing deadline has already passed. You may not be able to submit this appeal.');
        // Allow to continue but warn user
      }
    }

    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) data.append(key, formData[key]);
      });

      const response = await api.post('/api/appeals/submit', data, {
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
              <input 
                type="text" 
                name="claim_number" 
                value={formData.claim_number} 
                onChange={handleChange} 
                minLength="5"
                placeholder="e.g., CLM-2024-12345"
                required 
              />
              <small>Minimum 5 characters</small>
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
              <input 
                type="text" 
                name="provider_npi" 
                value={formData.provider_npi} 
                onChange={handleChange} 
                pattern="\d{10}"
                maxLength="10"
                placeholder="10-digit NPI number"
                required 
              />
              <small>Must be exactly 10 digits</small>
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
              <small>PDF or image format (max 10MB)</small>
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
