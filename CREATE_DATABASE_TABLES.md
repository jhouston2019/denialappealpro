# 🗄️ Create Database Tables

## Problem
The database tables don't exist yet. Error:
```
(psycopg2.errors.UndefinedTable) relation "appeals" does not exist
```

---

## Solution: Create Tables via Fly.io SSH

### Step 1: SSH into Fly.io Machine
```bash
fly ssh console --app denial-appeal-pro
```

### Step 2: Run Python to Create Tables
Once you're in the SSH session (you'll see `root@...:/app#`), run:

```bash
python3 -c "from app import app, db; app.app_context().push(); db.create_all(); print('✅ Tables created!')"
```

### Step 3: Verify Tables Were Created
Still in the SSH session:
```bash
python3 -c "from app import app, db; app.app_context().push(); print(db.engine.table_names())"
```

You should see: `['appeals', 'payments']`

### Step 4: Exit SSH
```bash
exit
```

---

## Alternative: Use the Create Tables Script

If the one-liner doesn't work, use the script:

```bash
# In SSH session
python3 create_tables.py
```

---

## What Tables Are Created

### 1. `appeals` table:
- appeal_id (primary key)
- payer_name
- claim_number
- patient_id
- denial_reason
- denial_code
- diagnosis_code
- date_of_service
- cpt_codes
- provider_name
- provider_npi
- billed_amount
- status
- appeal_letter_path
- created_at
- paid_at
- completed_at
- price_charged

### 2. `payments` table:
- payment_id (primary key)
- appeal_id (foreign key)
- stripe_payment_intent_id
- amount
- status
- created_at
- completed_at

---

## After Creating Tables

1. Exit SSH session
2. Try submitting the form again
3. It should work now!

---

## Quick Command Reference

**SSH in:**
```bash
fly ssh console --app denial-appeal-pro
```

**Create tables (one command):**
```bash
python3 -c "from app import app, db; app.app_context().push(); db.create_all(); print('✅ Done!')"
```

**Exit:**
```bash
exit
```
