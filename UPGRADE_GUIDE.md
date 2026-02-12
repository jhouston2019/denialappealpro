# Denial Appeal Pro - System Upgrade Guide

## Overview

This upgrade transforms Denial Appeal Pro from a single retail tool into a comprehensive denial execution system with:

- **3 Monetization Lanes**: Retail, Subscriptions, and Bulk Credit Packs
- **Payer-Specific Logic**: Intelligent appeal generation based on insurance payer
- **CARC Code Mapping**: Structured denial taxonomy with required sections
- **Timely Filing Validation**: Automatic calculation of filing deadlines
- **Multi-Step Workflow**: Streamlined 3-minute appeal creation process
- **PDF Parsing**: Automatic extraction of denial information

---

## What's New

### Backend Changes

#### 1. New Database Models
- **User**: Tracks email, Stripe customer ID, subscription tier, and credit balance
- **SubscriptionPlan**: Defines monthly subscription tiers (Starter, Growth, Pro)
- **CreditPack**: Defines bulk credit pack offerings
- **Appeal**: Enhanced with `user_id`, `payer`, `appeal_level`, and `credit_used` fields

#### 2. New Modules
- `denial_rules.py`: Maps CARC codes to required sections and strategies
- `timely_filing.py`: Calculates filing deadlines by payer
- `pdf_parser.py`: Extracts information from denial letters
- `credit_manager.py`: Manages credits, subscriptions, and pricing
- `migrate_database.py`: Database migration script

#### 3. Enhanced AI Generation
- Integrates denial rules into prompt generation
- Includes timely filing analysis
- Adds payer-specific context
- Supports multi-level appeals (Level 1, Level 2, External Review)

#### 4. New API Endpoints

**Pricing & Subscriptions:**
- `GET /api/pricing/plans` - Get all pricing tiers
- `POST /api/pricing/subscribe` - Create subscription checkout
- `POST /api/pricing/credits` - Purchase credit pack

**PDF Parsing:**
- `POST /api/parse/denial-letter` - Parse uploaded PDF

**Appeal Generation:**
- `POST /api/appeals/generate/<appeal_id>` - Generate with credits

**Admin:**
- `GET /api/admin/dashboard` - Admin metrics dashboard
- `GET /api/user/<user_id>` - Get user stats

**Enhanced Webhook:**
- Handles subscription activations
- Handles credit pack purchases
- Allocates monthly credits
- Manages subscription cancellations

### Frontend Changes

#### 1. New Pages
- **Pricing.js**: Full pricing page with all tiers
- **AppealFormWizard.js**: 3-step workflow with PDF upload
- **Landing.js**: Updated positioning and messaging

#### 2. Updated Routes
- `/pricing` - Pricing page
- `/appeal-form` - New wizard workflow
- `/submit` - Original form (maintained for compatibility)

---

## Installation & Setup

### 1. Install New Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies added:
- `PyPDF2==3.0.1` - PDF parsing

### 2. Run Database Migration

```bash
cd backend
python migrate_database.py
```

This will:
- Create new tables (users, subscription_plans, credit_packs)
- Add new columns to appeals table
- Initialize pricing data

### 3. Configure Stripe Products

You need to create Stripe products and update the database with actual price IDs.

#### Create Stripe Products:

**Subscriptions:**
```bash
# Starter - $99/month
stripe products create --name "Starter Plan" --description "20 appeals/month"
stripe prices create --product <PRODUCT_ID> --unit-amount 9900 --currency usd --recurring interval=month

# Growth - $299/month
stripe products create --name "Growth Plan" --description "75 appeals/month"
stripe prices create --product <PRODUCT_ID> --unit-amount 29900 --currency usd --recurring interval=month

# Pro - $599/month
stripe products create --name "Pro Plan" --description "200 appeals/month"
stripe prices create --product <PRODUCT_ID> --unit-amount 59900 --currency usd --recurring interval=month
```

