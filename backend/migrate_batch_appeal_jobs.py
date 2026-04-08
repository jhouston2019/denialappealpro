"""
batch_appeal_jobs table for durable batch ZIP job metadata.
Run once: python migrate_batch_appeal_jobs.py
Also invoked at app startup via ensure_batch_appeal_jobs_schema(db).
"""

from datetime import datetime

from sqlalchemy import text


def ensure_batch_appeal_jobs_schema(db) -> None:
    """Idempotent CREATE for batch_appeal_jobs (PostgreSQL or SQLite)."""
    dialect = db.engine.dialect.name
    if dialect == 'sqlite':
        stmts = [
            """CREATE TABLE IF NOT EXISTS batch_appeal_jobs (
                job_id VARCHAR(64) NOT NULL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR(32) NOT NULL DEFAULT 'queued',
                job_kind VARCHAR(16) NOT NULL DEFAULT 'csv',
                total INTEGER,
                current INTEGER,
                ok_count INTEGER,
                error TEXT,
                zip_path VARCHAR(1024),
                zip_name VARCHAR(512),
                summary_rows TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )""",
            'CREATE INDEX IF NOT EXISTS ix_batch_appeal_jobs_user_id ON batch_appeal_jobs (user_id)',
        ]
    else:
        stmts = [
            """CREATE TABLE IF NOT EXISTS batch_appeal_jobs (
                job_id VARCHAR(64) NOT NULL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR(32) NOT NULL DEFAULT 'queued',
                job_kind VARCHAR(16) NOT NULL DEFAULT 'csv',
                total INTEGER,
                current INTEGER,
                ok_count INTEGER,
                error TEXT,
                zip_path VARCHAR(1024),
                zip_name VARCHAR(512),
                summary_rows JSON,
                created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
                updated_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
            )""",
            'CREATE INDEX IF NOT EXISTS ix_batch_appeal_jobs_user_id ON batch_appeal_jobs (user_id)',
        ]
    with db.engine.begin() as conn:
        for s in stmts:
            try:
                conn.execute(text(s))
            except Exception:
                pass


def sweep_interrupted_batch_jobs(db) -> None:
    """Mark queued/running jobs as error after server restart (Option A)."""
    from models import BatchAppealJob

    msg = 'Interrupted by server restart'
    now = datetime.utcnow()
    BatchAppealJob.query.filter(BatchAppealJob.status.in_(['queued', 'running'])).update(
        {
            BatchAppealJob.status: 'error',
            BatchAppealJob.error: msg,
            BatchAppealJob.updated_at: now,
        },
        synchronize_session=False,
    )
    db.session.commit()


def run():
    from app import app, db

    with app.app_context():
        ensure_batch_appeal_jobs_schema(db)
        sweep_interrupted_batch_jobs(db)
        print('batch_appeal_jobs migration complete.')


if __name__ == '__main__':
    run()
