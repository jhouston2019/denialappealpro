# Quick Start Guide - Denial Appeal Pro Upgrade

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL or SQLite
- Stripe account

---

## Step 1: Install Dependencies (2 minutes)

### Backend
```bash
cd backend
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

---

## Step 2: Run Database Migration (1 minute)

```bash
cd backend
python migrate_database.py
```

You should see:
```
✓ Database schema updated
✓ Appeals table migrated successfully
✓ Pricing data initialized successfully
✅ Database is ready!
```

---

## Step 3: Configure Stripe (Optional - 2 minutes)

### Quick Test Mode
The system works immediately with placeholder price IDs for testing.

### Production Setup
1. Create products in Stripe Dashboard
2. Run the configuration helper:
```bash
python update_stripe_prices.py
```
3. Enter your Stripe price IDs when prompted

---

## Step 4: Start the Application

### Backend
```bash
cd backend
python app.py
```

Server starts on `http://localhost:5000`

### Frontend
```bash
cd frontend
npm start
```

App opens at `http://localhost:3000`

---

## Step 5: Test the System

### Test 1: Pricing Page
1. Navigate to `http://localhost:3000/pricing`
2. Verify all tiers display correctly
3. Enter test email: `test@example.com`

### Test 2: New Wizard Workflow
1. Navigate to `http://localhost:3000/appeal-form`
2. Upload a test PDF (or skip)
3. Complete the 3-step workflow
4. Verify appeal submission

### Test 3: PDF Parsing
1. In the wizard, upload a denial letter PDF
2. Wait for automatic extraction
3. Review extracted information
4. Confidence level should display

---

## What You Get Immediately

### ✅ Working Features (No Configuration Needed)
- Multi-step wizard workflow
- PDF parsing and extraction
- Denial rules engine (17 CARC codes)
- Timely filing calculator (14 payers)
- Payer-specific logic
- Appeal level branching
- Enhanced AI generation
- Credit system (local tracking)
- Admin dashboard
- Updated homepage

### ⏳ Requires Stripe Setup
- Subscription checkout
- Credit pack purchases
- Payment processing
- Webhook events

---

## Quick Test Scenarios

### Scenario 1: Retail User (Works Immediately)
1. Go to `/appeal-form`
2. Upload denial letter
3. Complete form
4. Submit appeal
5. See payment page

### Scenario 2: Test PDF Parsing
1. Go to `/appeal-form`
2. Upload any PDF with text
3. System extracts:
   - Denial codes
   - Claim numbers
   - Payer names
   - Dates
   - Amounts

### Scenario 3: Test Denial Rules
```python
from denial_rules import get_denial_rule

# Test CARC-50 (Medical Necessity)
rule = get_denial_rule('CO-50')
print(rule['required_sections'])
# Output: ['Clinical Summary', 'Treatment Rationale', ...]
```

### Scenario 4: Test Timely Filing
```python
from timely_filing import calculate_timely_filing
from datetime import datetime

result = calculate_timely_filing(
    denial_date=datetime.now(),
    service_date=datetime(2024, 1, 1),
    payer='AETNA',
    appeal_level='level_1'
)
print(result['status'])  # ACTIVE, URGENT, or EXPIRED
print(result['days_remaining'])
```

---

## Verify Installation

### Backend Health Check
```bash
curl http://localhost:5000/health
```
Expected: `{"status":"ok"}`

### Database Check
```bash
curl http://localhost:5000/api/pricing/plans
```
Expected: JSON with subscription tiers and credit packs

### Frontend Check
Open browser to `http://localhost:3000`
Expected: Updated landing page with new positioning

---

## Common Issues & Solutions

### Issue: Database Migration Fails
**Solution:**
```bash
# Reset database (development only)
rm backend/appeals.db  # If using SQLite
python migrate_database.py
```

### Issue: Import Errors
**Solution:**
```bash
cd backend
pip install --upgrade -r requirements.txt
```

### Issue: Frontend Won't Start
**Solution:**
```bash
cd frontend
rm -rf node_modules
npm install
npm start
```

### Issue: Stripe Errors
**Solution:**
System works without Stripe for testing. Stripe is only needed for actual payments.

---

## Quick Configuration Checklist

- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Database migrated successfully
- [ ] Backend server running on :5000
- [ ] Frontend app running on :3000
- [ ] Pricing page loads
- [ ] Wizard workflow works
- [ ] PDF parsing extracts data
- [ ] Admin dashboard accessible

---

## Environment Variables (Optional)

Create `backend/.env`:
```bash
# Database (optional - defaults to SQLite)
DATABASE_URL=postgresql://user:pass@localhost/denialappeal

# Stripe (optional for testing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (optional - uses templates if not set)
OPENAI_API_KEY=sk-...
```

---

## Test Data

### Sample Denial Codes to Test
- `CO-50` - Medical Necessity
- `CO-29` - Timely Filing
- `CO-16` - Prior Authorization
- `CO-18` - Duplicate Claim

### Sample Payers to Test
- AETNA (180 days)
- BLUE CROSS (365 days)
- MEDICARE (365 days)
- UNITED HEALTHCARE (365 days)

### Sample Appeal Levels
- `level_1` - First Appeal
- `level_2` - Second Appeal
- `external_review` - External Review

---

## Next Steps

### For Development
1. Review `IMPLEMENTATION_SUMMARY.md` for technical details
2. Review `UPGRADE_GUIDE.md` for comprehensive documentation
3. Explore the denial rules in `backend/denial_rules.py`
4. Test PDF parsing with real denial letters

### For Production
1. Set up Stripe products
2. Configure webhook endpoint
3. Update price IDs in database
4. Test payment flows end-to-end
5. Monitor admin dashboard

---

## Support & Documentation

### Documentation Files
- `IMPLEMENTATION_SUMMARY.md` - What was built
- `UPGRADE_GUIDE.md` - Complete setup guide
- `QUICK_START.md` - This file

### Key Files to Review
- `backend/denial_rules.py` - Denial taxonomy
- `backend/timely_filing.py` - Filing calculator
- `backend/pdf_parser.py` - PDF extraction
- `backend/credit_manager.py` - Credit system
- `backend/app.py` - API routes

### Test the System
```bash
# Backend tests
cd backend
python -c "from denial_rules import get_all_denial_codes; print(get_all_denial_codes())"

# Check database
python -c "from app import app; from models import *; app.app_context().push(); print(f'Users: {User.query.count()}, Plans: {SubscriptionPlan.query.count()}')"
```

---

## Success! 🎉

You now have a fully functional **Structured Denial Appeal Engine** with:

✅ Payer-specific logic
✅ CARC code mapping
✅ Timely filing validation
✅ PDF auto-extraction
✅ Multi-tier pricing
✅ Credit management
✅ 3-minute workflow

**Ready to process denial appeals!**
