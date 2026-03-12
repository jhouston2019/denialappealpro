# CRITICAL: GET NEW OPENAI API KEY

## Issue Detected

The OpenAI key in your `backend/.env` file is **INVALID**:

```
[WARNING] OpenAI connection failed: Error code: 401 - Incorrect API key provided
```

**This means:**
- The key is expired, revoked, or has incorrect characters
- Production is falling back to templates
- Users are NOT getting real AI appeals

---

## Solution: Generate New API Key

### Step 1: Go to OpenAI Platform
https://platform.openai.com/api-keys

### Step 2: Create New Secret Key
1. Click "Create new secret key"
2. Name it: "Denial Appeal Pro - Production"
3. Copy the key (starts with `sk-proj-`)
4. **SAVE IT IMMEDIATELY** (you can't see it again)

### Step 3: Add to Fly.io
```powershell
cd "d:\Axis\Axis Projects - Projects\Projects - Stage 1\denial appeal pro\backend"
fly secrets set OPENAI_API_KEY=<paste-new-key-here> -a denial-appeal-pro
```

### Step 4: Update Local .env
Open `backend/.env` and replace line 16 with the new key:
```
OPENAI_API_KEY=sk-proj-<new-key-here>
```

### Step 5: Verify in Production
```powershell
fly logs -a denial-appeal-pro | Select-String "OpenAI"
```

**Expected (GOOD):**
```
[OK] Advanced AI appeal generation enabled (OpenAI GPT-4)
```

**NOT this (BAD):**
```
[WARNING] OpenAI connection failed: Error code: 401
```

---

## Why the Current Key Doesn't Work

**Local testing worked** because:
- The test script made a simple API call that succeeded
- But the key may have rate limits or restrictions

**Production failed** because:
- OpenAI servers returned 401 (invalid key)
- The key is expired, revoked, or malformed

---

## After Getting New Key

The system will immediately:
- ✓ Enable real GPT-4 AI generation
- ✓ Generate 400-600 word professional appeals
- ✓ Include 5-8 regulatory citations
- ✓ Use payer-specific intelligence
- ✓ Validate quality (70+ score)

**No more templates. Only professional appeals.**

---

## Cost of New Key

OpenAI API pricing (GPT-4 Turbo):
- Input: ~$10 per 1M tokens
- Output: ~$30 per 1M tokens

**Per appeal cost**: $0.15-0.40
**Your revenue**: $15-49 per appeal
**Margin**: 98-99%

**Monthly estimates:**
- 100 appeals: $15-25 AI cost
- 500 appeals: $75-125 AI cost
- 1000 appeals: $150-250 AI cost

**The cost is negligible.**

---

## Immediate Action Required

1. Go to: https://platform.openai.com/api-keys
2. Create new secret key
3. Run: `fly secrets set OPENAI_API_KEY=<new-key> -a denial-appeal-pro`
4. Verify: `fly logs -a denial-appeal-pro | Select-String "OpenAI"`

**This is the ONLY blocker to real AI appeals in production.**
