import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import DenialDocumentDropZone from '../components/DenialDocumentDropZone';
import { useAppeal } from '../context/AppealContext';
import { mapExtractedToForm } from '../utils/mapExtractedToForm';

function AppealForm() {
  const navigate = useNavigate();
  const { appealData, uploadedFile, mergeAppealData, setUploadedFile } = useAppeal();
  const [loading, setLoading] = useState(false);
  const [docExtracting, setDocExtracting] = useState(false);
  const [pasteTextIntake, setPasteTextIntake] = useState(false);
  const [formData, setFormData] = useState({
    payer_name: '',
    claim_number: '',
    patient_id: '',
    denial_reason: '',
    denial_code: '',
    diagnosis_code: '',
    date_of_service: '',
    cpt_codes: '',
    billed_amount: '',
    provider_name: '',
    provider_npi: '',
    timely_filing_deadline: '',
    denial_letter: null
  });

  useEffect(() => {
    if (!appealData || Object.keys(appealData).length === 0) return;
    setFormData((prev) => {
      const updated = { ...prev };
      Object.keys(appealData).forEach((key) => {
        if (!prev[key] || prev[key] === '') {
          updated[key] = appealData[key];
        }
      });
      return updated;
    });
  }, [appealData]);

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

  const handleDenialFile = (file) => {
    setPasteTextIntake(false);
    setFormData((prev) => ({ ...prev, denial_letter: file }));
  };

  const handlePasteText = useCallback(
    async (text) => {
      try {
        setDocExtracting(true);
        const res = await api.post('/api/parse/denial-text', { text });
        const mapped = mapExtractedToForm(res.data);
        mergeAppealData(mapped);
        setUploadedFile(null);
        if (res.data?.success !== false) {
          setPasteTextIntake(true);
        }
      } catch (err) {
        console.error('Paste parse error:', err);
      } finally {
        setDocExtracting(false);
      }
    },
    [mergeAppealData, setUploadedFile]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate NPI
    if (!validateNPI(formData.provider_npi)) {
      alert('❌ Invalid NPI\n\nProvider NPI must be exactly 10 digits.\nPlease check and try again.');
      return;
    }

    // Validate claim number
    if (!validateClaimNumber(formData.claim_number)) {
      alert('❌ Invalid Claim Number\n\nClaim number must be:\n• At least 5 characters long\n• Contain only letters, numbers, and hyphens\n\nPlease check and try again.');
      return;
    }

    // Validate date of service is not in the future
    const serviceDate = new Date(formData.date_of_service);
    if (serviceDate > new Date()) {
      alert('❌ Invalid Date\n\nDate of service cannot be in the future.\nPlease check and try again.');
      return;
    }

    // Validate timely filing deadline if provided
    if (formData.timely_filing_deadline) {
      const deadline = new Date(formData.timely_filing_deadline);
      if (deadline < new Date()) {
        const proceed = window.confirm(
          '⚠️ Timely Filing Deadline Warning\n\n' +
          'The timely filing deadline has already passed. This may affect your ability to appeal.\n\n' +
          'Do you want to continue anyway?'
        );
        if (!proceed) return;
      }
    }

    // Validate file is attached
    if (!(uploadedFile ?? formData.denial_letter) && !pasteTextIntake) {
      alert('❌ Missing Document\n\nPlease attach your denial letter or EOB (Explanation of Benefits).\n\nAccepted formats: PDF, JPG, JPEG, PNG');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'payer' || key === 'denial_letter') return;
        if (formData[key]) data.append(key, formData[key]);
      });
      const payerVal = (formData.payer_name || formData.payer || '').trim();
      if (payerVal) data.append('payer', payerVal);
      const letter = uploadedFile ?? formData.denial_letter;
      if (letter) data.append('denial_letter', letter);

      await api.post('/api/appeals/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
      });

      navigate('/pricing');
    } catch (error) {
      console.error('Appeal submission error:', error);
      
      let errorMessage = '❌ Submission Failed\n\n';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += 'The request timed out. Please check your internet connection and try again.';
      } else if (error.response) {
        // Server responded with error
        const serverError = error.response.data?.error || 'Unknown server error';
        errorMessage += `Server Error: ${serverError}\n\n`;
        
        if (error.response.status === 422) {
          errorMessage += 'This may be due to:\n• Duplicate appeal for this claim\n• Timely filing deadline passed\n• Invalid data format';
        } else if (error.response.status === 400) {
          errorMessage += 'Please check that all required fields are filled correctly.';
        } else if (error.response.status === 500) {
          errorMessage += 'Server error. Please try again or contact support.';
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage += 'Cannot connect to server.\n\nPlease check:\n• Your internet connection\n• The backend server is running\n• API URL is configured correctly';
      } else {
        errorMessage += error.message || 'An unexpected error occurred';
      }
      
      alert(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Appeal Submission</h2>
      
      {/* Disclaimer */}
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: 0, color: '#856404' }}>⚠️ Important Disclaimer</h3>
        <p style={{ margin: '10px 0', color: '#856404', lineHeight: '1.6' }}>
          This service generates <strong>template appeal letters only</strong>. It does NOT provide medical advice, 
          legal advice, or professional healthcare services.
        </p>
        <p style={{ margin: '10px 0', color: '#856404', lineHeight: '1.6' }}>
          <strong>You are responsible for:</strong>
        </p>
        <ul style={{ margin: '10px 0', color: '#856404', lineHeight: '1.6', paddingLeft: '20px' }}>
          <li>Reviewing all generated content for accuracy and completeness</li>
          <li>Modifying the letter as necessary for your specific case</li>
          <li>Ensuring medical appropriateness before submission</li>
          <li>Compliance with all applicable laws and regulations</li>
        </ul>
        <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#856404' }}>
          By submitting this form, you acknowledge that you are a licensed healthcare provider or authorized 
          representative with the legal right to submit insurance appeals.
        </p>
      </div>

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
              <label>Denial Code *</label>
              <input
                type="text"
                name="denial_code"
                value={formData.denial_code}
                onChange={handleChange}
                required
                placeholder="e.g., CO-50, CARC 97 / N122"
                style={{ padding: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }}
              />
              <small>Enter the payer&apos;s denial / remark codes as shown on the EOB</small>
            </div>
            <div className="form-group">
              <label>Diagnosis Code (ICD-10)</label>
              <input 
                type="text" 
                name="diagnosis_code" 
                value={formData.diagnosis_code} 
                onChange={handleChange} 
                placeholder="e.g., M54.5, E11.9"
              />
              <small>Primary diagnosis code(s) for this service</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date of Service *</label>
              <input type="date" name="date_of_service" value={formData.date_of_service} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>CPT / Revenue Codes (Optional)</label>
              <input type="text" name="cpt_codes" value={formData.cpt_codes} onChange={handleChange} placeholder="e.g., 99213, 99214" />
            </div>
            <div className="form-group">
              <label>Billed Amount (Optional)</label>
              <input 
                type="number" 
                name="billed_amount" 
                value={formData.billed_amount} 
                onChange={handleChange} 
                placeholder="e.g., 250.00"
                step="0.01"
                min="0"
              />
              <small>Total amount billed for this claim</small>
            </div>
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
              <DenialDocumentDropZone
                accept=".pdf,.jpg,.jpeg,.png"
                extractAfterDrop
                onFile={handleDenialFile}
                onPasteText={handlePasteText}
                onUploadingChange={setDocExtracting}
                disabled={loading || docExtracting}
                inputId="submit-denial-letter-file"
              >
                <div style={{ textAlign: 'center', padding: '6px 4px' }}>
                  <strong style={{ fontSize: 15 }}>Drag, drop, or paste your denial here</strong>
                  <p style={{ margin: '8px 0 4px', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
                    Paste text, screenshot, or PDF — we&apos;ll extract it automatically
                  </p>
                  <p style={{ margin: '10px 0 4px', color: '#64748b', fontSize: 14 }}>
                    Or click to browse — PDF, JPG, JPEG, or PNG (max 10MB)
                  </p>
                  {formData.denial_letter && (
                    <p style={{ margin: '8px 0 0', color: '#15803d', fontWeight: 600, fontSize: 14 }}>
                      ✓ {formData.denial_letter.name}
                    </p>
                  )}
                  {docExtracting && (
                    <p style={{ margin: '10px 0 0', color: '#2563eb', fontWeight: 600, fontSize: 14 }}>
                      Extracting fields from PDF…
                    </p>
                  )}
                </div>
              </DenialDocumentDropZone>
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