**Credit Packs:**
```bash
# 25 Credits - $225
stripe products create --name "25 Credits" --description "25 appeal credits"
stripe prices create --product <PRODUCT_ID> --unit-amount 22500 --currency usd

# 50 Credits - $425
stripe products create --name "50 Credits" --description "50 appeal credits"
stripe prices create --product <PRODUCT_ID> --unit-amount 42500 --currency usd

# 100 Credits - $750
stripe products create --name "100 Credits" --description "100 appeal credits"
stripe prices create --product <PRODUCT_ID> --unit-amount 75000 --currency usd

# 250 Credits - $1750
stripe products create --name "250 Credits" --description "250 appeal credits"
stripe prices create --product <PRODUCT_ID> --unit-amount 175000 --currency usd

# 500 Credits - $3250
stripe products create --name "500 Credits" --description "500 appeal credits"
stripe prices create --product <PRODUCT_ID> --unit-amount 325000 --currency usd
```

#### Update Database with Price IDs:

```python
from app import app
from models import db, SubscriptionPlan, CreditPack

with app.app_context():
    # Update subscription plans
    starter = SubscriptionPlan.query.filter_by(name='starter').first()
    starter.stripe_price_id = 'price_XXXXX'  # Your Stripe price ID
    
    growth = SubscriptionPlan.query.filter_by(name='growth').first()
    growth.stripe_price_id = 'price_XXXXX'
    
    pro = SubscriptionPlan.query.filter_by(name='pro').first()
    pro.stripe_price_id = 'price_XXXXX'
    
    # Update credit packs
    pack_25 = CreditPack.query.filter_by(name='25 Credits').first()
    pack_25.stripe_price_id = 'price_XXXXX'
    
    # ... repeat for all packs
    
    db.session.commit()
```

### 4. Frontend Setup

No additional dependencies needed. The frontend already has `@stripe/stripe-js` installed.

### 5. Test the System

1. **Test Pricing Page**: Navigate to `/pricing`
2. **Test Wizard Flow**: Navigate to `/appeal-form`
3. **Test PDF Parsing**: Upload a denial letter PDF
4. **Test Subscription**: Complete a test subscription purchase
5. **Test Credit Pack**: Purchase a test credit pack
6. **Test Appeal Generation**: Generate an appeal using credits

---

## Pricing Structure

### Retail
- **$10 per appeal**
- No credit storage
- Pay-as-you-go

### Subscriptions

| Tier | Price/Month | Included Credits | Overage Price |
|------|-------------|------------------|---------------|
| Starter | $99 | 20 | $8 |
| Growth | $299 | 75 | $7 |
| Pro | $599 | 200 | $6 |

### Bulk Credit Packs

| Pack | Credits | Price | Per Credit |
|------|---------|-------|------------|
| Small | 25 | $225 | $9.00 |
| Medium | 50 | $425 | $8.50 |
| Large | 100 | $750 | $7.50 |
| XL | 250 | $1,750 | $7.00 |
| XXL | 500 | $3,250 | $6.50 |

---

## New Features

### 1. Denial Rules Engine

Maps CARC codes to:
- Required appeal sections
- Required documentation
- Strategic approach
- Common payer weaknesses

Example:
```python
from denial_rules import get_denial_rule

rule = get_denial_rule('CO-50')
# Returns:
# {
#   'description': 'Medical Necessity',
#   'required_sections': ['Clinical Summary', 'Treatment Rationale', ...],
#   'required_docs': ['Progress Notes', 'Physician Order'],
#   'strategy': 'medical_necessity'
# }
```

### 2. Timely Filing Calculator

Calculates filing deadlines by payer:
```python
from timely_filing import calculate_timely_filing

result = calculate_timely_filing(
    denial_date=denial_date,
    service_date=service_date,
    payer='AETNA',
    appeal_level='level_1'
)
# Returns: status, days_remaining, urgency, recommendations
```

### 3. PDF Parser

