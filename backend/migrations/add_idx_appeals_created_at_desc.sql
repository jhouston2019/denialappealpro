-- Speeds up ORDER BY created_at DESC on appeals (queue list, history).
-- SQLAlchemy model already sets index=True on created_at; PostgreSQL can still benefit from explicit DESC.
-- Run manually if your DB was created before the model index, or to add DESC ordering on Postgres.

-- PostgreSQL (dev / small tables; safe inside migrations)
CREATE INDEX IF NOT EXISTS idx_appeals_created_at_desc ON appeals (created_at DESC);

-- SQLite: DESC indexes are not distinct from ASC; skip if appeals.created_at already indexed via Alembic/model.

-- ---------------------------------------------------------------------------
-- Production (Postgres): verify index use — EXPLAIN ANALYZE
--   SELECT id, payer, claim_number, status, created_at
--   FROM appeals
--   ORDER BY created_at DESC
--   LIMIT 25;
-- If you see Seq Scan on large tables, add stronger indexes below.
-- CONCURRENTLY = no long table lock; run outside an explicit transaction.
-- ---------------------------------------------------------------------------

-- Optional: tie-break stable ordering + helps some planners (drop simpler idx first if name collides).
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appeals_created_at_desc_id
--   ON appeals (created_at DESC, id);

-- Covering index (Postgres 11+): index-only scans for queue-shaped selects. INCLUDE columns must match your SELECT.
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appeals_queue_cover
--   ON appeals (created_at DESC)
--   INCLUDE (id, payer, claim_number, status);
