"""Add unified payment columns/tables (idempotent)."""
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError, OperationalError


def ensure_unified_payment_schema(db):
    engine = db.engine
    dialect = engine.dialect.name

    def run(sql_pg, sql_sqlite=None):
        sql = sql_pg if dialect != 'sqlite' else (sql_sqlite or sql_pg)
        try:
            with engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()
        except (ProgrammingError, OperationalError):
            pass

    # users columns
    run(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)',
        "SELECT 1",  # sqlite: handled below
    )
    run(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paid BOOLEAN',
        "SELECT 1",
    )
    run(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_verification_status VARCHAR(32)',
        "SELECT 1",
    )
    if dialect == 'sqlite':
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                cols = {r[1] for r in rows}
                if 'stripe_subscription_id' not in cols:
                    conn.execute(text('ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255)'))
                if 'is_paid' not in cols:
                    conn.execute(text('ALTER TABLE users ADD COLUMN is_paid BOOLEAN'))
                if 'payment_verification_status' not in cols:
                    conn.execute(text('ALTER TABLE users ADD COLUMN payment_verification_status VARCHAR(32)'))
                conn.commit()
        except OperationalError:
            pass

    # new tables via SQLAlchemy models
    from models import ProcessedStripeSession, PaymentTransaction

    db.metadata.create_all(bind=engine, tables=[ProcessedStripeSession.__table__, PaymentTransaction.__table__])
