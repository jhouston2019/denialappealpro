/**
 * Stripe Integration Utility
 * Handles Stripe checkout and customer portal sessions
 */

import { loadStripe } from '@stripe/stripe-js';
import api from '../api/axios';

// Initialize Stripe with publishable key
let stripePromise = null;

export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('❌ REACT_APP_STRIPE_PUBLISHABLE_KEY is not set');
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

/**
 * Create and redirect to Stripe checkout for subscription
 * 
 * @param {number} userId - User ID
 * @param {string} plan - Plan name (starter, core, scale)
 * @returns {Promise<void>}
 */
export const createSubscriptionCheckout = async (userId, plan) => {
  try {
    // Create checkout session
    const response = await api.post('/api/stripe/create-checkout', {
      user_id: userId,
      plan: plan
    });

    const { session_id } = response.data;

    // Redirect to Stripe Checkout
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId: session_id });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('❌ Error creating checkout:', error);
    throw error;
  }
};

/**
 * Create and redirect to Stripe customer portal
 * Allows users to manage billing, upgrade, downgrade, cancel
 * 
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
export const openCustomerPortal = async (userId) => {
  try {
    // Create portal session
    const response = await api.post('/api/stripe/create-portal', {
      user_id: userId
    });

    const { url } = response.data;

    // Redirect to Stripe Customer Portal
    window.location.href = url;
  } catch (error) {
    console.error('❌ Error opening customer portal:', error);
    throw error;
  }
};

/**
 * Get subscription information
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Subscription details
 */
export const getSubscriptionInfo = async (userId) => {
  try {
    const response = await api.get(`/api/stripe/subscription/${userId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error getting subscription:', error);
    return null;
  }
};

/**
 * Upgrade subscription to a higher tier
 * 
 * @param {number} userId - User ID
 * @param {string} newPlan - New plan name (core, scale)
 * @returns {Promise<boolean>} Success status
 */
export const upgradeSubscription = async (userId, newPlan) => {
  try {
    const response = await api.post('/api/stripe/upgrade', {
      user_id: userId,
      plan: newPlan
    });
    return response.data.status === 'success';
  } catch (error) {
    console.error('❌ Error upgrading subscription:', error);
    throw error;
  }
};

/**
 * Format plan name for display
 */
export const formatPlanName = (plan) => {
  const names = {
    'starter': 'Starter',
    'core': 'Core',
    'scale': 'Scale'
  };
  return names[plan?.toLowerCase()] || plan;
};

/**
 * Get plan details
 */
export const getPlanDetails = (plan) => {
  const plans = {
    'starter': {
      name: 'Starter',
      price: 29,
      appeals: 50,
      description: 'Perfect for small practices'
    },
    'core': {
      name: 'Core',
      price: 99,
      appeals: 300,
      description: 'Most popular for growing practices'
    },
    'scale': {
      name: 'Scale',
      price: 249,
      appeals: 1000,
      description: 'For high-volume operations'
    }
  };
  return plans[plan?.toLowerCase()] || null;
};
