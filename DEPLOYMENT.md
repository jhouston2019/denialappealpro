# 🚀 Deployment Guide: Supabase + Fly.io + Netlify

This guide walks you through deploying Denial Appeal Pro using:
- **Supabase**: PostgreSQL database + file storage
- **Fly.io**: Backend Flask API hosting (free tier)
- **Netlify**: Frontend React hosting (already configured)

---

## 📋 Prerequisites

1. **Accounts needed:**
   - [Supabase account](https://supabase.com) (free tier)
   - [Fly.io account](https://fly.io) (free tier)
   - [Netlify account](https://netlify.com) (already have)
   - [Stripe account](https://stripe.com) (payment processing)

2. **Tools to install:**
   - [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/)
   - Git (already installed)

---

## PART 1: Set Up Supabase (Database + Storage)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: `denial-appeal-pro`
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
4. Click "Create new project" (takes 1-2 minutes)

### Step 2: Get Supabase Credentials

Once project is created:

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://[your-project-ref].supabase.co`
   - **Project API keys** > **anon public**: `eyJhb...`
   - **Project API keys** > **service_role**: `eyJhb...` (keep secret!)

3. Go to **Settings** > **Database**
4. Scroll to **Connection Pooler** section
5. Select **Session mode** tab (or **Shared Pooler**)
6. Copy the connection string:
   ```
   postgresql://postgres.[your-ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### Step 3: Create Storage Bucket

1. Go to **Storage** in left sidebar
2. Click "Create a new bucket"
3. Fill in:
   - **Name**: `appeals`
   - **Public bucket**: OFF (keep private)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `application/pdf,image/jpeg,image/png`
4. Click "Create bucket"

### Step 4: Set Up Storage Policies

1. Click on your `appeals` bucket
2. Go to **Policies** tab
3. Click "New Policy" > "Create policy from scratch"
4. Add this policy for authenticated uploads:

**Policy name**: Allow authenticated uploads
```sql
(bucket_id = 'appeals'::text)
```

**For operation**: INSERT
**Policy definition**:
```sql
true
```

5. Add policy for authenticated downloads:

**Policy name**: Allow authenticated downloads
**For operation**: SELECT
**Policy definition**:
```sql
true
```

---

## PART 2: Deploy Backend to Fly.io

### Step 1: Install Fly.io CLI

**Windows (PowerShell):**
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**Mac/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login to Fly.io

```bash
fly auth login
```

This opens a browser - confirm login.

### Step 3: Navigate to Backend Folder

```bash
cd "d:\Axis\Axis Projects - Projects\Projects - Stage 1\denial appeal pro\backend"
```

### Step 4: Launch Fly.io App

```bash
fly launch
```

When prompted:
- **App name**: `denial-appeal-pro` (or your preferred name)
- **Region**: Choose same as Supabase (e.g., `iad` for US East)
- **Would you like to set up a PostgreSQL database?**: **NO** (using Supabase)
- **Would you like to set up an Upstash Redis database?**: **NO**
- **Would you like to deploy now?**: **NO** (set secrets first)

### Step 5: Set Environment Variables (Secrets)

```bash
# Flask secret key (generate a random one)
fly secrets set SECRET_KEY="your-super-secret-key-here"

# OpenAI API key (for AI-powered appeal generation)
fly secrets set OPENAI_API_KEY="sk-proj-..."

# Supabase credentials
fly secrets set SUPABASE_URL="https://[your-project-ref].supabase.co"
fly secrets set SUPABASE_KEY="your-supabase-anon-key"
fly secrets set SUPABASE_STORAGE_BUCKET="appeals"

# Database URL (from Supabase - use Shared Pooler connection string)
fly secrets set DATABASE_URL="postgresql://postgres.[your-ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Stripe keys
fly secrets set STRIPE_SECRET_KEY="sk_test_..."
fly secrets set STRIPE_WEBHOOK_SECRET="whsec_..."

# CORS - add your Netlify domain
fly secrets set ALLOWED_ORIGINS="https://your-site.netlify.app,http://localhost:3000"

# Price
fly secrets set PRICE_PER_APPEAL="10.00"
```

### Step 6: Deploy

```bash
fly deploy
```

Wait 2-3 minutes for deployment.

### Step 7: Get Your Backend URL

```bash
fly status
```

Your backend URL will be: `https://denial-appeal-pro.fly.dev`

### Step 8: Test Backend

```bash
curl https://denial-appeal-pro.fly.dev/health
```

Should return: `{"status": "healthy"}`

---

## PART 3: Update Frontend (Netlify)

### Step 1: Update Environment Variables

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: `denial-appeal-pro`
3. Go to **Site settings** > **Environment variables**
4. Add/Update:

```
REACT_APP_API_URL=https://denial-appeal-pro.fly.dev
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Step 2: Trigger Redeploy

1. Go to **Deploys** tab
2. Click **Trigger deploy** > **Deploy site**

Or push to GitHub (auto-deploys):
```bash
git add .
git commit -m "Update for production deployment"
git push origin main
```

---

## PART 4: Configure Stripe Webhooks

### Step 1: Get Webhook URL

Your webhook URL: `https://denial-appeal-pro.fly.dev/api/webhook/stripe`

### Step 2: Create Webhook in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** > **Webhooks**
3. Click **Add endpoint**
4. Fill in:
   - **Endpoint URL**: `https://denial-appeal-pro.fly.dev/api/webhook/stripe`
   - **Events to send**: Select:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
5. Click **Add endpoint**

### Step 3: Get Webhook Secret

1. Click on your newly created webhook
2. Click **Reveal** under **Signing secret**
3. Copy the webhook secret (starts with `whsec_`)

### Step 4: Add Webhook Secret to Fly.io

```bash
fly secrets set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

---

## PART 5: Initialize Database

### Step 1: Create Tables

```bash
fly ssh console
```

Once connected:
```bash
python
```

In Python:
```python
from app import app, db
with app.app_context():
    db.create_all()
    print("Database tables created!")
exit()
```

Type `exit` to leave SSH session.

---

## PART 6: Test Everything

### Test 1: Frontend Loads
Visit: `https://your-site.netlify.app`

### Test 2: Submit Test Appeal
1. Fill out form
2. Submit appeal
3. Check if redirected to payment

### Test 3: Test Payment
Use Stripe test card:
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

### Test 4: Download PDF
After payment, verify PDF downloads successfully.

### Test 5: Check Supabase Storage
1. Go to Supabase Storage
2. Check `appeals` bucket
3. Verify PDF file is there

---

## 🎉 You're Live!

Your stack:
- ✅ **Frontend**: https://your-site.netlify.app
- ✅ **Backend**: https://denial-appeal-pro.fly.dev
- ✅ **Database**: Supabase PostgreSQL
- ✅ **Storage**: Supabase Storage
- ✅ **Payments**: Stripe

---

## 📊 Monitoring & Logs

### View Backend Logs
```bash
fly logs
```

### View Metrics
```bash
fly status
fly dashboard
```

### Supabase Logs
Go to Supabase Dashboard > **Logs**

---

## 💰 Costs

**Free Tier Limits:**
- **Fly.io**: 3 shared VMs (1GB RAM total) - $0
- **Supabase**: 500MB database, 1GB storage - $0
- **Netlify**: 100GB bandwidth - $0
- **Stripe**: No monthly fee, 2.9% + $0.30 per transaction

**When you outgrow free tier:**
- **Fly.io**: ~$5-15/month
- **Supabase Pro**: $25/month
- **Netlify Pro**: $19/month

---

## 🔧 Common Issues

### Issue: "Connection refused" when testing backend
**Solution**: Wait 2-3 minutes after deployment. Fly.io machines auto-sleep and wake on request.

### Issue: "Database connection failed"
**Solution**: Double-check DATABASE_URL includes password and correct pooler URL.

### Issue: "Supabase storage upload failed"
**Solution**: Verify storage policies are set to allow authenticated operations.

### Issue: CORS errors
**Solution**: Make sure ALLOWED_ORIGINS includes your Netlify domain without trailing slash.

---

## 🔄 Updates & Redeployment

### Update Backend Code
```bash
cd backend
git pull
fly deploy
```

### Update Frontend
Just push to GitHub - Netlify auto-deploys.

---

## 📞 Support

- **Fly.io Docs**: https://fly.io/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs

---

**Questions?** Check the main README.md for additional information.
