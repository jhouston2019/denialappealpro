"""Add denial_prediction_score, fix_status, resubmission_ready, corrected/resubmission JSON on appeals."""


def ensure_claim_recovery_columns(db) -> None:
    from sqlalchemy import text

    alters = [
        "ALTER TABLE appeals ADD COLUMN denial_prediction_score INTEGER",
        "ALTER TABLE appeals ADD COLUMN fix_status VARCHAR(32)",
        "ALTER TABLE appeals ADD COLUMN resubmission_ready BOOLEAN DEFAULT 0",
        "ALTER TABLE appeals ADD COLUMN corrected_claim_json TEXT",
        "ALTER TABLE appeals ADD COLUMN resubmission_package_json TEXT",
    ]
    with db.engine.begin() as conn:
        for sql in alters:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        try:
            conn.execute(text("UPDATE appeals SET resubmission_ready = 0 WHERE resubmission_ready IS NULL"))
        except Exception:
            pass
