import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import api from '../api/axios';

function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userEmail } = useUser();
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  useEffect(() => {
    verifySubscription();
  }, []);

  const verifySubscription = async () => {
    try {
      const sessionId = searchParams.get('session_id');
      
      if (userEmail) {
        const response = await api.get(`/api/usage/email/${encodeURIComponent(userEmail)}`);
        setSubscriptionInfo(response.data);
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <div style={{ fontSize: '20px', color: '#666' }}>Verifying your subscription...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      {/* Success Icon */}
      <div style={{
        width: '80px',
        height: '80px',
        background: '#28a745',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 30px',
        fontSize: '40px',
        color: 'white'
      }}>
        ✓
      </div>

      {/* Success Message */}
      <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#2c3e50', marginBottom: '16px' }}>
        Subscription Activated!
      </h1>
      
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px', lineHeight: '1.6' }}>
        Your subscription is now active. You can start processing denials immediately.
      </p>

      {/* Subscription Details */}
      {subscriptionInfo && (
        <div style={{
          background: '#f8f9fa',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '40px',
          textAlign: 'left'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
            Your Plan Details
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #dee2e6' }}>
              <span style={{ color: '#666' }}>Plan:</span>
              <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                {subscriptionInfo.subscription_tier ? 
                  subscriptionInfo.subscription_tier.charAt(0).toUpperCase() + subscriptionInfo.subscription_tier.slice(1) 
                  : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #dee2e6' }}>
              <span style={{ color: '#666' }}>Monthly Limit:</span>
              <span style={{ fontWeight: '600', color: '#2c3e50' }}>{subscriptionInfo.plan_limit} appeals</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #dee2e6' }}>
              <span style={{ color: '#666' }}>Current Usage:</span>
              <span style={{ fontWeight: '600', color: '#28a745' }}>
                {subscriptionInfo.appeals_generated_monthly} appeals
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>Overage Rate:</span>
              <span style={{ fontWeight: '600', color: '#2c3e50' }}>$0.50 per appeal</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/start')}
          style={{
            padding: '16px',
            fontSize: '18px',
            fontWeight: '600',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Process Your First Denial
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            background: 'transparent',
            color: '#666',
            border: '2px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Go to Dashboard
        </button>
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '40px',
        background: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '8px',
        padding: '20px',
        fontSize: '14px',
        color: '#004085',
        lineHeight: '1.6'
      }}>
        <strong>No Workflow Interruptions:</strong> Even if you exceed your monthly limit, 
        you can continue processing denials. Additional appeals are billed at $0.50 each.
      </div>
    </div>
  );
}

export default SubscriptionSuccess;