Extracts information from denial letters:
```python
from pdf_parser import parse_denial_pdf

result = parse_denial_pdf('path/to/denial.pdf')
# Extracts: denial codes, claim number, payer, dates, amounts
```

### 4. Credit Management

```python
from credit_manager import CreditManager

# Add credits
CreditManager.add_credits(user_id, 25, reason='purchase')

# Deduct credit
CreditManager.deduct_credit(user_id)

# Check balance
balance = CreditManager.get_credit_balance(user_id)
```

---

## Workflow Changes

### Old Workflow (Retail Only)
1. Fill long form
2. Pay $10
3. Generate appeal

### New Workflow (Multi-Lane)

**Option 1: Subscription User**
1. Upload denial letter (auto-extracts info)
2. Confirm extracted data
3. Add details
4. Generate instantly (uses credit)

**Option 2: Credit Pack User**
1. Same as subscription
2. Uses pre-purchased credits

**Option 3: Retail User**
1. Same workflow
2. Pays $10 at generation

---

## API Changes

### Breaking Changes

⚠️ **Appeals now require `email` field**

Old:
```javascript
POST /api/appeals/submit
{
  payer_name: "Aetna",
  claim_number: "123",
  ...
}
```

New:
```javascript
POST /api/appeals/submit
{
  email: "user@example.com",  // NEW: Required
  payer: "Aetna",             // Renamed from payer_name
  claim_number: "123",
  appeal_level: "level_1",    // NEW: Optional
  ...
}
```

### Backward Compatibility

The system maintains backward compatibility:
- Old `payer_name` field is still read (mapped to `payer`)
- Appeals without `user_id` still work (retail mode)
- Old `/submit` route still works

---

## Admin Dashboard

Access metrics at `/api/admin/dashboard`:

```json
{
  "total_users": 150,
  "total_appeals": 500,
  "completed_appeals": 475,
  "retail_revenue": 2500,
  "subscription_counts": {
    "starter": 20,
    "growth": 10,
    "pro": 5
  },
  "top_payers": [...],
  "top_denial_codes": [...],
  "recent_appeals": [...]
}
```

---

## Environment Variables

No new environment variables required. Existing Stripe keys are used.

Optional:
```bash
# If you want to customize pricing
PRICE_PER_APPEAL=10.00
```

---

## Testing Checklist

- [ ] Database migration completed
- [ ] Stripe products created
- [ ] Price IDs updated in database
- [ ] Pricing page loads correctly
- [ ] Wizard workflow completes
- [ ] PDF parsing extracts data
- [ ] Subscription purchase works
- [ ] Credit pack purchase works
- [ ] Monthly credits allocated
- [ ] Appeal generation uses credits
- [ ] Retail payment still works
- [ ] Webhook handles all events
- [ ] Admin dashboard shows data

---

## Rollback Plan

If you need to rollback:

1. Restore `app_backup.py`:
```bash
cd backend
copy app_backup.py app.py
```

2. Keep database as-is (new columns won't break old code)

3. Frontend will still work with old backend

---

## Support

For issues or questions:
1. Check logs in backend console
2. Verify Stripe webhook is receiving events
3. Check database migration completed successfully
4. Ensure all price IDs are correct

---

## Next Steps

1. **Create Stripe Products**: Set up all products and prices
2. **Update Price IDs**: Run the database update script
3. **Test Thoroughly**: Complete the testing checklist
4. **Monitor Webhooks**: Ensure Stripe events are processed
5. **Marketing**: Update website copy and documentation
6. **Training**: Train team on new features

---

## Summary

This upgrade transforms Denial Appeal Pro into a professional denial execution system with:

✅ Multiple revenue streams
✅ Intelligent payer-specific logic
✅ Automated information extraction
✅ Streamlined 3-minute workflow
✅ Comprehensive denial taxonomy
✅ Timely filing validation
✅ Credit management system
✅ Admin analytics dashboard

All while maintaining backward compatibility with existing functionality.
