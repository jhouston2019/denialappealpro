# Quick Start: Usage-Based Pricing System

## Setup & Testing Guide

### Step 1: Run Database Migration

```bash
cd backend
python migrate_usage_tracking.py
```

This adds all new usage tracking fields to the database.

### Step 2: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Step 3: Test the Complete Flow

#### A. Subscribe to a Plan

1. Navigate to `http://localhost:3000/pricing`
2. Enter your email address
3. Click "Subscribe" on the **Starter** plan ($29/month, 50 appeals)
4. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
5. You'll be redirected to `/subscription/success`

#### B. Generate Appeals and Watch Usage

1. Go to `/appeal-form`
2. Upload a denial letter PDF
3. Fill in the form (email should be pre-filled)
4. Submit and generate appeal
5. **Notice:** Usage tracker appears at top showing "1 / 50 appeals"

#### C. Test Usage Thresholds

**70% Threshold (35 appeals):**
- Generate 35 appeals total
- Usage tracker shows yellow warning
- Message: "You're approaching your monthly limit"

**90% Threshold (45 appeals):**
- Generate 45 appeals total
- Usage tracker shows orange warning
- Upgrade modal appears (dismissible)
- Message: "You're close to your limit — upgrade to avoid interruptions"

**100% Threshold (50 appeals):**
- Generate 50 appeals total
- Usage tracker shows red
- Upgrade modal appears
- Message: "You've reached your plan limit"

**Overage (51+ appeals):**
- Continue generating appeals
- Overage notice appears: "Additional appeals are billed at $0.50 each"
- Workflow is NOT interrupted
- Overage count displays: "You've exceeded your plan by X appeals"

#### D. Test Upgrade Flow

1. Click "Upgrade Now" in modal
2. Redirected to `/pricing`
3. Subscribe to **Core** plan ($99/month, 300 appeals)
4. Plan limit updates automatically
5. Usage percentage recalculates

---

## Manual Testing Checklist

### Backend Tests

- [ ] Run `python test_usage_tracking.py` - all tests pass
- [ ] Usage counters increment after appeal generation
- [ ] Daily counter resets at midnight
- [ ] Weekly counter resets on Monday
- [ ] Monthly counter resets on 1st of month
- [ ] Overage count calculates correctly
- [ ] Plan limit updates on subscription change

### Frontend Tests

- [ ] UsageTracker displays on AppealFormWizard
- [ ] UsageTracker displays on AppealDownload
- [ ] Usage updates in real-time after generation
- [ ] Progress bar color changes at thresholds
- [ ] Warning message appears at 70%
- [ ] Upgrade modal appears at 90%
- [ ] Upgrade modal appears at 100%
- [ ] Modal is dismissible
- [ ] "Process Next Denial" button works
- [ ] Pricing page shows new tiers
- [ ] Subscription flow completes successfully

### Integration Tests

- [ ] Email persists across pages
- [ ] User ID saved to localStorage
- [ ] Usage stats fetch correctly by email
- [ ] Upgrade suggestions API works
- [ ] Stripe webhook updates plan limits
- [ ] Overage billing tracked in database

---

## API Testing with cURL

### Get Usage Stats
```bash
curl http://localhost:5000/api/usage/email/test@example.com
```

### Get Upgrade Suggestions
```bash
curl http://localhost:5000/api/upgrade/suggestions/1
```

### Get Pricing Plans
```bash
curl http://localhost:5000/api/pricing/plans
```

---

## Expected API Responses

### Usage Stats Response
```json
{
  "user_id": 1,
  "email": "provider@example.com",
  "subscription_tier": "starter",
  "plan_limit": 50,
  "appeals_generated_monthly": 35,
  "appeals_generated_weekly": 8,
  "appeals_generated_today": 2,
  "usage_percentage": 70.0,
  "overage_count": 0,
  "billing_status": "active",
  "upgrade_status": "warning",
  "can_generate": true
}
```

### Pricing Plans Response
```json
{
  "retail_price": 10.0,
  "subscription_tiers": {
    "starter": {
      "name": "Starter",
      "monthly_price": 29.0,
      "included_appeals": 50,
      "overage_price": 0.5
    },
    "core": {
      "name": "Core",
      "monthly_price": 99.0,
      "included_appeals": 300,
      "overage_price": 0.5
    },
    "scale": {
      "name": "Scale",
      "monthly_price": 249.0,
      "included_appeals": 1000,
      "overage_price": 0.5
    }
  }
}
```

---

## Troubleshooting

### Issue: Usage tracker not showing
**Solution:** Ensure email is entered in the form and saved to context

### Issue: Counters not incrementing
**Solution:** Check that `increment_usage()` is called in appeal generation route

### Issue: Modal not appearing
**Solution:** Verify usage percentage calculation and threshold logic

### Issue: Overage not calculating
**Solution:** Ensure `plan_limit` is set when user subscribes

### Issue: Database migration fails
**Solution:** Check database connection and run `python migrate_usage_tracking.py` again

---

## Production Deployment

### Before Going Live

1. **Update Stripe Price IDs:**
   - Create products in Stripe Dashboard
   - Update `stripe_price_id` in `initialize_pricing_data()`

2. **Set Environment Variables:**
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Configure Webhook:**
   - Add webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Subscribe to events:
     - `checkout.session.completed`
     - `invoice.paid`
     - `customer.subscription.deleted`

4. **Test in Production:**
   - Use Stripe test mode first
   - Verify all webhooks fire correctly
   - Test complete user journey
   - Monitor usage tracking accuracy

---

## Monitoring in Production

### Key Metrics to Track

1. **Usage Distribution:**
   - Average appeals per user per month
   - Percentage of users at each threshold (70%, 90%, 100%)

2. **Upgrade Conversion:**
   - Modal shown vs. upgrades completed
   - Time from warning to upgrade
   - Tier distribution

3. **Overage Revenue:**
   - Total overage appeals per month
   - Average overage per user
   - Overage revenue vs. subscription revenue

4. **User Behavior:**
   - Daily active users
   - Appeals per day (weekday vs. weekend)
   - Retention after hitting limit

### Success Criteria

✓ 80%+ of users reach 70% usage  
✓ 15%+ upgrade conversion at 90% threshold  
✓ < 5% churn after upgrade prompt  
✓ Overage revenue < 10% of MRR  
✓ Average user upgrades within 2 billing cycles  

---

## Next Steps

After successful testing:

1. Deploy to staging environment
2. Run full integration tests
3. Monitor for 1 week
4. Collect user feedback
5. Deploy to production
6. Monitor metrics daily for first month

---

## Support

For issues or questions:
- Check `USAGE_BASED_PRICING_IMPLEMENTATION.md` for detailed documentation
- Review test output from `test_usage_tracking.py`
- Check backend logs for usage tracking events
- Verify database schema with migration script
