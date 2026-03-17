# ⚙️ CONFIGURATION GUIDE - Get Your Site Running in 30 Minutes

## 🎯 WHAT YOU NEED TO CONFIGURE

You need to create 2 files with API keys:
1. `backend/.env` (7 required values)
2. `frontend/.env` (2 required values)

**Current Status**: ❌ Both files missing

---

## 🚀 STEP-BY-STEP CONFIGURATION (30 Minutes)

### STEP 1: Get OpenAI API Key (10 minutes) ⭐ CRITICAL

**Why**: Without this, AI uses basic templates (NOT production-quality)

**How**:
1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Name it "Denial Appeal Pro"
5. Copy the key (starts with `sk-proj-...`)
6. Add $10-20 credit to your account (Billing → Add payment method)

**Cost**: ~$0.03-0.10 per appeal

**You'll get**: `sk-proj-abc123...xyz789`

---

### STEP 2: Get Stripe Keys (15 minutes) ⭐ CRITICAL

**Why**: Can't accept payments without this

**How**:
1. Go to https://stripe.com
2. Sign up for account
3. Go to Developers → API keys
4. Copy these 2 keys:
   - **Publishable key**: `pk_test_...` (safe to expose)
   - **Secret key**: `sk_test_...` (keep private!)

**For webhook secret** (do later, after deployment):
1. Developers → Webhooks → Add endpoint
2. URL: `https://your-backend.com/api/stripe/webhook`
3. Event: `checkout.session.completed`
4. Copy webhook secret: `whsec_...`

**Cost**: Free (2.9% + $0.30 per transaction)

**You'll get**:
- `pk_test_abc123...` (publishable)
- `sk_test_xyz789...` (secret)
- `whsec_def456...` (webhook, after deployment)

---

### STEP 3: Get Database (15 minutes) ⭐ CRITICAL

**Why**: Need to store appeals, payments, outcomes

**Option A: Supabase (Recommended - FREE)**:
1. Go to https://supabase.com
2. Sign up and create new project
3. Project name: "denial-appeal-pro"
4. Database password: (create strong password)
5. Wait 2 minutes for project to provision
6. Go to Settings → Database
7. Copy "Connection string" (URI format)

**You'll get**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Also copy**:
- Project URL: `https://[PROJECT-REF].supabase.co`
- Anon/Public key: `eyJ...` (from Settings → API)

**Option B: Local PostgreSQL** (for testing only):
```bash
# Install PostgreSQL locally
# Then use: postgresql://postgres:password@localhost:5432/denialappeal
```

---

### STEP 4: Create Configuration Files (5 minutes)

#### A. Create `backend/.env`:

Copy this template and fill in YOUR values:

```bash
# Flask Configuration
SECRET_KEY=change-this-to-random-50-character-string

# Database - PostgreSQL REQUIRED
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Supabase Configuration
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_KEY=your-supabase-anon-key-here
SUPABASE_STORAGE_BUCKET=appeals

# OpenAI Configuration (REQUIRED!)
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-actual-key-here
STRIPE_PUBLISHABLE_KEY=pk_test_your-actual-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-netlify-domain.netlify.app

# Application Settings
PRICE_PER_APPEAL=10.00

# Email Configuration (OPTIONAL - skip for now)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# FROM_EMAIL=noreply@denialappealpro.com
```

**Generate SECRET_KEY** (run in terminal):
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

#### B. Create `frontend/.env`:

Copy this template and fill in YOUR values:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000
# For production: REACT_APP_API_URL=https://your-backend.railway.app

# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your-actual-key-here

