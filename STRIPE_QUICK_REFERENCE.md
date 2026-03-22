# Stripe Billing - Quick Reference

## 🚀 Quick Start

### 1. Set Environment Variables

```bash
# Backend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_CORE_PRICE_ID=price_...
STRIPE_SCALE_PRICE_ID=price_...
STRIPE_OVERAGE_PRICE_ID=price_...
DOMAIN=http://localhost:3000

# Frontend
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2. Create Stripe Products

In Stripe Dashboard → Products:

| Product | Price | Type | Price ID |
|---------|-------|------|----------|
| Starter Plan | $29/mo | Recurring | Copy to env |
| Core Plan | $99/mo | Recurring | Copy to env |
| Scale Plan | $249/mo | Recurring | Copy to env |
| Overage | $0.50 | Metered | Copy to env |

### 3. Set Up Webhook

1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://your-backend.com/api/stripe/webhook`
3. Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Enable Customer Portal

Stripe Dashboard → Settings → Customer portal → Enable

---

## 📋 API Endpoints

### Subscribe to Plan
```javascript
POST /api/stripe/create-checkout
{
  "user_id": 123,
  "plan": "core"
}
```

### Open Billing Portal
```javascript
POST /api/stripe/create-portal
{
  "user_id": 123
}
```

### Get Subscription Info
```javascript
GET /api/stripe/subscription/{user_id}
```

### Upgrade Plan
```javascript
POST /api/stripe/upgrade
{
  "user_id": 123,
  "plan": "scale"
}
```

---

## 🔧 Frontend Usage

```javascript
import { 
  createSubscriptionCheckout,
  openCustomerPortal,
  getSubscriptionInfo 
} from './utils/stripe';

// Subscribe
await createSubscriptionCheckout(userId, 'core');

// Manage billing
await openCustomerPortal(userId);

// Get info
const info = await getSubscriptionInfo(userId);
```

---

## 🧪 Test Cards

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Declined |

---

## 📊 Pricing Structure

| Plan | Price | Appeals | Overage |
|------|-------|---------|---------|
| Starter | $29/mo | 50 | $0.50 each |
| Core | $99/mo | 300 | $0.50 each |
| Scale | $249/mo | 1000 | $0.50 each |

---

## 🔄 Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription |
| `invoice.paid` | Reset monthly usage |
| `customer.subscription.updated` | Update plan |
| `customer.subscription.deleted` | Cancel subscription |

---

## 🛠️ Testing

### Test Subscription Flow
```bash
# 1. Go to /pricing
# 2. Enter email
# 3. Click Subscribe
# 4. Use card: 4242 4242 4242 4242
# 5. Verify redirect to /subscription/success
```

### Test Webhooks Locally
```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
stripe trigger checkout.session.completed
```

### Test Customer Portal
```bash
# 1. Go to /billing
# 2. Click "Manage Subscription"
# 3. Verify redirect to Stripe portal
```

---

## 🚨 Common Issues

### Webhook fails
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Verify endpoint URL is correct

### Metered billing not working
- Ensure `STRIPE_OVERAGE_PRICE_ID` is set
- Check user has `stripe_subscription_id`

### Portal not working
- Enable customer portal in Stripe Dashboard
- Verify user has `stripe_customer_id`

---

## 📁 Key Files

### Backend
- `backend/stripe_billing.py` - Main billing service
- `backend/app.py` - API endpoints
- `backend/config.py` - Configuration

### Frontend
- `frontend/src/utils/stripe.js` - Stripe utilities
- `frontend/src/pages/BillingManagement.js` - Billing dashboard
- `frontend/src/pages/Pricing.js` - Pricing page

### Documentation
- `STRIPE_SETUP_GUIDE.md` - Complete setup guide
- `STRIPE_BILLING_IMPLEMENTATION.md` - Technical details

---

## ✅ Production Checklist

- [ ] Switch Stripe to Live Mode
- [ ] Create live products and prices
- [ ] Update environment variables with live keys
- [ ] Update webhook endpoint URL
- [ ] Test with real payment
- [ ] Monitor Stripe Dashboard
- [ ] Monitor backend logs

---

## 📞 Support

- Stripe Dashboard → Logs (API errors)
- Stripe Dashboard → Webhooks (delivery failures)
- Backend logs (processing errors)
- `STRIPE_SETUP_GUIDE.md` → Common Issues

---

**For detailed instructions, see `STRIPE_SETUP_GUIDE.md`**
