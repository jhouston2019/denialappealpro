# SUPABASE POSTGRESQL SETUP REQUIRED

## IMPLEMENTATION COMPLETE

All code changes implemented:
- PostgreSQL connection pooling configured
- Hard atomic credit deduction with session.begin()
- Webhook idempotency with transaction wrapping
- Internal test endpoints created
- Validation script ready
- SQLite references removed

## BLOCKER: DATABASE CONNECTION STRING REQUIRED

Cannot proceed without PostgreSQL DATABASE_URL.

## SETUP INSTRUCTIONS

### Option 1: Supabase (Recommended - Free)

1. Go to https://supabase.com
2. Create new project
3. Wait for database provisioning (2-3 minutes)
4. Go to Settings > Database
5. Copy "Connection string" (URI format)
6. Update backend/.env:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### Option 2: Local PostgreSQL

1. Install PostgreSQL 15
2. Create database: `createdb denialappeal`
3. Update backend/.env:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/denialappeal
```

## AFTER DATABASE_URL IS SET

Run these commands:

```bash
cd backend

# Install dependencies (if not done)
pip install psycopg2-binary

# Run migrations
python apply_atomic_fixes.py

# Start Flask server
python app.py

# In separate terminal, run tests
python test_supabase_atomic.py
```

## EXPECTED TEST OUTPUT

```
Parallel Deduction Result:
Success: 10
Fail: 10
Final Subscription: 0
Final Bulk: 0

Webhook Duplicate Test:
Processed Events Count: 1
Credits Added: 1
```

## CURRENT STATUS

Code: READY
Database: BLOCKED (no connection string)
Tests: CANNOT RUN

Provide DATABASE_URL to proceed.