# Analytics (OPTIONAL - skip for now)
# REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
```

---

## ✅ VERIFICATION (Test It Works)

### 1. Test Backend (with AI):
```bash
cd backend
python app.py
```

**Look for this line**:
```
✅ "Advanced AI appeal generation enabled (OpenAI GPT-4)"
```

**If you see**:
```
⚠️ "OpenAI not available - using template fallback"
```
→ Your OpenAI key is wrong or missing

---

### 2. Test Frontend:
```bash
cd frontend
npm start
```

**Should open**: http://localhost:3000  
**Should see**: Landing page with "Verified AI Technology" badge

---

### 3. Test Full Flow:
1. Click "Get Started" on landing page
2. Fill out appeal form
3. Click "Generate Appeal"
4. Should redirect to payment
5. Use Stripe test card: `4242 4242 4242 4242`
6. Should generate and download PDF

**If payment fails**: Stripe keys are wrong

---

## 🔑 QUICK REFERENCE - What Goes Where

### Backend `.env` (7 required):
```
SECRET_KEY          → Generate with Python
DATABASE_URL        → From Supabase
SUPABASE_URL        → From Supabase
SUPABASE_KEY        → From Supabase
OPENAI_API_KEY      → From OpenAI
STRIPE_SECRET_KEY   → From Stripe (sk_test_...)
STRIPE_PUBLISHABLE_KEY → From Stripe (pk_test_...)
```

### Frontend `.env` (2 required):
```
REACT_APP_API_URL                    → http://localhost:5000 (dev) or your backend URL (prod)
REACT_APP_STRIPE_PUBLISHABLE_KEY     → From Stripe (pk_test_...)
```

---

## 💰 COST TO CONFIGURE

```
OpenAI Account:     FREE (pay per use)
OpenAI Credit:      $10-20 (initial deposit)
Stripe Account:     FREE (pay per transaction)
Supabase Account:   FREE (free tier)
Domain (optional):  $12/year
────────────────────────────────────────
TOTAL:              $10-20 to start
```

---

## ⚠️ COMMON MISTAKES

### 1. Wrong OpenAI Key Format
❌ `OPENAI_API_KEY=your-openai-api-key-here`  
✅ `OPENAI_API_KEY=sk-proj-abc123xyz789...`

### 2. Wrong Stripe Key in Frontend
❌ Using `sk_test_...` (secret key) in frontend  
✅ Using `pk_test_...` (publishable key) in frontend

### 3. Missing Quotes in DATABASE_URL
❌ `DATABASE_URL=postgresql://postgres:pass@word@host...` (password has @)  
✅ `DATABASE_URL=postgresql://postgres:pass%40word@host...` (URL encode special chars)

### 4. Wrong API URL in Production
❌ `REACT_APP_API_URL=http://localhost:5000` (in production)  
✅ `REACT_APP_API_URL=https://your-backend.railway.app`

---

## 🎯 CONFIGURATION CHECKLIST

### Before You Start:
- [ ] Have credit card ready (for OpenAI, Stripe)
- [ ] Have email ready (for account signups)
- [ ] Have 30 minutes uninterrupted time

### Get API Keys:
- [ ] OpenAI API key obtained (`sk-proj-...`)
- [ ] OpenAI account funded ($10-20)
- [ ] Stripe publishable key (`pk_test-...`)
- [ ] Stripe secret key (`sk_test-...`)
- [ ] Supabase database URL
- [ ] Supabase project URL
- [ ] Supabase anon key

### Create Config Files:
- [ ] `backend/.env` created
- [ ] All 7 required values filled in
- [ ] `frontend/.env` created
- [ ] All 2 required values filled in

### Test Locally:
- [ ] Backend starts without errors
- [ ] See "Advanced AI appeal generation enabled"
- [ ] Frontend loads at localhost:3000
- [ ] Can submit test appeal
- [ ] Payment flow works (test mode)
- [ ] PDF downloads successfully

---

## 📝 EXAMPLE - FILLED OUT CORRECTLY

### `backend/.env` (example with fake keys):
```bash
SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

DATABASE_URL=postgresql://postgres:MySecurePass123@db.xyzproject.supabase.co:5432/postgres

SUPABASE_URL=https://xyzproject.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
SUPABASE_STORAGE_BUCKET=appeals

OPENAI_API_KEY=sk-proj-Ab3dEf9hIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMnOp

STRIPE_SECRET_KEY=sk_test_51Abc123xyz789Def456Ghi789Jkl012Mno345Pqr678Stu901Vwx234Yz
STRIPE_PUBLISHABLE_KEY=pk_test_51Abc123xyz789Def456Ghi789Jkl012Mno345Pqr678
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz789def456ghi789jkl012mno345

ALLOWED_ORIGINS=http://localhost:3000,https://denial-appeal-pro.netlify.app

PRICE_PER_APPEAL=10.00
```

