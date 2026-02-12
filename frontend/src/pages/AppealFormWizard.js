import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function AppealFormWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    payer: '',
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
    appeal_level: 'level_1',
    denial_letter: null
  });

  const appealLevels = [
    { value: 'level_1', label: 'Level 1 - First Appeal' },
    { value: 'level_2', label: 'Level 2 - Second Appeal' },
    { value: 'external_review', label: 'External Review' }
  ];

  const commonDenialCodes = [
    { value: '', label: 'Select a denial code' },
    { value: 'CO-50', label: 'CO-50 - Medical Necessity' },
    { value: 'CO-29', label: 'CO-29 - Timely Filing' },
    { value: 'CO-16', label: 'CO-16 - Prior Authorization' },
    { value: 'CO-18', label: 'CO-18 - Duplicate Claim' },
    { value: 'CO-22', label: 'CO-22 - Coordination of Benefits' },
    { value: 'CO-96', label: 'CO-96 - Non-Covered Charge' },
    { value: 'CO-97', label: 'CO-97 - Benefit Maximum' },
    { value: 'CO-197', label: 'CO-197 - Precertification Absent' }
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData(prev => ({ ...prev, denial_letter: file }));
    setLoading(true);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const response = await api.post('/api/parse/denial-letter', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setParsedData(response.data);
        
        // Auto-fill form with parsed data
        setFormData(prev => ({
          ...prev,
          payer: response.data.payer_name || prev.payer,
          claim_number: response.data.claim_number || prev.claim_number,
          denial_code: response.data.primary_denial_code || prev.denial_code,
          date_of_service: response.data.service_date || prev.date_of_service,
          billed_amount: response.data.billed_amount || prev.billed_amount,
          provider_npi: response.data.provider_npi || prev.provider_npi
        }));

        alert(`✓ Document parsed successfully!\n\nConfidence: ${response.data.confidence}\n\nPlease review and confirm the extracted information.`);
      }
    } catch (error) {
      console.error('Error parsing document:', error);
      alert('Could not automatically extract information. Please enter manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (step === 1 && !formData.denial_letter) {
      alert('Please upload your denial letter');
      return;
    }
    if (step === 2) {
      // Validate extracted data
      if (!formData.payer || !formData.claim_number || !formData.denial_code) {
        alert('Please fill in all required fields');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      alert('Please enter your email address');
      return;
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

      // Check if user has credits
      if (response.data.credit_balance > 0) {
        // User has credits - generate immediately
        const generateResponse = await api.post(`/api/appeals/generate/${response.data.appeal_id}`);
        if (generateResponse.data.status === 'completed') {
          navigate(`/download/${response.data.appeal_id}`);
        }
      } else {
        // No credits - go to payment
        navigate(`/payment/${response.data.appeal_id}`);
      }
    } catch (error) {
      console.error('Appeal submission error:', error);
      
      if (error.response?.status === 402) {
        // No credits available
        alert('You have no available credits. Please purchase credits or pay for this appeal.');
      } else {
        alert('Error submitting appeal: ' + (error.response?.data?.error || error.message));
      }
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Step 1: Upload Denial Letter</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Upload your denial letter or EOB. We'll automatically extract key information.
      </p>

      <div style={{
        border: '2px dashed #ddd',
        borderRadius: '12px',
        padding: '60px 40px',
        textAlign: 'center',
        background: '#f8f9fa',
        marginBottom: '30px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label htmlFor="file-upload" style={{
          display: 'inline-block',
          padding: '15px 40px',
          background: '#007bff',
          color: 'white',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {formData.denial_letter ? 'Change File' : 'Upload Denial Letter'}
        </label>
        {formData.denial_letter && (
          <div style={{ marginTop: '20px', color: '#28a745', fontWeight: '600' }}>
            ✓ {formData.denial_letter.name}
          </div>
        )}
        <p style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
          Supported format: PDF (max 10MB)
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#007bff' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          Analyzing document...
        </div>
      )}

      {parsedData && (
        <div style={{
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h4 style={{ marginTop: 0, color: '#155724' }}>✓ Information Extracted</h4>
          <p style={{ margin: '10px 0', color: '#155724' }}>
            Confidence: <strong>{parsedData.confidence.toUpperCase()}</strong>
          </p>
          <p style={{ margin: 0, color: '#155724', fontSize: '14px' }}>
            Please review the extracted information in the next step.
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Step 2: Confirm Information</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Review and confirm the extracted information. Edit any incorrect fields.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Your Email *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Payer Name *
          </label>
          <input
            type="text"
            name="payer"
            value={formData.payer}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Claim Number *
          </label>
          <input
            type="text"
            name="claim_number"
            value={formData.claim_number}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Denial Code *
          </label>
          <select
            name="denial_code"
            value={formData.denial_code}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          >
            {commonDenialCodes.map(code => (
              <option key={code.value} value={code.value}>{code.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Date of Service *
          </label>
          <input
            type="date"
            name="date_of_service"
            value={formData.date_of_service}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Denial Reason *
        </label>
        <textarea
          name="denial_reason"
          value={formData.denial_reason}
          onChange={handleChange}
          required
          rows="3"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px'
          }}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Step 3: Additional Details</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Provide additional information to strengthen your appeal.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Appeal Level *
        </label>
        <select
          name="appeal_level"
          value={formData.appeal_level}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px'
          }}
        >
          {appealLevels.map(level => (
            <option key={level.value} value={level.value}>{level.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Patient ID *
          </label>
          <input
            type="text"
            name="patient_id"
            value={formData.patient_id}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Billed Amount
          </label>
          <input
            type="number"
            name="billed_amount"
            value={formData.billed_amount}
            onChange={handleChange}
            step="0.01"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Provider Name *
          </label>
          <input
            type="text"
            name="provider_name"
            value={formData.provider_name}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Provider NPI *
          </label>
          <input
            type="text"
            name="provider_npi"
            value={formData.provider_npi}
            onChange={handleChange}
            required
            maxLength="10"
            pattern="\d{10}"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            CPT Codes
          </label>
          <input
            type="text"
            name="cpt_codes"
            value={formData.cpt_codes}
            onChange={handleChange}
            placeholder="e.g., 99213, 99214"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Diagnosis Code (ICD-10)
          </label>
          <input
            type="text"
            name="diagnosis_code"
            value={formData.diagnosis_code}
            onChange={handleChange}
            placeholder="e.g., M54.5"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Progress Indicator */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          {[1, 2, 3].map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '8px',
                background: step >= s ? '#007bff' : '#ddd',
                marginRight: s < 3 ? '10px' : 0,
                borderRadius: '4px',
                transition: 'background 0.3s'
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666' }}>
          <span>Upload</span>
          <span>Confirm</span>
          <span>Details</span>
        </div>
      </div>

      {/* Step Content */}
      <form onSubmit={handleSubmit}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            style={{
              padding: '15px 40px',
              fontSize: '18px',
              fontWeight: '600',
              background: step === 1 ? '#ddd' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: step === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={loading}
              style={{
                padding: '15px 40px',
                fontSize: '18px',
                fontWeight: '600',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '15px 40px',
                fontSize: '18px',
                fontWeight: '600',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Submitting...' : 'Generate Appeal'}
            </button>
          )}
        </div>
      </form>

      {/* Estimated Time */}
      <div style={{
        marginTop: '40px',
        textAlign: 'center',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '14px', color: '#666' }}>
          ⏱️ Estimated completion time: <strong>Under 3 minutes</strong>
        </div>
      </div>
    </div>
  );
}

export default AppealFormWizard;
