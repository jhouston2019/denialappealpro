# Stripe Billing Integration - Complete Setup Guide

## Overview

This guide walks you through setting up Stripe billing for Denial Appeal Pro's usage-based SaaS model with:
- 3 subscription tiers (Starter, Core, Scale)
- Metered overage billing ($0.50 per extra appeal)
- Self-service customer portal
- Automated usage tracking and billing

---

## Part 1: Stripe Dashboard Setup

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business verification
3. Switch to **Test Mode** for development (toggle in top-right)

### Step 2: Create Subscription Products

Create 3 products in Stripe Dashboard → Products → Add Product:

#### Product 1: Starter Plan
- **Name**: Starter Plan
- **Description**: Perfect for small practices - 50 appeals/month
- **Pricing**:
  - Type: Recurring
  - Price: $29.00 USD
  - Billing period: Monthly
- **Save** and copy the **Price ID** (starts with `price_`)

#### Product 2: Core Plan
- **Name**: Core Plan
- **Description**: Most popular for growing practices - 300 appeals/month
- **Pricing**:
  - Type: Recurring
  - Price: $99.00 USD
  - Billing period: Monthly
- **Save** and copy the **Price ID**

#### Product 3: Scale Plan
- **Name**: Scale Plan
- **Description**: For high-volume operations - 1,000 appeals/month
- **Pricing**:
  - Type: Recurring
  - Price: $249.00 USD
  - Billing period: Monthly
- **Save** and copy the **Price ID**

### Step 3: Create Metered Overage Price

Create a metered usage price for overages:

1. Go to Products → Add Product
2. **Name**: Overage Appeals
3. **Description**: Additional appeals beyond plan limit
4. **Pricing**:
   - Type: Recurring
   - Usage is metered: **Yes**
   - Price: $0.50 USD
   - Billing period: Monthly
   - Charge for metered usage by: Sum of usage values during period
5. **Save** and copy the **Price ID**

### Step 4: Get API Keys

1. Go to Developers → API keys
2. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### Step 5: Set Up Webhooks

1. Go to Developers → Webhooks → Add endpoint
2. **Endpoint URL**: `https://your-backend-domain.com/api/stripe/webhook`
3. **Events to send**:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. **Add endpoint** and copy the **Signing secret** (starts with `whsec_`)

### Step 6: Enable Customer Portal

1. Go to Settings → Customer portal
2. **Enable** customer portal
3. Configure allowed actions:
   - ✅ Update payment method
   - ✅ Update subscription (upgrade/downgrade)
   - ✅ Cancel subscription
4. **Save changes**

---

## Part 2: Backend Configuration

### Step 1: Update Environment Variables

Edit `backend/.env`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret

# Stripe Price IDs
STRIPE_STARTER_PRICE_ID=price_your_starter_price_id
STRIPE_CORE_PRICE_ID=price_your_core_price_id
STRIPE_SCALE_PRICE_ID=price_your_scale_price_id
STRIPE_OVERAGE_PRICE_ID=price_your_overage_price_id

# Domain for Stripe redirects
DOMAIN=https://your-frontend-domain.com
```

### Step 2: Install Dependencies

```bash
cd backend
pip install stripe
```

### Step 3: Update Database

The database migration should already be applied. If not:

```bash
python migrate_usage_tracking.py
```

This adds:
- `stripe_subscription_id` to users table
- Usage tracking fields
- Plan limits and overage counters

### Step 4: Initialize Pricing Data

Run this to ensure subscription plans are in the database:

```bash
python -c "from app import app, db; from credit_manager import initialize_pricing_data; app.app_context().push(); initialize_pricing_data()"
```

### Step 5: Test Backend Endpoints

Start the backend:

```bash
python app.py
```

Test endpoints:
- `GET /api/pricing/plans` - Should return subscription tiers
- `POST /api/stripe/create-checkout` - Creates checkout session
- `POST /api/stripe/webhook` - Receives Stripe events

---

## Part 3: Frontend Configuration

### Step 1: Update Environment Variables

Edit `frontend/.env`:

```bash
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key
```

### Step 2: Install Dependencies

```bash
cd frontend
npm install @stripe/stripe-js
```

### Step 3: Test Frontend

Start the frontend:

```bash
npm start
```

Navigate to:
- `/pricing` - View subscription plans
- `/billing` - Manage billing (requires logged-in user)

---

## Part 4: Testing the Complete Flow

### Test Subscription Flow

1. Go to `/pricing`
2. Enter email address
3. Click "Subscribe" on any plan
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify redirect to `/subscription/success`
7. Check backend logs for webhook processing

### Test Usage Tracking

1. Go to `/appeal-form`
2. Submit an appeal (uses credit or subscription)
3. Check usage counter updates
4. Verify overage tracking when limit exceeded

### Test Customer Portal

1. Go to `/billing`
2. Click "Manage Subscription"
3. Verify redirect to Stripe Customer Portal
4. Test upgrade/downgrade
5. Test payment method update

### Test Overage Billing

1. Generate appeals beyond plan limit
2. Check backend logs for metered usage reporting
3. Verify overage appears in Stripe Dashboard → Customers → Usage

### Test Webhook Events

Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

---

## Part 5: Production Deployment

### Step 1: Switch to Live Mode

1. In Stripe Dashboard, switch to **Live Mode**
2. Create the same products and prices in live mode
3. Get live API keys and webhook secret

### Step 2: Update Production Environment Variables

Update your production environment (Railway, Heroku, etc.):

```bash
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret

