import React, { useState, useEffect } from 'react';
import api from '../api/axios';

function UsageTracker({ email, onUpgradeNeeded }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (email) {
      fetchUsage();
    }
  }, [email]);

  const fetchUsage = async () => {
    try {
      const response = await api.get(`/api/usage/email/${encodeURIComponent(email)}`);
      setUsage(response.data);
      
      // Trigger upgrade modal if needed
      if (onUpgradeNeeded && response.data.upgrade_status) {
        onUpgradeNeeded(response.data);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return null;
  }

  const getStatusColor = () => {
    if (usage.usage_percentage >= 100) return '#dc3545';
    if (usage.usage_percentage >= 90) return '#fd7e14';
    if (usage.usage_percentage >= 70) return '#ffc107';
    return '#28a745';
  };

  const getStatusMessage = () => {
    if (usage.usage_percentage >= 100) {
      return "You've reached your plan limit";
    }
    if (usage.usage_percentage >= 90) {
      return "You're close to your limit — upgrade to avoid interruptions";
    }
    if (usage.usage_percentage >= 70) {
      return "You're approaching your monthly limit";
    }
    return "On track";
  };

  return (
    <div style={{
      background: 'white',
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '8px',
      padding: '16px 20px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
            Monthly Usage
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            {usage.appeals_generated_monthly} / {usage.plan_limit}
            <span style={{ fontSize: '16px', fontWeight: '400', color: '#666', marginLeft: '8px' }}>
              appeals
            </span>
          </div>
        </div>
        {usage.subscription_tier && (
          <div style={{
            background: '#f8f9fa',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            {usage.subscription_tier.charAt(0).toUpperCase() + usage.subscription_tier.slice(1)} Plan
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        background: '#e9ecef',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '12px'
      }}>
        <div style={{
          width: `${Math.min(100, usage.usage_percentage)}%`,
          height: '100%',
          background: getStatusColor(),
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Status Message */}
      {usage.usage_percentage >= 70 && (
        <div style={{
          fontSize: '14px',
          color: getStatusColor(),
          fontWeight: '600',
          marginBottom: '8px'
        }}>
          {getStatusMessage()}
        </div>
      )}

      {/* Overage Notice */}
      {usage.overage_count > 0 && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          padding: '10px',
          fontSize: '13px',
          color: '#856404',
          marginTop: '12px'
        }}>
          <strong>Overage:</strong> You've exceeded your plan by {usage.overage_count} appeal{usage.overage_count > 1 ? 's' : ''}. 
          Additional appeals are billed at $0.50 each.
        </div>
      )}

      {/* Today's Activity */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e9ecef',
        fontSize: '13px',
        color: '#666'
      }}>
        <div>
          <strong>Today:</strong> {usage.appeals_generated_today}
        </div>
        <div>
          <strong>This Week:</strong> {usage.appeals_generated_weekly}
        </div>
      </div>
    </div>
  );
}

export default UsageTracker;
