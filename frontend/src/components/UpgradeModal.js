import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function UpgradeModal({ isOpen, onClose, currentTier, usageStats, nextTier: nextTierProp }) {
  const navigate = useNavigate();
  const [nextTier, setNextTier] = useState(nextTierProp);

  useEffect(() => {
    if (isOpen && !nextTierProp && usageStats?.user_id) {
      fetchNextTier();
    }
  }, [isOpen, usageStats]);

  const fetchNextTier = async () => {
    try {
      const response = await api.get(`/api/upgrade/suggestions/${usageStats.user_id}`);
      if (response.data.next_tier) {
        setNextTier(response.data.next_tier);
      }
    } catch (error) {
      console.error('Error fetching upgrade suggestions:', error);
    }
  };

  if (!isOpen) return null;

  const getTierDisplay = (tier) => {
    const tiers = {
      'starter': { name: 'Starter', price: 29, appeals: 50 },
      'core': { name: 'Core', price: 99, appeals: 300 },
      'scale': { name: 'Scale', price: 249, appeals: 1000 }
    };
    return tiers[tier] || { name: 'Free', price: 0, appeals: 0 };
  };

  const current = getTierDisplay(currentTier);
  const next = nextTier ? {
    name: nextTier.name,
    price: nextTier.monthly_price,
    appeals: nextTier.included_appeals
  } : null;

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            color: '#666',
            cursor: 'pointer',
            padding: '0',
            width: '32px',
            height: '32px',
            lineHeight: '32px'
          }}
        >
          ×
        </button>

        {/* Title */}
        <h2 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#2c3e50',
          marginBottom: '10px',
          marginTop: 0
        }}>
          Upgrade to Continue Processing Denials
        </h2>

        {/* Current Usage */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Current Usage
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50', marginBottom: '4px' }}>
            {usageStats?.appeals_generated_monthly || 0} / {usageStats?.plan_limit || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            appeals this month
          </div>
        </div>

        {/* Current Plan */}
        <div style={{
          borderLeft: '4px solid #dc3545',
          paddingLeft: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
            Current Plan
          </div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
            {current.name} - ${current.price}/month
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {current.appeals} appeals/month
          </div>
        </div>

        {/* Next Plan */}
        {next && (
          <div style={{
            borderLeft: '4px solid #28a745',
            paddingLeft: '16px',
            marginBottom: '32px'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              Upgrade To
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>
              {next.name} - ${next.price}/month
            </div>
            <div style={{ fontSize: '16px', color: '#2c3e50', fontWeight: '600', marginTop: '4px' }}>
              {next.appeals} appeals/month
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              {next.appeals - current.appeals} more appeals per month
            </div>
          </div>
        )}

        {/* Message */}
        <div style={{
          background: '#e7f3ff',
          border: '1px solid #b3d9ff',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#004085',
          lineHeight: '1.6'
        }}>
          {next ? (
            <>
              Upgrade to <strong>{next.name}</strong> to continue processing without limits. 
              You'll get <strong>{next.appeals} appeals/month</strong> to keep your workflow uninterrupted.
            </>
          ) : (
            <>
              You're on the highest plan. Continue processing — additional appeals are billed at $0.50 each.
            </>
          )}
        </div>

        {/* Overage Info */}
        {usageStats?.overage_count > 0 && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#856404'
          }}>
            <strong>Current Overage:</strong> {usageStats.overage_count} appeal{usageStats.overage_count > 1 ? 's' : ''} 
            ({(usageStats.overage_count * 0.50).toFixed(2)} USD)
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {next && (
            <button
              onClick={handleUpgrade}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '18px',
                fontWeight: '600',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Upgrade Now
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: next ? 0 : 1,
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'transparent',
              color: '#666',
              border: '2px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            {next ? 'Maybe Later' : 'Continue'}
          </button>
        </div>

        {/* No Interruption Message */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#666'
        }}>
          You can continue processing denials even at your limit. Overages are billed at $0.50 per appeal.
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
