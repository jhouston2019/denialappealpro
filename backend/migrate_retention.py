"""
Add retention columns, retention_email_logs table (PostgreSQL).
Run once: python migrate_retention.py
Also invoked at app startup via ensure_retention_schema(db).
"""

from sqlalchemy import text


def ensure_retention_schema(db) -> None:
    """Idempotent: user columns required by User model (e.g. email_retention_opt_in)."""
    stmts = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_retention_opt_in BOOLEAN NOT NULL DEFAULT TRUE",
        """CREATE TABLE IF NOT EXISTS retention_email_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            campaign VARCHAR(64) NOT NULL,
            sent_day DATE NOT NULL,
            sent_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
            CONSTRAINT uq_retention_user_campaign_day UNIQUE (user_id, campaign, sent_day)
        )""",
        "CREATE INDEX IF NOT EXISTS ix_retention_email_logs_user ON retention_email_logs (user_id)",
    ]
    with db.engine.begin() as conn:
        for s in stmts:
            try:
                conn.execute(text(s))
            except Exception:
                pass


def run():
    from app import app, db

    with app.app_context():
        ensure_retention_schema(db)
        print("Retention migration complete.")


if __name__ == "__main__":
    run()
