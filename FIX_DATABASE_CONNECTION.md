# 🔧 Fix Database Connection Error

## Problem
Database authentication is failing. The password in your `DATABASE_URL` is incorrect.

**Error:**
```
psycopg2.OperationalError: connection to server at "aws-1-us-east-2.pooler.supabase.com" 
port 6543 failed: FATAL: password authentication failed for user "postgres"
```

---

## Solution: Update DATABASE_URL with Correct Password

### Step 1: Get the Correct Connection String from Supabase

1. Go to https://supabase.com/dashboard
2. Select your project: `denial-appeal-pro`
3. Click **Settings** (gear icon) in the left sidebar
4. Click **Database**
5. Scroll down to **Connection Pooling** section
6. Click the **Session mode** tab (or **Shared Pooler**)
7. You'll see a connection string like:
   ```
   postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
   ```

### Step 2: Replace [YOUR-PASSWORD] with Your Actual Password

**IMPORTANT:** The connection string shows `[YOUR-PASSWORD]` as a placeholder. You need to replace it with the **actual database password** you set when creating the Supabase project.

**Example:**
- ❌ Wrong: `postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres`
- ✅ Correct: `postgresql://postgres.xxx:MyActualPassword123@aws-1-us-east-2.pooler.supabase.com:6543/postgres`

### Step 3: Update Fly.io Secret

Once you have the correct connection string with your actual password:

```bash
fly secrets set DATABASE_URL="postgresql://postgres.xxx:YourActualPassword@aws-1-us-east-2.pooler.supabase.com:6543/postgres" --app denial-appeal-pro
```

**Replace:**
- `postgres.xxx` with your actual project reference
- `YourActualPassword` with your actual database password
- Keep the rest of the URL the same

---

## If You Don't Remember Your Database Password

### Option 1: Reset Database Password

1. Go to Supabase Dashboard → **Settings** → **Database**
2. Scroll to **Database password** section
3. Click **"Reset database password"**
4. Copy the new password
5. Use it in the connection string

### Option 2: Use the Connection String from Project Settings

1. Go to Supabase Dashboard → **Settings** → **Database**
2. Look for **Connection string** section
3. Click **URI** tab
4. Copy the entire string
5. **Manually replace** `[YOUR-PASSWORD]` with your actual password
6. Use that full string in the Fly.io secret

---

## Example: Complete Fix

Let's say your database password is `Duckstorm2026` and your project ref is `stpfrepyjipehqftgies`:

**Correct DATABASE_URL:**
```
postgresql://postgres.stpfrepyjipehqftgies:Duckstorm2026@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

**Set it in Fly.io:**
```bash
fly secrets set DATABASE_URL="postgresql://postgres.stpfrepyjipehqftgies:Duckstorm2026@aws-1-us-east-2.pooler.supabase.com:6543/postgres" --app denial-appeal-pro
```

---

## After Updating

1. Wait 30 seconds for Fly.io to restart with new secret
2. Check health: `curl https://denial-appeal-pro.fly.dev/health`
3. Try submitting the form again

---

## Verify Current DATABASE_URL

To see what's currently set (without showing the password):

```bash
fly secrets list --app denial-appeal-pro
```

You'll see `DATABASE_URL` listed with a digest. If you just updated it, the digest should be different.

---

## Common Mistakes

❌ **Leaving `[YOUR-PASSWORD]` in the string**
```
postgresql://postgres.xxx:[YOUR-PASSWORD]@...
```

❌ **Keeping brackets around password**
```
postgresql://postgres.xxx:[Duckstorm2026]@...
```

✅ **Correct format**
```
postgresql://postgres.xxx:Duckstorm2026@...
```

---

## Still Having Issues?

If the password is definitely correct, try:

1. **Check if database is paused:**
   - Go to Supabase Dashboard → **Settings** → **Database**
   - Make sure project is not paused

2. **Try the direct connection (not pooler):**
   - Use the connection string from the **Connection string** tab
   - Not the **Connection Pooling** tab

3. **Verify Supabase project is active:**
   - Make sure you didn't exceed free tier limits
   - Check for any service interruptions
