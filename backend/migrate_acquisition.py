"""
Referral partners + free trial columns (PostgreSQL).
Run once: python migrate_acquisition.py
Also invoked at app startup via ensure_acquisition_schema(db).
"""

from sqlalchemy import text


def ensure_acquisition_schema(db) -> None:
    """Idempotent: referral_partners table + user columns required for registration."""
    stmts = [
        """CREATE TABLE IF NOT EXISTS referral_partners (
            id SERIAL PRIMARY KEY,
            code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
        )""",
        "CREATE INDEX IF NOT EXISTS ix_referral_partners_code ON referral_partners (code)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS free_trial_generations_used INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_id INTEGER REFERENCES referral_partners(id)",
        "CREATE INDEX IF NOT EXISTS ix_users_referred_by ON users (referred_by_id)",
    ]
    with db.engine.begin() as conn:
        for s in stmts:
            try:
                conn.execute(text(s))
            except Exception:
                pass
        try:
            conn.execute(
                text(
                    """
                    INSERT INTO referral_partners (code, name, is_active)
                    SELECT 'demo', 'Demo Partner', TRUE
                    WHERE NOT EXISTS (SELECT 1 FROM referral_partners WHERE code = 'demo')
                    """
                )
            )
        except Exception:
            pass


def run():
    from app import app, db

    with app.app_context():
        ensure_acquisition_schema(db)
        print("Acquisition migration complete.")


if __name__ == "__main__":
    run()
