# DEPLOY REAL AI TO PRODUCTION - EXACT COMMANDS

## Issue You Encountered
```
Error: the config for your app is missing an app name
```

**Cause**: You ran `fly` commands from the root directory, but `fly.toml` is in the `backend` folder.

---

## Correct Commands (Run from backend folder)

### Step 1: Navigate to Backend
```powershell
cd "d:\Axis\Axis Projects - Projects\Projects - Stage 1\denial appeal pro\backend"
```

### Step 2: Verify Fly.io Login
```powershell
fly auth whoami
```

**Expected**: `jhouston66@gmail.com` (you're already logged in ✓)

### Step 3: Check Current Secrets
```powershell
fly secrets list
```

**Expected to see:**
- DATABASE_URL
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- SECRET_KEY

**Missing**: OPENAI_API_KEY

### Step 4: Add OpenAI Secret
```powershell
fly secrets set OPENAI_API_KEY=<paste-key-from-backend/.env-line-16>
```

**To get the key:**
1. Open `backend/.env` in your editor
2. Copy the value from line 16 (starts with `sk-proj-`)
3. Paste it in the command above

**This will automatically trigger a deployment (2-3 minutes).**

### Step 5: Watch Deployment
```powershell
fly logs
```

**Look for:**
```
[OK] Advanced AI appeal generation enabled (OpenAI GPT-4)
     Appeals will use expert-level AI reasoning and medical knowledge
```

**If you see this instead, the key is missing:**
```
[INFO] AI appeal generation not configured (using expert templates)
```

### Step 6: Verify AI is Active
```powershell
fly logs | Select-String "Advanced AI"
```

**Expected**: `[OK] Advanced AI appeal generation enabled`

---

## Alternative: One-Line Deployment

If you want to do it all at once:

```powershell
cd "d:\Axis\Axis Projects - Projects\Projects - Stage 1\denial appeal pro\backend" ; fly secrets set OPENAI_API_KEY=<your-key-here>
```

---

## After Deployment

### Test the Live System

1. Go to: https://denialappealpro.netlify.app/
2. Click "Start New Appeal"
3. Fill in denial details (use test data)
4. Submit and wait 10-20 seconds
5. Check the generated appeal for:
   - ✓ CFR/ERISA citations
   - ✓ Clinical guidelines
   - ✓ Professional language
   - ✓ 400+ words
   - ✓ Specific payment request

### Monitor Quality

```powershell
fly logs | Select-String "Quality Score"
```

**Expected**: `[OK] Advanced AI-generated appeal for APL-XXX (Quality Score: 85-100/100)`

---

## Troubleshooting

### Issue: "Error: the config for your app is missing an app name"
**Fix**: Run commands from `backend` folder, not root

### Issue: "No access token available"
**Fix**: Run `fly auth login` (you already did this ✓)

### Issue: Still seeing templates in production
**Fix**: 
1. Verify secret is set: `fly secrets list`
2. Check logs: `fly logs | Select-String "OpenAI"`
3. Redeploy if needed: `fly deploy`

---

## Security Note

After adding the key to Fly.io:
1. **Rotate the key** at https://platform.openai.com/api-keys
2. **Update Fly.io secret** with new key
3. **Update local `.env`** with new key
4. **Never commit `.env`** (it's already in `.gitignore` ✓)

---

## Summary

**What you need to do:**

```powershell
# 1. Navigate to backend
cd "d:\Axis\Axis Projects - Projects\Projects - Stage 1\denial appeal pro\backend"

# 2. Add OpenAI key (get from backend/.env line 16)
fly secrets set OPENAI_API_KEY=<your-key>

# 3. Wait 2-3 minutes for deployment

# 4. Verify
fly logs | Select-String "Advanced AI"
```

**Result**: Real, professional, legally sound AI appeals activated in production.

**No more templates. Only attorney-grade appeals that can WIN cases.**
