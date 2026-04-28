import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Pricing.css';

function nextApiOrigin() {
  return (process.env.REACT_APP_NEXT_API_URL || '').replace(/\/$/, '');
}

async function fetchJson(path) {
  const origin = nextApiOrigin();
  const url = origin ? `${origin}${path}` : path;
  const res = await fetch(url, { credentials: origin ? 'omit' : 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Effective monthly when paying for 10 months (2 months free on annual). */
function annualEffectiveMonthly(monthly) {
  return Math.round((monthly * 10) / 12);
}

function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pricingData, setPricingData] = useState(null);
  const [billingAnnual, setBillingAnnual] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const data = await fetchJson('/api/pricing/plans');
      setPricingData(data);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      setPricingData({ error: true });
    }
  };

  const tiers = pricingData?.subscription_tiers;
  const retailPrice = pricingData?.retail_price ?? 79;

  const starter = tiers?.starter;
  const growth = tiers?.core;
  const scale = tiers?.scale;

  const overage = useMemo(
    () => ({
      starter: starter?.overage_price ?? 15,
      growth: growth?.overage_price ?? 12,
      scale: scale?.overage_price ?? 10,
    }),
    [starter, growth, scale]
  );

  const handleSubscribe = async (tier) => {
    setLoading(true);
    try {
      const origin = nextApiOrigin();
      const checkoutPath = '/api/create-checkout-session';
      const url = origin ? `${origin}${checkoutPath}` : checkoutPath;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: tier, type: 'subscription' }),
        credentials: origin ? 'omit' : 'include',
      });
      const out = await res.json();
      if (!res.ok) {
        alert(out.error || 'Error creating subscription.');
        return;
      }
      if (!out.url) {
        alert('No checkout URL returned.');
        return;
      }
      window.location.assign(out.url);
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Error creating subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAppeal = () => {
    navigate('/start');
  };

  if (pricingData == null) {
    return <div className="pricing-page pricing-loading">Loading pricing…</div>;
  }

  const paygFeatures = [
    '1 structured appeal',
    'CPT / ICD validation',
    'Payer-ready formatting',
    'Instant generation',
  ];

  const starterFeatures = [
    'Claim tracking dashboard',
    'Save & manage cases',
    'Email support',
  ];

  const growthFeatures = [
    'Batch appeal generation',
    'Advanced denial categorization',
    'Performance tracking (win rate, $ recovered)',
    'Priority processing',
  ];

  const scaleFeatures = ['Bulk uploads', 'Team access', 'Priority support'];

  const renderPriceBlock = (monthly) => {
    if (!billingAnnual) {
      return (
        <div className="pricing-price">
          ${monthly}
          <span className="unit">/month</span>
        </div>
      );
    }
    const eff = annualEffectiveMonthly(monthly);
    const annualTotal = monthly * 10;
    return (
      <>
        <div className="pricing-price">
          <span className="pricing-strikethrough">${monthly}</span>
          ${eff}
          <span className="unit">/mo</span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.35rem 0 0', lineHeight: 1.4 }}>
          Billed ${annualTotal.toLocaleString()}/year · 2 months free vs. monthly
        </p>
      </>
    );
  };

  return (
    <div className="pricing-page">
      <header className="pricing-hero">
        <h1>Recover More from Denied Claims — Faster</h1>
        <p className="sub">
          Structured appeal logic built for payer review. Used by billing teams to recover revenue and reduce
          denials.
        </p>
      </header>

      <div className="pricing-inner">
        <div className="billing-toggle-wrap">
          <div className="billing-toggle" role="group" aria-label="Billing period">
            <button
              type="button"
              className={!billingAnnual ? 'active' : ''}
              onClick={() => setBillingAnnual(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billingAnnual ? 'active' : ''}
              onClick={() => setBillingAnnual(true)}
            >
              Annual
            </button>
          </div>
          <p className="billing-toggle-hint">
            Annual shows 2 months free (10× monthly billed yearly). Subscription checkout currently processes
            monthly billing in Stripe — contact us to switch to annual invoicing.
          </p>
        </div>

        <div className="pricing-grid">
          {/* Pay as you go */}
          <div className="pricing-card">
            <h3>Pay As You Go</h3>
            <div className="pricing-price">
              ${retailPrice}
              <span className="unit"> per appeal</span>
            </div>
            <p className="pricing-includes" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '1rem' }}>
              No monthly commitment
            </p>
            <ul className="pricing-features">
              {paygFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              type="button"
              className="pricing-cta pricing-cta--ghost"
              onClick={handleRunAppeal}
              disabled={loading}
            >
              Run an Appeal
            </button>
          </div>

          {/* Starter */}
          <div className="pricing-card">
            <h3>Starter</h3>
            {starter ? (
              <>
                {renderPriceBlock(Math.round(starter.monthly_price))}
                <p className="pricing-includes">Includes {starter.included_appeals} appeals / month</p>
              </>
            ) : (
              <>
                <div className="pricing-price">
                  $199<span className="unit">/month</span>
                </div>
                <p className="pricing-includes">Includes 15 appeals / month</p>
              </>
            )}
            <ul className="pricing-features">
              {starterFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              type="button"
              className="pricing-cta pricing-cta--secondary"
              onClick={() => handleSubscribe('starter')}
              disabled={loading}
            >
              {loading ? 'Processing…' : 'Start Starter Plan'}
            </button>
          </div>

          {/* Growth — featured */}
          <div className="pricing-card pricing-card--featured">
            <div className="pricing-badge">Most Popular for Billing Teams</div>
            <h3>Growth</h3>
            {growth ? (
              <>
                {renderPriceBlock(Math.round(growth.monthly_price))}
                <p className="pricing-includes">Includes {growth.included_appeals} appeals / month</p>
              </>
            ) : (
              <>
                <div className="pricing-price">
                  $399<span className="unit">/month</span>
                </div>
                <p className="pricing-includes">Includes 40 appeals / month</p>
              </>
            )}
            <ul className="pricing-features">
              {growthFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              type="button"
              className="pricing-cta pricing-cta--primary"
              onClick={() => handleSubscribe('core')}
              disabled={loading}
            >
              {loading ? 'Processing…' : 'Start Growth Plan'}
            </button>
          </div>

          {/* Scale */}
          <div className="pricing-card">
            <h3>Scale</h3>
            {scale ? (
              <>
                {renderPriceBlock(Math.round(scale.monthly_price))}
                <p className="pricing-includes">Includes {scale.included_appeals} appeals / month</p>
              </>
            ) : (
              <>
                <div className="pricing-price">
                  $799<span className="unit">/month</span>
                </div>
                <p className="pricing-includes">Includes 120 appeals / month</p>
              </>
            )}
            <ul className="pricing-features">
              {scaleFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              type="button"
              className="pricing-cta pricing-cta--secondary"
              onClick={() => handleSubscribe('scale')}
              disabled={loading}
            >
              {loading ? 'Processing…' : 'Start Scale Plan'}
            </button>
          </div>
        </div>

        <section className="pricing-overage" aria-labelledby="overage-heading">
          <h3 id="overage-heading">Overage pricing (per additional appeal)</h3>
          <div className="pricing-overage-grid">
            <div className="pricing-overage-item">
              <strong>Starter</strong>
              ${overage.starter}/appeal
            </div>
            <div className="pricing-overage-item">
              <strong>Growth</strong>
              ${overage.growth}/appeal
            </div>
            <div className="pricing-overage-item">
              <strong>Scale</strong>
              ${overage.scale}/appeal
            </div>
          </div>
        </section>

        <section className="pricing-value" aria-labelledby="value-heading">
          <p id="value-heading">One successful appeal can recover $300–$5,000+</p>
        </section>

        <section className="pricing-steps" aria-labelledby="steps-heading">
          <h3 id="steps-heading">How it works</h3>
          <div className="pricing-steps-row">
            <span className="step">
              <span className="step-num">1</span>
              Upload
            </span>
            <span className="arrow" aria-hidden="true">
              →
            </span>
            <span className="step">
              <span className="step-num">2</span>
              Generate
            </span>
            <span className="arrow" aria-hidden="true">
              →
            </span>
            <span className="step">
              <span className="step-num">3</span>
              Submit
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Pricing;
