import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function UsageDashboard({ email }) {
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await api.get(`/api/usage/email/${encodeURIComponent(email)}`);
      setUsage(response.data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (email) {
      fetchUsage();
    }
  }, [email, fetchUsage]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading usage data...</div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const getStatusColor = () => {
    if (usage.usage_percentage >= 100) return '#dc3545';
    if (usage.usage_percentage >= 90) return '#fd7e14';
    if (usage.usage_percentage >= 70) return '#ffc107';
    return '#28a745';
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' }}>
          Usage Dashboard
        </h1>
        <p style={{ fontSize: '16px', color: '#666' }}>
          Track your denial processing capacity and usage
        </p>
      </div>

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* Monthly Usage Card */}
        <div style={{
          background: 'white',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
            MONTHLY USAGE
          </div>
          <div style={{ fontSize: '40px', fontWeight: '700', color: getStatusColor(), marginBottom: '8px' }}>
            {usage.appeals_generated_monthly}
          </div>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
            of {usage.plan_limit} appeals
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: '#e9ecef',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, usage.usage_percentage)}%`,
              height: '100%',
              background: getStatusColor(),
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Weekly Usage Card */}
        <div style={{
          background: 'white',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
            THIS WEEK
          </div>
          <div style={{ fontSize: '40px', fontWeight: '700', color: '#007bff', marginBottom: '8px' }}>
            {usage.appeals_generated_weekly}
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            appeals processed
          </div>
        </div>

        {/* Today's Usage Card */}
        <div style={{
          background: 'white',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
            TODAY
          </div>
          <div style={{ fontSize: '40px', fontWeight: '700', color: '#17a2b8', marginBottom: '8px' }}>
            {usage.appeals_generated_today}
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            appeals processed
          </div>
        </div>

        {/* Plan Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '600', opacity: 0.9 }}>
            CURRENT PLAN
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            {usage.subscription_tier ? 
              usage.subscription_tier.charAt(0).toUpperCase() + usage.subscription_tier.slice(1) 
              : 'No Plan'}
          </div>
          <div style={{ fontSize: '16px', marginBottom: '16px', opacity: 0.9 }}>
            {usage.plan_limit} appeals/month
          </div>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              fontWeight: '600',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            View Plans
          </button>
        </div>
      </div>

      {/* Overage Alert */}
      {usage.overage_count > 0 && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#856404', marginBottom: '8px' }}>
            Overage This Month
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#856404', marginBottom: '8px' }}>
            {usage.overage_count} appeals
          </div>
          <div style={{ fontSize: '16px', color: '#856404', marginBottom: '16px' }}>
            Additional cost: ${(usage.overage_count * 0.50).toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', color: '#856404', lineHeight: '1.6' }}>
            You've exceeded your plan limit. Additional appeals are billed at $0.50 each. 
            Consider upgrading to avoid overage charges.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <button
          onClick={() => navigate('/start')}
          style={{
            padding: '20px',
            fontSize: '18px',
            fontWeight: '600',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Process New Denial
        </button>
        <button
          onClick={() => navigate('/history')}
          style={{
            padding: '20px',
            fontSize: '18px',
            fontWeight: '600',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          View History
        </button>
        {usage.usage_percentage >= 70 && (
          <button
            onClick={() => navigate('/pricing')}
            style={{
              padding: '20px',
              fontSize: '18px',
              fontWeight: '600',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Upgrade Plan
          </button>
        )}
      </div>
    </div>
  );
}

export default UsageDashboard;
