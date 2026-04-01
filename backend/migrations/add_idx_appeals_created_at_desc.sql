-- Speeds up ORDER BY created_at DESC on appeals (queue list, history).
-- SQLAlchemy model already sets index=True on created_at; PostgreSQL can still benefit from explicit DESC.
-- Run manually if your DB was created before the model index, or to add DESC ordering on Postgres.

-- PostgreSQL
CREATE INDEX IF NOT EXISTS idx_appeals_created_at_desc ON appeals (created_at DESC);

-- SQLite: DESC indexes are not distinct from ASC; skip if appeals.created_at already indexed via Alembic/model.