STRIPE_STARTER_PRICE_ID=price_live_starter_id
STRIPE_CORE_PRICE_ID=price_live_core_id
STRIPE_SCALE_PRICE_ID=price_live_scale_id
STRIPE_OVERAGE_PRICE_ID=price_live_overage_id

DOMAIN=https://your-production-domain.com
```

### Step 3: Update Webhook Endpoint

1. In Stripe Dashboard (Live Mode) → Webhooks
2. Add endpoint: `https://your-production-backend.com/api/stripe/webhook`
3. Select same events as test mode
4. Copy new webhook secret

### Step 4: Test Production

1. Use real credit card (will be charged)
2. Verify all flows work in production
3. Monitor Stripe Dashboard for events
4. Check backend logs for webhook processing

---

## Part 6: Monitoring & Maintenance

### Monitor Stripe Dashboard

- **Customers**: View all subscribers
- **Subscriptions**: Track active/canceled subscriptions
- **Invoices**: Monitor billing and payments
- **Usage**: Track metered overage usage
- **Webhooks**: Monitor webhook delivery and failures

### Monitor Backend Logs

Look for:
- `✓ Subscription activated: user X, plan Y`
- `✓ Reported X overage usage for user Y`
- `✓ Invoice paid: user X, monthly usage reset`
- `✓ Subscription cancelled: user X`

### Handle Failed Webhooks

If webhooks fail:
1. Check Stripe Dashboard → Webhooks → Event details
2. Review error messages
3. Fix backend issues
4. Use "Resend event" in Stripe Dashboard

### Handle Failed Payments

Stripe automatically:
- Retries failed payments (Smart Retries)
- Sends email notifications to customers
- Updates subscription status

You can:
- Monitor `customer.subscription.updated` events
- Check `billing_status` in user table
- Send custom notifications if needed

---

## Part 7: Common Issues & Solutions

### Issue: Webhook signature verification fails

**Solution**: Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint secret in Stripe Dashboard.

### Issue: Metered usage not reporting

**Solution**: 
- Verify `STRIPE_OVERAGE_PRICE_ID` is set correctly
- Check that the price is added to checkout session
- Ensure user has `stripe_subscription_id` set

### Issue: Customer portal not working

**Solution**:
- Verify customer portal is enabled in Stripe Dashboard
- Check user has `stripe_customer_id` set
- Ensure API keys are correct

### Issue: Subscription not activating

**Solution**:
- Check webhook is receiving `checkout.session.completed` event
- Verify metadata includes `user_id` and `plan`
- Check backend logs for errors

### Issue: Usage not resetting monthly

**Solution**:
- Verify `invoice.paid` webhook is being received
- Check `last_monthly_reset` field is updating
- Ensure `StripeBilling.handle_invoice_paid()` is called

---

## Part 8: API Reference

### Backend Endpoints

#### Create Checkout Session
```http
POST /api/stripe/create-checkout
Content-Type: application/json

{
  "user_id": 123,
  "plan": "core"
}

Response:
{
  "session_id": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Create Customer Portal Session
```http
POST /api/stripe/create-portal
Content-Type: application/json

{
  "user_id": 123
}

Response:
{
  "url": "https://billing.stripe.com/..."
}
```

#### Get Subscription Info
```http
GET /api/stripe/subscription/{user_id}

Response:
{
  "id": "sub_...",
  "status": "active",
  "current_period_start": 1234567890,
  "current_period_end": 1234567890,
  "cancel_at_period_end": false,
  "plan": "core",
  "plan_limit": 300
}
```

#### Upgrade Subscription
```http
POST /api/stripe/upgrade
Content-Type: application/json

{
  "user_id": 123,
  "plan": "scale"
}

Response:
{
  "status": "success",
  "message": "Upgraded to scale"
}
```

### Frontend Functions

```javascript
import { 
  createSubscriptionCheckout,
  openCustomerPortal,
  getSubscriptionInfo,
  upgradeSubscription
} from './utils/stripe';

// Create subscription
await createSubscriptionCheckout(userId, 'core');

// Open customer portal
await openCustomerPortal(userId);

// Get subscription details
const info = await getSubscriptionInfo(userId);

// Upgrade subscription
await upgradeSubscription(userId, 'scale');
```

---

## Part 9: Stripe Test Cards

Use these test cards in test mode:

| Card Number | Description |
|------------|-------------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0341 | Requires authentication (3D Secure) |
| 4000 0000 0000 9995 | Declined - insufficient funds |
| 4000 0000 0000 0002 | Declined - generic decline |

Use any:
- Future expiration date
- Any 3-digit CVC
- Any postal code

---

## Part 10: Success Checklist

- [ ] Stripe account created and verified
- [ ] 3 subscription products created (Starter, Core, Scale)
- [ ] Metered overage price created
- [ ] API keys copied and set in environment variables
- [ ] Webhook endpoint created and secret copied
- [ ] Customer portal enabled
- [ ] Backend environment variables configured
- [ ] Frontend environment variables configured
- [ ] Database migrated with new fields
- [ ] Test subscription flow works
- [ ] Test usage tracking works
- [ ] Test overage billing works
- [ ] Test customer portal works
- [ ] Test webhook events work
- [ ] Production environment configured
- [ ] Live mode tested with real payment

---

## Support

If you encounter issues:

1. Check Stripe Dashboard → Logs for API errors
2. Check Stripe Dashboard → Webhooks for delivery failures
3. Check backend logs for processing errors
4. Review this guide's Common Issues section
5. Contact Stripe Support for payment-related issues

---

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Metered Billing](https://stripe.com/docs/billing/subscriptions/usage-based)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**System is now production-ready for automated billing!** 🚀
