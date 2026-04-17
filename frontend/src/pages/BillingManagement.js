import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import api from '../api/axios';
import { openCustomerPortal, getSubscriptionInfo, formatPlanName, getPlanDetails } from '../utils/stripe';
import { PAGE_BG_SLATE, TEXT_ON_SLATE, TEXT_MUTED_ON_SLATE } from '../theme/appShell';

function BillingManagement() {
  const navigate = useNavigate();
  const { userEmail, userId } = useUser();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userEmail || !userId) {
      navigate('/pricing');
      return;
    }
    fetchBillingData();
  }, [userEmail, userId]);

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch subscription info
      const subInfo = await getSubscriptionInfo(userId);
      setSubscription(subInfo);

      // Fetch usage stats
      const usageResponse = await api.get(`/api/usage/${userId}`);
      setUsageStats(usageResponse.data);
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      await openCustomerPortal(userId);
    } catch (err) {
      alert('Error opening billing portal. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading billing information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button onClick={() => navigate('/pricing')} style={styles.button}>
          View Pricing
        </button>
      </div>
    );
  }

  const planDetails = subscription?.plan ? getPlanDetails(subscription.plan) : null;
  const usagePercentage = usageStats?.usage_percentage || 0;
  const overageCount = usageStats?.overage_count || 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Billing & Subscription</h1>
        <p style={styles.subtitle}>Manage your subscription and view usage</p>
      </div>

      {/* Current Plan Section */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Current Plan</h2>
        {subscription ? (
          <div>
            <div style={styles.planInfo}>
              <div style={styles.planName}>
                {formatPlanName(subscription.plan)}
              </div>
              <div style={styles.planPrice}>
                ${planDetails?.price}/month
              </div>
            </div>
            <div style={styles.planDetails}>
              <div style={styles.detailRow}>
                <span>Status:</span>
                <span style={styles.statusBadge(subscription.status)}>
                  {subscription.status}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span>Monthly Appeals:</span>
                <span>{planDetails?.appeals} appeals</span>
              </div>
              <div style={styles.detailRow}>
                <span>Overage Rate:</span>
                <span>$0.50 per additional appeal</span>
              </div>
              {subscription.cancel_at_period_end && (
                <div style={styles.warningBox}>
                  ⚠️ Your subscription will cancel at the end of the current period
                </div>
              )}
            </div>
            <button onClick={handleManageBilling} style={styles.primaryButton}>
              Manage Subscription
            </button>
            <p style={styles.helperText}>
              Upgrade, downgrade, update payment method, or cancel
            </p>
          </div>
        ) : (
          <div>
            <p style={styles.noSubscription}>You don't have an active subscription</p>
            <button onClick={() => navigate('/pricing')} style={styles.primaryButton}>
              View Plans
            </button>
          </div>
        )}
      </div>

      {/* Usage Section */}
      {usageStats && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Usage This Month</h2>
          
          <div style={styles.usageBar}>
            <div style={styles.usageBarFill(usagePercentage)} />
          </div>
          
          <div style={styles.usageStats}>
            <div style={styles.usageStat}>
              <div style={styles.usageNumber}>{usageStats.appeals_generated_monthly}</div>
              <div style={styles.usageLabel}>Appeals Generated</div>
            </div>
            <div style={styles.usageStat}>
              <div style={styles.usageNumber}>{usageStats.plan_limit}</div>
              <div style={styles.usageLabel}>Plan Limit</div>
            </div>
            <div style={styles.usageStat}>
              <div style={styles.usageNumber}>{usagePercentage.toFixed(0)}%</div>
              <div style={styles.usageLabel}>Used</div>
            </div>
          </div>

          {overageCount > 0 && (
            <div style={styles.overageBox}>
              <div style={styles.overageTitle}>Overage Usage</div>
              <div style={styles.overageText}>
                You've processed {overageCount} appeals beyond your plan limit.
              </div>
              <div style={styles.overageCost}>
                Additional charge: ${(overageCount * 0.50).toFixed(2)}
              </div>
              <p style={styles.overageNote}>
                This will be added to your next invoice. Consider upgrading to avoid overage charges.
              </p>
            </div>
          )}

          {usagePercentage >= 70 && usagePercentage < 100 && (
            <div style={styles.warningBox}>
              ⚠️ You're approaching your monthly limit. Consider upgrading to avoid overage charges.
            </div>
          )}

          {usagePercentage >= 100 && overageCount === 0 && (
            <div style={styles.warningBox}>
              🎯 You've reached your plan limit. Additional appeals will incur overage charges at $0.50 each.
            </div>
          )}
        </div>
      )}

      {/* Weekly & Daily Stats */}
      {usageStats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{usageStats.appeals_generated_weekly}</div>
            <div style={styles.statLabel}>Appeals This Week</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{usageStats.appeals_generated_today}</div>
            <div style={styles.statLabel}>Appeals Today</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button onClick={() => navigate('/start')} style={styles.secondaryButton}>
          Process New Denial
        </button>
        <button onClick={() => navigate('/pricing')} style={styles.secondaryButton}>
          View All Plans
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
    background: PAGE_BG_SLATE,
    minHeight: 'calc(100vh - 60px)',
    color: TEXT_ON_SLATE,
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '36px',
    marginBottom: '10px',
    color: TEXT_ON_SLATE,
  },
  subtitle: {
    fontSize: '18px',
    color: TEXT_MUTED_ON_SLATE,
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#2c3e50',
  },
  planInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '8px',
    color: 'white',
  },
  planName: {
    fontSize: '28px',
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: '32px',
    fontWeight: 'bold',
  },
  planDetails: {
    marginBottom: '20px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #eee',
    fontSize: '16px',
  },
  statusBadge: (status) => ({
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'capitalize',
    background: status === 'active' ? '#10b981' : '#ef4444',
    color: 'white',
  }),
  primaryButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#667eea',
    background: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    marginRight: '10px',
  },
  helperText: {
    textAlign: 'center',
    fontSize: '14px',
    color: TEXT_MUTED_ON_SLATE,
    marginTop: '10px',
  },
  noSubscription: {
    textAlign: 'center',
    fontSize: '16px',
    color: TEXT_MUTED_ON_SLATE,
    marginBottom: '20px',
  },
  usageBar: {
    width: '100%',
    height: '12px',
    background: '#e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  usageBarFill: (percentage) => ({
    height: '100%',
    width: `${Math.min(percentage, 100)}%`,
    background: percentage < 70 ? '#10b981' : percentage < 90 ? '#f59e0b' : '#ef4444',
    transition: 'width 0.3s ease',
  }),
  usageStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '20px',
  },
  usageStat: {
    textAlign: 'center',
  },
  usageNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  usageLabel: {
    fontSize: '14px',
    color: '#475569',
    marginTop: '5px',
  },
  overageBox: {
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '20px',
  },
  overageTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: '10px',
  },
  overageText: {
    fontSize: '16px',
    color: '#92400e',
    marginBottom: '10px',
  },
  overageCost: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: '10px',
  },
  overageNote: {
    fontSize: '14px',
    color: '#92400e',
    marginTop: '10px',
  },
  warningBox: {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '15px',
    fontSize: '14px',
    color: '#92400e',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statNumber: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: '16px',
    color: '#475569',
    marginTop: '10px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
  },
  loading: {
    textAlign: 'center',
    fontSize: '18px',
    color: TEXT_MUTED_ON_SLATE,
    padding: '40px',
  },
  error: {
    textAlign: 'center',
    fontSize: '18px',
    color: '#fb923c',
    padding: '40px',
    marginBottom: '20px',
  },
};

export default BillingManagement;
