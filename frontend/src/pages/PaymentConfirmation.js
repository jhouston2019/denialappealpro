import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api from '../api/axios';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function PaymentConfirmation() {
  const { appealId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [appeal, setAppeal] = useState(null);

  useEffect(() => {
    fetchAppeal();
  }, [appealId]);

  const fetchAppeal = async () => {
    try {
      const response = await api.get(`/api/appeals/${appealId}`);
      setAppeal(response.data);
    } catch (error) {
      alert('Appeal not found');
      navigate('/');
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/api/appeals/payment/${appealId}`);
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.session_id
      });
      if (error) {
        alert(error.message);
      }
    } catch (error) {
      alert('Payment failed');
      setLoading(false);
    }
  };

  if (!appeal) {
    return (
      <div className="payment-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{
          display: 'inline-block',
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1e3a8a',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ fontSize: '18px', color: '#666' }}>Loading payment details...</p>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <h2>Payment Required</h2>
      <div style={{ maxWidth: '500px', margin: '2rem auto', background: 'white', padding: '2rem', borderRadius: '4px' }}>
        <p style={{ marginBottom: '1rem' }}>Claim Number: <strong>{appeal.claim_number}</strong></p>
        <p style={{ marginBottom: '1rem' }}>Payer: <strong>{appeal.payer_name}</strong></p>
        <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Amount: <strong>$10.00</strong></p>
        <button className="btn btn-primary btn-large" onClick={handlePayment} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Processing...' : 'Pay $10 & Generate Appeal'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ width: '100%', marginTop: '1rem' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PaymentConfirmation;
