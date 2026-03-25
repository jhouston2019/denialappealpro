"""
Add retention columns, retention_email_logs table (PostgreSQL).
Run once: python migrate_retention.py
"""

from sqlalchemy import text

from app import app, db


def run():
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
    with app.app_context():
        for s in stmts:
            db.session.execute(text(s))
        db.session.commit()
        print("Retention migration complete.")


if __name__ == "__main__":
    run()
