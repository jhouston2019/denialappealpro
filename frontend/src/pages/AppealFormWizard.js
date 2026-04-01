import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import { useAppeal } from '../context/AppealContext';
import UsageTracker from '../components/UsageTracker';
import UpgradeModal from '../components/UpgradeModal';
import DenialDocumentDropZone from '../components/DenialDocumentDropZone';

function AppealFormWizard() {
  const navigate = useNavigate();
  const { userEmail, setUser } = useUser();
  const { appealData, uploadedFile } = useAppeal();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [docExtracting, setDocExtracting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeData, setUpgradeData] = useState(null);
  const [formData, setFormData] = useState({
    email: userEmail || '',
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

  useEffect(() => {
    if (userEmail && !formData.email) {
      setFormData(prev => ({ ...prev, email: userEmail }));
    }
  }, [userEmail]);

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

  useEffect(() => {
    try {
      const s = sessionStorage.getItem('dap_wizard_step');
      if (s === '2') {
        setStep(2);
        sessionStorage.removeItem('dap_wizard_step');
      }
    } catch (_) {
      /* ignore */
    }
  }, []);

  const handleUpgradeNeeded = (usageStats) => {
    if (usageStats.upgrade_status === 'limit_reached' || usageStats.upgrade_status === 'approaching_limit') {
      setUpgradeData(usageStats);
      setShowUpgradeModal(true);
    }
  };

  const appealLevels = [
    { value: 'level_1', label: 'Level 1 - First Appeal' },
    { value: 'level_2', label: 'Level 2 - Second Appeal' },
    { value: 'external_review', label: 'External Review' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Save email to context when entered
    if (name === 'email' && value) {
      setUser(value, null);
    }
  };

  const nextStep = () => {
    if (step === 1 && !(uploadedFile ?? formData.denial_letter)) {
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
      Object.keys(formData).forEach((key) => {
        if (key === 'denial_letter') return;
        if (formData[key]) data.append(key, formData[key]);
      });
      const letter = uploadedFile ?? formData.denial_letter;
      if (letter) data.append('denial_letter', letter);

      const response = await api.post('/api/appeals/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Save user ID to context
      if (response.data.user_id) {
        setUser(formData.email, response.data.user_id);
      }

      // Check if user has credits
      if (response.data.credit_balance > 0) {
        // User has credits - generate immediately
        const generateResponse = await api.post(`/api/appeals/generate/${response.data.appeal_id}`);
        if (generateResponse.data.status === 'completed') {
          // Check for upgrade triggers after generation
          if (generateResponse.data.usage_stats) {
            const usageStats = generateResponse.data.usage_stats;
            if (usageStats.upgrade_status) {
              handleUpgradeNeeded(usageStats);
            }
          }
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

      <DenialDocumentDropZone
        accept=".pdf,application/pdf"
        extractAfterDrop
        onFile={(file) => setFormData((prev) => ({ ...prev, denial_letter: file }))}
        onParseResult={(data) => {
          if (data?.success) setParsedData(data);
        }}
        onExtractSuccess={() => setStep(2)}
        onExtractError={() =>
          alert('Could not automatically extract information. Please enter details manually.')
        }
        onUploadingChange={setDocExtracting}
        disabled={loading || docExtracting}
        inputId="wizard-denial-letter-file"
        style={{ padding: '48px 32px', marginBottom: 30 }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <p style={{ margin: '0 0 12px', color: '#334155', fontSize: '18px', fontWeight: 700 }}>
            Drag and drop your denial letter here
          </p>
          <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '15px', lineHeight: 1.5 }}>
            Drop a PDF on this area, or click to upload from your computer
          </p>
          <span
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: '#007bff',
              color: 'white',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {formData.denial_letter ? 'Change file' : 'Choose PDF'}
          </span>
          {formData.denial_letter && (
            <div style={{ marginTop: '18px', color: '#28a745', fontWeight: '600' }}>
              ✓ {formData.denial_letter.name}
            </div>
          )}
          <p style={{ marginTop: '18px', color: '#666', fontSize: '14px' }}>
            Supported format: PDF (max 10MB)
          </p>
        </div>
      </DenialDocumentDropZone>

      {docExtracting && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#007bff' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          Analyzing document…
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
            Confidence:{' '}
            <strong>{String(parsedData.confidence ?? '').toUpperCase() || '—'}</strong>
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
          <input
            type="text"
            name="denial_code"
            value={formData.denial_code}
            onChange={handleChange}
            required
            placeholder="e.g., CO-50, CARC 97 / N122"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          />
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
      {/* Usage Tracker - Show if email is entered */}
      {formData.email && (
        <UsageTracker email={formData.email} onUpgradeNeeded={handleUpgradeNeeded} />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && upgradeData && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={upgradeData.subscription_tier}
          usageStats={upgradeData}
          nextTier={null}
        />
      )}

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
