"""Create coding_intelligence_logs if missing (additive migration)."""


def ensure_coding_intelligence_table(db) -> None:
    from models import CodingIntelligenceLog

    CodingIntelligenceLog.__table__.create(bind=db.engine, checkfirst=True)
