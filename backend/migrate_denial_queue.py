"""
Add denial queue columns and claim_status_events table (PostgreSQL).
Run once: python migrate_denial_queue.py
"""

from sqlalchemy import text
from app import app, db


def run():
    stmts = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_queue_visit_at TIMESTAMP",
        "ALTER TABLE appeals ADD COLUMN IF NOT EXISTS queue_status VARCHAR(50) DEFAULT 'pending'",
        "ALTER TABLE appeals ADD COLUMN IF NOT EXISTS queue_notes TEXT",
        "ALTER TABLE appeals ADD COLUMN IF NOT EXISTS generated_letter_text TEXT",
        """CREATE TABLE IF NOT EXISTS claim_status_events (
            id SERIAL PRIMARY KEY,
            appeal_db_id INTEGER NOT NULL REFERENCES appeals(id),
            user_id INTEGER REFERENCES users(id),
            event_type VARCHAR(80) NOT NULL,
            message TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
        )""",
        "CREATE INDEX IF NOT EXISTS ix_claim_status_events_appeal ON claim_status_events (appeal_db_id)",
    ]
    with app.app_context():
        for s in stmts:
            db.session.execute(text(s))
        db.session.commit()
        db.session.execute(
            text("UPDATE appeals SET queue_status = 'generated' WHERE status = 'completed'")
        )
        db.session.commit()
        print("Denial queue migration complete.")


if __name__ == "__main__":
    run()
