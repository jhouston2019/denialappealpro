import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [pricingData, setPricingData] = useState(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await api.get('/api/pricing/plans');
      setPricingData(response.data);
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const handleSubscribe = async (tier) => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/pricing/subscribe', {
        email,
        tier
      });

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.session_id
      });

      if (error) {
        console.error('Stripe error:', error);
        alert('Payment error: ' + error.message);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Error creating subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = async (packId) => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/pricing/credits', {
        email,
        pack_id: packId
      });

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.session_id
      });

      if (error) {
        console.error('Stripe error:', error);
        alert('Payment error: ' + error.message);
      }
    } catch (error) {
      console.error('Credit purchase error:', error);
      alert('Error purchasing credits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!pricingData) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading pricing...</div>;
  }

  const { subscription_tiers, retail_price } = pricingData;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '42px', marginBottom: '20px' }}>Pricing</h1>
        <p style={{ fontSize: '20px', color: '#666', maxWidth: '700px', margin: '0 auto 16px' }}>
          Choose the plan that fits your denial appeal volume
        </p>
        <p style={{ fontSize: '16px', color: '#2c3e50', fontWeight: '600', maxWidth: '700px', margin: '0 auto' }}>
          Priced based on how many denials you process — not per claim recovery.
        </p>
      </div>

      {/* Email Input */}
      <div style={{ maxWidth: '500px', margin: '0 auto 50px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px'
          }}
        />
      </div>

      {/* Subscription Tiers */}
      <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '32px' }}>Monthly Plans</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '80px' }}>
        {Object.entries(subscription_tiers).map(([key, tier]) => {
          const isPopular = key === 'core';
          const tierNames = { 'starter': 'Starter', 'core': 'Core', 'scale': 'Scale' };
          const displayName = tierNames[key] || tier.name;
          
          return (
            <div
              key={key}
              style={{
                border: isPopular ? '3px solid #007bff' : '2px solid #ddd',
                borderRadius: '12px',
                padding: '30px',
                textAlign: 'center',
                position: 'relative',
                background: isPopular ? '#f8f9ff' : 'white'
              }}
            >
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#007bff',
                  color: 'white',
                  padding: '5px 20px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  MOST POPULAR
                </div>
              )}
              <h3 style={{ fontSize: '28px', marginBottom: '10px', fontWeight: '700' }}>{displayName}</h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#007bff', marginBottom: '10px' }}>
                ${tier.monthly_price}
                <span style={{ fontSize: '20px', color: '#666' }}>/mo</span>
              </div>
              <div style={{ fontSize: '20px', color: '#2c3e50', fontWeight: '600', marginBottom: '30px' }}>
                {tier.included_appeals || tier.included_credits} appeals/month
              </div>
              <ul style={{ textAlign: 'left', marginBottom: '30px', listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '15px', fontSize: '15px' }}>✓ {tier.included_appeals || tier.included_credits} appeals per month</li>
                <li style={{ marginBottom: '15px', fontSize: '15px' }}>✓ $0.50 per additional appeal</li>
                <li style={{ marginBottom: '15px', fontSize: '15px' }}>✓ No workflow interruptions</li>
                <li style={{ marginBottom: '15px', fontSize: '15px' }}>✓ Payer-specific logic</li>
                <li style={{ marginBottom: '15px', fontSize: '15px' }}>✓ CARC code mapping</li>
                <li style={{ marginBottom: '15px', fontSize: '15px' }}>✓ Timely filing validation</li>
                <li style={{ marginBottom: '15px', fontSize: '15px' }}>✓ Priority support</li>
              </ul>
              <button
                onClick={() => handleSubscribe(key)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '18px',
                  fontWeight: '600',
                  background: isPopular ? '#007bff' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Processing...' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Value Proposition */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        marginBottom: '60px',
        color: 'white'
      }}>
        <h3 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: '700' }}>
          Never Stop Processing Denials
        </h3>
        <p style={{ fontSize: '18px', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto', opacity: 0.95 }}>
          All plans include unlimited processing. Even if you exceed your monthly limit, 
          you can continue generating appeals at just <strong>$0.50 per additional appeal</strong>. 
          No interruptions. No workflow friction.
        </p>
      </div>

      {/* Retail Option */}
      <div style={{
        background: '#f8f9fa',
        border: '2px solid #ddd',
        borderRadius: '12px',
        padding: '30px',
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>Single Appeal</h3>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
          Need just one appeal? Pay ${retail_price} per appeal with no commitment.
        </p>
        <button
          onClick={() => navigate('/appeal-form')}
          style={{
            padding: '15px 40px',
            fontSize: '18px',
            fontWeight: '600',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Create Single Appeal
        </button>
      </div>

      {/* Comparison Table */}
      <div style={{ marginTop: '80px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '32px' }}>Plan Comparison</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#2c3e50', color: 'white' }}>
              <th style={{ padding: '18px', textAlign: 'left', fontWeight: '600' }}>Feature</th>
              <th style={{ padding: '18px', textAlign: 'center', fontWeight: '600' }}>Starter</th>
              <th style={{ padding: '18px', textAlign: 'center', fontWeight: '600' }}>Core</th>
              <th style={{ padding: '18px', textAlign: 'center', fontWeight: '600' }}>Scale</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '15px', fontWeight: '600' }}>Monthly Price</td>
              <td style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#007bff' }}>$29</td>
              <td style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#007bff' }}>$99</td>
              <td style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#007bff' }}>$249</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Appeals per month</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: '600' }}>50</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: '600' }}>300</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: '600' }}>1,000</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Price per appeal</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>$0.58</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>$0.33</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>$0.25</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Overage rate</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>$0.50/appeal</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>$0.50/appeal</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>$0.50/appeal</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>No workflow interruptions</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>CARC code mapping</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Payer-specific logic</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Timely filing validation</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
            </tr>
            <tr>
              <td style={{ padding: '15px' }}>Priority support</td>
              <td style={{ padding: '15px', textAlign: 'center' }}>Email</td>
              <td style={{ padding: '15px', textAlign: 'center' }}>Email + Phone</td>
              <td style={{ padding: '15px', textAlign: 'center' }}>Dedicated</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Pricing;
