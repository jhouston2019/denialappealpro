import React from 'react';
import { useNavigate } from 'react-router-dom';

function UpgradeCTA({ usageStats }) {
  const navigate = useNavigate();

  if (!usageStats || usageStats.usage_percentage < 50) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '8px',
      padding: '20px 24px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
    }}>
      <div>
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
          Upgrade Your Plan to Increase Processing Capacity
        </div>
        <div style={{ fontSize: '14px', opacity: 0.95 }}>
          You've used {usageStats.appeals_generated_monthly} of {usageStats.plan_limit} appeals this month
        </div>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        style={{
          padding: '12px 28px',
          fontSize: '16px',
          fontWeight: '600',
          background: 'white',
          color: '#667eea',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        View Plans
      </button>
    </div>
  );
}

export default UpgradeCTA;