### `frontend/.env` (example with fake keys):
```bash
REACT_APP_API_URL=http://localhost:5000

REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51Abc123xyz789Def456Ghi789Jkl012Mno345Pqr678
```

---

## 🔒 SECURITY NOTES

### ✅ SAFE (Can Share):
- `pk_test_...` (Stripe publishable key)
- `REACT_APP_*` variables (frontend env vars)

### ❌ NEVER SHARE:
- `sk_test_...` (Stripe secret key)
- `sk-proj-...` (OpenAI API key)
- `SECRET_KEY` (Flask secret)
- `DATABASE_URL` (contains password)
- `whsec_...` (Stripe webhook secret)

### 🛡️ PROTECT YOUR `.env` FILES:
- ✅ Already in `.gitignore` (won't commit to Git)
- ✅ Never screenshot or share
- ✅ Rotate keys if exposed

---

## 🚨 TROUBLESHOOTING

### "OpenAI not available - using template fallback"
**Problem**: OpenAI key is missing or invalid  
**Fix**: 
1. Check `backend/.env` has `OPENAI_API_KEY=sk-proj-...`
2. Verify key is valid at https://platform.openai.com/api-keys
3. Ensure you have credit in your OpenAI account
4. Restart backend: `python app.py`

### "Stripe payment fails"
**Problem**: Stripe keys are missing or invalid  
**Fix**:
1. Check `backend/.env` has `STRIPE_SECRET_KEY=sk_test_...`
2. Check `frontend/.env` has `REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...`
3. Verify keys match (both from same Stripe account)
4. Restart both backend and frontend

### "Database connection failed"
**Problem**: Database URL is wrong or database doesn't exist  
**Fix**:
1. Check `DATABASE_URL` in `backend/.env`
2. Verify Supabase project is running
3. Test connection: `psql $DATABASE_URL`
4. Run migrations: `python init_database.py`

### "CORS error" in browser console
**Problem**: Frontend URL not in `ALLOWED_ORIGINS`  
**Fix**:
1. Add frontend URL to `backend/.env`: `ALLOWED_ORIGINS=http://localhost:3000`
2. Restart backend

---

## 📋 COPY-PASTE COMMANDS

### 1. Create backend/.env:
```bash
cd backend
cp .env.example .env
# Now edit .env with your actual keys
```

### 2. Create frontend/.env:
```bash
cd frontend
cp .env.example .env
# Now edit .env with your actual keys
```

### 3. Generate SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
# Copy output to SECRET_KEY in backend/.env
```

### 4. Test backend:
```bash
cd backend
python app.py
# Look for: "Advanced AI appeal generation enabled"
```

### 5. Test frontend:
```bash
cd frontend
npm start
# Should open http://localhost:3000
```

---

## 🎯 MINIMUM VIABLE CONFIGURATION

**If you want to test FAST** (skip optional stuff):

### `backend/.env` (minimum):
```bash
SECRET_KEY=generate-with-python-command-above
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
OPENAI_API_KEY=sk-proj-your-key-here
STRIPE_SECRET_KEY=sk_test_your-key-here
STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-secret-here
ALLOWED_ORIGINS=http://localhost:3000
PRICE_PER_APPEAL=10.00
```

### `frontend/.env` (minimum):
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
```

**Skip for now**:
- Email configuration (not needed for MVP)
- Google Analytics (add later)
- Supabase storage (optional for file uploads)

---

## 🔑 WHERE TO GET EACH KEY

| Key | Where to Get | Time | Cost |
|-----|--------------|------|------|
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys | 10 min | $10-20 credit |
| `STRIPE_SECRET_KEY` | https://stripe.com → Developers → API keys | 5 min | Free |
| `STRIPE_PUBLISHABLE_KEY` | https://stripe.com → Developers → API keys | 5 min | Free |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks (after deploy) | 5 min | Free |
| `DATABASE_URL` | https://supabase.com → New project | 15 min | Free |
| `SUPABASE_URL` | Supabase → Settings → API | 1 min | Free |
| `SUPABASE_KEY` | Supabase → Settings → API | 1 min | Free |
| `SECRET_KEY` | Generate with Python | 1 min | Free |

**Total Time**: ~30 minutes  
**Total Cost**: $10-20 (just OpenAI credit)

---

## 🎯 CONFIGURATION PRIORITY

### 🔴 MUST HAVE (Can't run without):
1. `OPENAI_API_KEY` - AI won't work
2. `STRIPE_SECRET_KEY` - Payments won't work
3. `STRIPE_PUBLISHABLE_KEY` - Payments won't work
4. `DATABASE_URL` - Can't store data
5. `SECRET_KEY` - Flask won't start

### 🟡 SHOULD HAVE (Works without, but limited):
6. `STRIPE_WEBHOOK_SECRET` - Payments complete but no confirmation
7. `ALLOWED_ORIGINS` - CORS errors in production
8. `SUPABASE_URL` - File uploads won't work
9. `SUPABASE_KEY` - File uploads won't work

### 🟢 NICE TO HAVE (Optional):
10. Email settings - Skip for MVP
11. Google Analytics - Skip for MVP

---

## 📊 CONFIGURATION STATUS

```
┌─────────────────────────────────────────────┐
│       CONFIGURATION STATUS                  │
├─────────────────────────────────────────────┤
│                                             │
│  backend/.env:        ❌ NOT CREATED        │
│  frontend/.env:       ❌ NOT CREATED        │
│                                             │
│  OpenAI Key:          ❌ MISSING            │
│  Stripe Keys:         ❌ MISSING            │
│  Database:            ❌ MISSING            │
│                                             │
│  READY TO LAUNCH:     ❌ NO                 │
│  TIME TO READY:       ⏰ 30 MINUTES         │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🚀 QUICK START (30 Minutes)

### Minute 0-10: OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create key
3. Add $10 credit
4. Copy key

### Minute 10-15: Stripe
1. Go to https://stripe.com
2. Get API keys from dashboard
3. Copy both keys

### Minute 15-30: Supabase
1. Go to https://supabase.com
2. Create project
3. Copy database URL and keys

### Minute 30: Create Files
1. Create `backend/.env` with all keys
2. Create `frontend/.env` with API URL and Stripe key
3. Test: `python backend/app.py`
4. Test: `npm start` in frontend

### Done! ✅

---

## 💡 PRO TIPS

### 1. Use Test Mode First
- Stripe test keys (`sk_test_...`, `pk_test_...`) don't charge real money
- Test card: `4242 4242 4242 4242`
- Switch to live keys when ready to accept real payments

### 2. Start with Supabase Free Tier
- 500MB database (plenty for MVP)
- 1GB file storage
- Unlimited API requests
- Upgrade later if needed

### 3. Monitor OpenAI Costs
- Set usage limits in OpenAI dashboard
- Start with $10 credit
- Monitor in Billing section
- ~$0.03-0.10 per appeal

### 4. Keep Keys Secure
- Never commit `.env` to Git (already in `.gitignore`)
- Use environment variables in production
- Rotate keys if exposed

---

## 🎯 AFTER CONFIGURATION

Once configured, you can:
1. ✅ Run locally and test everything
2. ✅ Deploy to production (Railway + Netlify)
3. ✅ Start accepting real payments
4. ✅ Generate professional AI appeals
5. ✅ Make money! 💰

**Next**: See `DEPLOY_PHASE_2.md` for deployment guide

---

## 📞 NEED HELP?

### Can't get OpenAI key?
- Need credit card for billing
- Need phone number for verification
- Alternative: Use Anthropic Claude API (requires code changes)

### Can't get Stripe account?
- Need business information
- Need bank account
- Alternative: PayPal, Square (requires code changes)

### Can't get Supabase?
- Alternative: Railway PostgreSQL addon (automatic)
- Alternative: Local PostgreSQL (dev only)

---

## ✅ SUMMARY

**What you need**: 3 accounts (OpenAI, Stripe, Supabase)  
**How long**: 30 minutes  
**How much**: $10-20 initial investment  
**Then what**: Deploy and start making money! 🚀

**The code is ready. You just need the keys.** 🔑
