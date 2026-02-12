# 🔴 POSTGRESQL SETUP REQUIRED

## CURRENT BLOCKER

**Cannot verify atomic operations without PostgreSQL.**

SQLite does not support `SELECT FOR UPDATE` row-level locking.

## IMMEDIATE ACTION REQUIRED

### Option 1: Local PostgreSQL (Recommended)

**Install PostgreSQL 15**:
```bash
# Download from: https://www.postgresql.org/download/windows/
# Or use installer: postgresql-15.x-windows-x64.exe
```

**After installation**:
```bash
# Create database
createdb denialappeal

# Update .env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/denialappeal
```

### Option 2: Docker PostgreSQL

**If Docker Desktop installed**:
```bash
docker run --name denial-postgres \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=denialappeal \
  -p 5432:5432 \
  -d postgres:15

# Update .env
DATABASE_URL=postgresql://postgres:devpass@localhost:5432/denialappeal
```

### Option 3: Cloud PostgreSQL (Free Tier)

**Neon.tech** (Recommended - Free, no credit card):
1. Go to: https://neon.tech
2. Sign up (GitHub OAuth)
3. Create project: "denial-appeal-test"
4. Copy connection string
5. Update .env with connection string

**Railway.app** (Alternative):
1. Go to: https://railway.app
2. New Project → PostgreSQL
3. Copy DATABASE_URL
4. Update .env

**Render.com** (Alternative):
1. Go to: https://render.com
2. New PostgreSQL
3. Copy External Database URL
4. Update .env

## AFTER POSTGRESQL IS AVAILABLE

Run these commands:

```bash
cd backend

# Install PostgreSQL adapter (already done)
pip install psycopg2-binary

# Run migrations
python apply_atomic_fixes.py

# Initialize database
python init_db_simple.py

# Run atomic tests
python test_atomic_operations.py

# Expected: 4/4 tests PASS
```

## TESTS THAT MUST PASS

1. **Parallel Deduction**: 10 credits, 20 requests → exactly 10 success
2. **Webhook Duplicate**: Unique constraint blocks second insert
3. **Credit Isolation**: Subscription resets, bulk preserved
4. **50 Concurrent Requests**: No race conditions

## WHY THIS MATTERS

**With SQLite**:
- 3/4 tests pass
- Parallel deduction fails (race condition)
- NOT production-ready

**With PostgreSQL**:
- 4/4 tests should pass
- Row-level locking works
- Production-ready

## CURRENT STATUS

**Code**: ✅ Ready
**Database**: ❌ Blocked (no PostgreSQL available)
**Tests**: ⚠️ Cannot verify atomicity

**Action**: User must set up PostgreSQL to proceed with verification.
