# 🔧 Quick Fix for Supabase Storage Issue

## Problem
Your submission is failing because Supabase Storage bucket cannot be created due to Row Level Security (RLS) policy restrictions.

**Error in logs:**
```
Warning: Could not create bucket: {'statusCode': 400, 'error': 'Unauthorized', 'message': 'new row violates row-level security policy'}
```

---

## Solution: Create Storage Bucket Manually in Supabase

### Step 1: Go to Supabase Dashboard
1. Visit https://supabase.com/dashboard
2. Select your project: `denial-appeal-pro`

### Step 2: Create Storage Bucket
1. Click **Storage** in the left sidebar
2. Click **"New bucket"** button
3. Fill in:
   - **Name**: `appeals` (must match your `SUPABASE_STORAGE_BUCKET` env var)
   - **Public bucket**: ❌ **NO** (keep it private)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `application/pdf,image/jpeg,image/png`
4. Click **"Create bucket"**

### Step 3: Set Bucket Policies
After creating the bucket, you need to set up policies:

1. Click on the `appeals` bucket
2. Click **"Policies"** tab
3. Click **"New Policy"**

**Policy 1: Allow Service Role to Upload**
```sql
CREATE POLICY "Service role can upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'appeals');
```

**Policy 2: Allow Service Role to Read**
```sql
CREATE POLICY "Service role can read"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'appeals');
```

**Policy 3: Allow Service Role to Delete**
```sql
CREATE POLICY "Service role can delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'appeals');
```

### Step 4: Verify Bucket Exists
1. Go back to **Storage** → **appeals** bucket
2. You should see an empty bucket ready to receive files

---

## Alternative: Use Service Role Key (Easier)

If the above doesn't work, you may need to use the **service_role** key instead of the **anon** key:

### Get Service Role Key:
1. Go to Supabase Dashboard → **Settings** → **API**
2. Find **Project API keys** section
3. Copy the **`service_role`** key (starts with `eyJhb...`)
   - ⚠️ **WARNING**: This key has full access - keep it secret!

### Update Fly.io Secret:
```bash
fly secrets set SUPABASE_KEY="your-service-role-key-here" --app denial-appeal-pro
```

This will give your backend full access to create buckets and upload files.

---

## Fix Fly.io Trial Limitation

The machine stops after 5 minutes because you're on the free trial.

### Option 1: Add Credit Card (Recommended)
1. Go to https://fly.io/dashboard
2. Click **Billing**
3. Add a credit card
4. This enables:
   - Machines run indefinitely
   - Auto-scaling
   - Better performance

**Cost**: ~$5-10/month for this app

### Option 2: Keep Machine Running Manually
Every time it stops, restart it:
```bash
fly machine start 1850e62b2e2668 --app denial-appeal-pro
```

---

## Test Again After Fixes

Once you've:
1. ✅ Created the `appeals` bucket in Supabase
2. ✅ Set up storage policies (or used service_role key)
3. ✅ (Optional) Added credit card to Fly.io

Try submitting the form again!

---

## Quick Test Command

To verify the backend is working:
```bash
curl https://denial-appeal-pro.fly.dev/health
```

Should return: `{"status":"ok"}`

---

## If Still Having Issues

Check the latest logs:
```bash
fly logs --app denial-appeal-pro
```

Look for:
- Any errors during form submission
- Database connection issues
- OpenAI API errors
- Storage upload errors

The logs will show exactly what's failing.
