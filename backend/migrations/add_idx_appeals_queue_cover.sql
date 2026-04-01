-- Covering index for queue-style reads: ORDER BY created_at DESC with common projected columns.
-- PostgreSQL 11+ (INCLUDE). Run manually in production; CONCURRENTLY avoids long exclusive locks.
-- Do not wrap in a transaction (psql: use autocommit, or run as a single statement).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appeals_queue_cover
  ON appeals (created_at DESC)
  INCLUDE (id, payer, claim_number, status);
