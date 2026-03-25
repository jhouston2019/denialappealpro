"""
Aggregates for retention emails and dashboard metrics.
"""

from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional, Tuple

from models import User, Appeal


def _money(n) -> float:
    try:
        return float(n or 0)
    except (TypeError, ValueError):
        return 0.0


def claims_for_user(user_id: int) -> List[Appeal]:
    return Appeal.query.filter_by(user_id=user_id).all()


def new_claims_since(
    user_id: int,
    since: Optional[datetime],
) -> Tuple[int, float]:
    """Count and dollar sum of claims created after `since` (exclusive). If since is None, all claims."""
    q = Appeal.query.filter_by(user_id=user_id)
    if since:
        q = q.filter(Appeal.created_at > since)
    rows = q.all()
    return len(rows), sum(_money(c.billed_amount) for c in rows)


def daily_digest_numbers(user_id: int, day: date) -> Dict[str, Any]:
    """New claims created on `day` and total $ at risk (full queue)."""
    start = datetime.combine(day, datetime.min.time())
    end = start + timedelta(days=1)
    new_today = (
        Appeal.query.filter(
            Appeal.user_id == user_id,
            Appeal.created_at >= start,
            Appeal.created_at < end,
        )
        .all()
    )
    new_count = len(new_today)
    new_value = sum(_money(c.billed_amount) for c in new_today)
    all_claims = claims_for_user(user_id)
    at_risk = sum(_money(c.billed_amount) for c in all_claims)
    return {
        "new_claims_count": new_count,
        "new_claims_value": round(new_value, 2),
        "total_dollar_value_at_risk": round(at_risk, 2),
    }


def week_bounds(week_start: date) -> Tuple[datetime, datetime]:
    start = datetime.combine(week_start, datetime.min.time())
    end = start + timedelta(days=7)
    return start, end


def weekly_summary(user_id: int, week_start: date) -> Dict[str, Any]:
    """Monday-start week: appeals generated/completed in window; estimated recovered; success rate."""
    start_dt, end_dt = week_bounds(week_start)
    claims = claims_for_user(user_id)

    def in_window(dt: Optional[datetime]) -> bool:
        if not dt:
            return False
        return start_dt <= dt < end_dt

    processed = [
        c
        for c in claims
        if in_window(c.last_generated_at) or in_window(c.completed_at)
    ]
    recovered = sum(_money(c.outcome_amount_recovered) for c in processed if c.outcome_amount_recovered)
    if recovered == 0:
        recovered = sum(
            _money(c.billed_amount) * 0.35
            for c in processed
            if not c.outcome_amount_recovered or _money(c.outcome_amount_recovered) == 0
        )
    success_rate = success_rate_for_claims(processed)
    return {
        "appeals_processed": len(processed),
        "estimated_recovered": round(recovered, 2),
        "success_rate": success_rate,
    }


def success_rate_for_claims(claims: List[Appeal]) -> float:
    resolved = [
        c
        for c in claims
        if (c.outcome_status or "") in ("approved", "partially_approved", "denied")
    ]
    if resolved:
        wins = sum(
            1
            for c in resolved
            if (c.outcome_status or "") in ("approved", "partially_approved")
        )
        return round(100.0 * wins / len(resolved), 1)
    submitted = sum(1 for c in claims if (c.queue_status or "") == "submitted")
    pipeline = sum(
        1 for c in claims if (c.queue_status or "") in ("generated", "submitted")
    )
    if pipeline:
        return round(100.0 * submitted / pipeline, 1)
    return 0.0


def dashboard_metrics(user_id: int) -> Dict[str, Any]:
    claims = claims_for_user(user_id)
    revenue_at_risk = sum(_money(c.billed_amount) for c in claims)
    recovered = sum(_money(c.outcome_amount_recovered) for c in claims if c.outcome_amount_recovered)
    estimated = sum(
        _money(c.billed_amount) * 0.35
        for c in claims
        if (c.queue_status or "") in ("generated", "submitted")
        and (not c.outcome_amount_recovered or _money(c.outcome_amount_recovered) == 0)
    )
    revenue_recovered = round(recovered if recovered > 0 else estimated, 2)
    appeals_processed = sum(
        1
        for c in claims
        if (c.queue_status or "") in ("generated", "submitted")
        or (c.status or "") == "completed"
    )
    success_rate = success_rate_for_claims(claims)
    return {
        "revenue_at_risk": round(revenue_at_risk, 2),
        "revenue_recovered": revenue_recovered,
        "appeals_processed": appeals_processed,
        "success_rate": success_rate,
    }


def inactive_users_after(days: int) -> List[User]:
    """Users whose last_active_at is older than ``days`` (strictly inactive longer than N days)."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    return (
        User.query.filter(
            User.last_active_at.isnot(None),
            User.last_active_at < cutoff,
            User.email_retention_opt_in.is_(True),
        )
        .all()
    )


def inactive_users_between(min_inactive_days: int, max_inactive_days: int) -> List[User]:
    """
    Users inactive at least min_inactive_days but fewer than max_inactive_days
    (e.g. 3–7 day window: min=3, max=7 → last active between 3 and 7 days ago).
    """
    now = datetime.utcnow()
    upper = now - timedelta(days=min_inactive_days)
    lower = now - timedelta(days=max_inactive_days)
    return (
        User.query.filter(
            User.last_active_at.isnot(None),
            User.last_active_at < upper,
            User.last_active_at >= lower,
            User.email_retention_opt_in.is_(True),
        )
        .all()
    )


def unprocessed_claim_count(user_id: int) -> Tuple[int, float]:
    rows = [
        c
        for c in claims_for_user(user_id)
        if (c.queue_status or "pending") in ("pending", "in_progress")
    ]
    return len(rows), sum(_money(c.billed_amount) for c in rows)


def user_has_claims(user_id: int) -> bool:
    return Appeal.query.filter_by(user_id=user_id).first() is not None
