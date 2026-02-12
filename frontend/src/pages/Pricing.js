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

  const { subscription_tiers, credit_packs, retail_price } = pricingData;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '42px', marginBottom: '20px' }}>Pricing</h1>
        <p style={{ fontSize: '20px', color: '#666', maxWidth: '700px', margin: '0 auto' }}>
          Choose the plan that fits your denial appeal volume
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
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Monthly Subscriptions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '80px' }}>
        {Object.entries(subscription_tiers).map(([key, tier]) => (
          <div
            key={key}
            style={{
              border: key === 'growth' ? '3px solid #007bff' : '2px solid #ddd',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              position: 'relative',
              background: key === 'growth' ? '#f8f9ff' : 'white'
            }}
          >
            {key === 'growth' && (
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
            <h3 style={{ fontSize: '28px', marginBottom: '10px' }}>{tier.name}</h3>
            <div style={{ fontSize: '48px', fontWeight: '700', color: '#007bff', marginBottom: '10px' }}>
              ${tier.monthly_price}
              <span style={{ fontSize: '20px', color: '#666' }}>/mo</span>
            </div>
            <div style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
              {tier.included_credits} appeals/month included
            </div>
            <ul style={{ textAlign: 'left', marginBottom: '30px', listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '15px' }}>✓ {tier.included_credits} monthly appeals</li>
              <li style={{ marginBottom: '15px' }}>✓ ${tier.overage_price} per additional appeal</li>
              <li style={{ marginBottom: '15px' }}>✓ Payer-specific logic</li>
              <li style={{ marginBottom: '15px' }}>✓ CARC code mapping</li>
              <li style={{ marginBottom: '15px' }}>✓ Timely filing validation</li>
              <li style={{ marginBottom: '15px' }}>✓ Priority support</li>
            </ul>
            <button
              onClick={() => handleSubscribe(key)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                fontWeight: '600',
                background: key === 'growth' ? '#007bff' : '#28a745',
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
        ))}
      </div>

      {/* Bulk Credit Packs */}
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Bulk Credit Packs</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>
        One-time purchases. Credits never expire.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '80px' }}>
        {Object.entries(credit_packs).map(([key, pack]) => (
          <div
            key={key}
            style={{
              border: '2px solid #ddd',
              borderRadius: '12px',
              padding: '25px',
              textAlign: 'center',
              background: 'white'
            }}
          >
            <h4 style={{ fontSize: '24px', marginBottom: '10px' }}>{pack.name}</h4>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#28a745', marginBottom: '10px' }}>
              ${pack.price}
            </div>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
              ${pack.per_credit.toFixed(2)} per appeal
            </div>
            <button
              onClick={() => handleBuyCredits(key)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Processing...' : 'Buy Now'}
            </button>
          </div>
        ))}
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
        <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>Feature Comparison</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Feature</th>
              <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Retail</th>
              <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Starter</th>
              <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Growth</th>
              <th style={{ padding: '15px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Pro</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Price per appeal</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>${retail_price}</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>${(subscription_tiers.starter.monthly_price / subscription_tiers.starter.included_credits).toFixed(2)}</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>${(subscription_tiers.growth.monthly_price / subscription_tiers.growth.included_credits).toFixed(2)}</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>${(subscription_tiers.pro.monthly_price / subscription_tiers.pro.included_credits).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>CARC code mapping</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Payer-specific logic</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Timely filing validation</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>✓</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>Priority support</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Email</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Email + Phone</td>
              <td style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Dedicated</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Pricing;
