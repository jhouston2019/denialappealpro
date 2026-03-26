"""Add appeal_tracking_status, tracking_updated_at, payer_fax if missing (SQLite/Postgres-safe try/add)."""

from sqlalchemy import text


def ensure_tracking_columns(db) -> None:
    alters = [
        "ALTER TABLE appeals ADD COLUMN appeal_tracking_status VARCHAR(50)",
        "ALTER TABLE appeals ADD COLUMN tracking_updated_at TIMESTAMP",
        "ALTER TABLE appeals ADD COLUMN payer_fax VARCHAR(50)",
        "ALTER TABLE appeals ADD COLUMN appeal_generation_kind VARCHAR(20)",
        "ALTER TABLE appeals ADD COLUMN submitted_to_payer_at TIMESTAMP",
        "ALTER TABLE appeals ADD COLUMN prior_submission_date DATE",
    ]
    with db.engine.begin() as conn:
        for sql in alters:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        try:
            conn.execute(
                text(
                    "UPDATE appeals SET appeal_tracking_status = 'pending' "
                    "WHERE appeal_tracking_status IS NULL"
                )
            )
        except Exception:
            pass
