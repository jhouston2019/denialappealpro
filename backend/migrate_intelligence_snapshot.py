"""Add appeals.intelligence_snapshot_json if missing."""


def ensure_intelligence_snapshot_column(db) -> None:
    from sqlalchemy import text

    with db.engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE appeals ADD COLUMN intelligence_snapshot_json TEXT"))
        except Exception:
            pass
