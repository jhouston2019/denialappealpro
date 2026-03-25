"""
Scheduled retention jobs (run via cron or `python retention_jobs.py <command>`).

Commands: daily | weekly | reactivation | all

Environment: DATABASE_URL, SMTP_*, FRONTEND_URL, RETENTION_CRON_SECRET (for HTTP trigger only).
"""

import argparse
from datetime import date, datetime, timedelta

from app import app, db
from models import User, RetentionEmailLog
from retention_emails import send_html_email, app_base_url
from retention_service import (
    daily_digest_numbers,
    weekly_summary,
    inactive_users_after,
    inactive_users_between,
    unprocessed_claim_count,
    user_has_claims,
)


def _today() -> date:
    return date.today()


def _log_sent(user_id: int, campaign: str, day: date) -> bool:
    """Return True if newly logged; False if duplicate."""
    exists = RetentionEmailLog.query.filter_by(
        user_id=user_id, campaign=campaign, sent_day=day
    ).first()
    if exists:
        return False
    db.session.add(
        RetentionEmailLog(
            user_id=user_id,
            campaign=campaign,
            sent_day=day,
            sent_at=datetime.utcnow(),
        )
    )
    db.session.commit()
    return True


def _eligible_digest_users():
    """Users with claims, opted in, with an email."""
    return (
        User.query.filter(
            User.email_retention_opt_in.is_(True),
            User.email.isnot(None),
        )
        .all()
    )


def run_daily_weekday():
    """Mon–Fri digest: new claims + $ at risk; CTA Process Claims."""
    if _today().weekday() >= 5:
        print("Daily digest: skipped (weekend)")
        return
    day = _today()
    base = app_base_url()
    sent = 0
    for user in _eligible_digest_users():
        if not user_has_claims(user.id):
            continue
        nums = daily_digest_numbers(user.id, day)
        if nums["new_claims_count"] == 0 and nums["total_dollar_value_at_risk"] <= 0:
            continue
        campaign = "daily_digest"
        if RetentionEmailLog.query.filter_by(
            user_id=user.id, campaign=campaign, sent_day=day
        ).first():
            continue
        subj = f"Denial Appeal Pro — {nums['new_claims_count']} new claim(s), ${nums['total_dollar_value_at_risk']:,.0f} at risk"
        html = f"""
        <p>Hi,</p>
        <p><strong>New claims today:</strong> {nums['new_claims_count']} (${nums['new_claims_value']:,.2f})</p>
        <p><strong>Total dollar value at risk (queue):</strong> ${nums['total_dollar_value_at_risk']:,.2f}</p>
        <p><a href="{base}/dashboard" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">Process Claims</a></p>
        <p style="color:#666;font-size:13px;">You’re receiving this because you use Denial Appeal Pro. Reply to opt out.</p>
        """
        if send_html_email(user.email, subj, html):
            _log_sent(user.id, campaign, day)
            sent += 1
    print(f"Daily digest: sent {sent}")


def run_weekly():
    """Monday weekly summary (run cron on Mondays)."""
    today = _today()
    if today.weekday() != 0:
        print("Weekly summary: skipped (not Monday)")
        return
    week_start = today - timedelta(days=7)
    base = app_base_url()
    sent = 0
    for user in _eligible_digest_users():
        if not user_has_claims(user.id):
            continue
        stats = weekly_summary(user.id, week_start)
        if stats["appeals_processed"] == 0 and stats["estimated_recovered"] <= 0:
            continue
        campaign = "weekly_summary"
        if RetentionEmailLog.query.filter_by(
            user_id=user.id, campaign=campaign, sent_day=today
        ).first():
            continue
        subj = f"Weekly summary — {stats['appeals_processed']} appeals processed"
        html = f"""
        <p>Hi,</p>
        <p><strong>Appeals processed (week):</strong> {stats['appeals_processed']}</p>
        <p><strong>Estimated recovered:</strong> ${stats['estimated_recovered']:,.2f}</p>
        <p><strong>Success rate:</strong> {stats['success_rate']}%</p>
        <p><a href="{base}/dashboard">Open dashboard</a></p>
        """
        if send_html_email(user.email, subj, html):
            _log_sent(user.id, campaign, today)
            sent += 1
    print(f"Weekly summary: sent {sent}")


def run_reactivation():
    """3-day and 7-day inactive nudges (unprocessed claims)."""
    today = _today()
    base = app_base_url()

    def send_campaign(users, days_label: int, campaign: str, headline: str):
        sent = 0
        for user in users:
            if not user_has_claims(user.id):
                continue
            n, val = unprocessed_claim_count(user.id)
            if n == 0:
                continue
            if RetentionEmailLog.query.filter_by(
                user_id=user.id, campaign=campaign, sent_day=today
            ).first():
                continue
            subj = headline
            html = f"""
            <p>Hi,</p>
            <p>{headline}</p>
            <p><strong>Unprocessed claims:</strong> {n} (${val:,.2f} at stake)</p>
            <p><a href="{base}/dashboard" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">Process Claims</a></p>
            """
            if send_html_email(user.email, subj, html):
                _log_sent(user.id, campaign, today)
                sent += 1
        print(f"Reactivation {days_label}d: sent {sent}")

    # 3–7 day window: nudge before the stronger 7d message (mutually exclusive cohorts)
    u3 = inactive_users_between(3, 7)
    send_campaign(
        u3,
        3,
        "reactivate_3d",
        "You have unprocessed claims waiting",
    )
    u7 = inactive_users_after(7)
    send_campaign(
        u7,
        7,
        "reactivate_7d",
        "Your denial queue may be falling behind",
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["daily", "weekly", "reactivation", "all"])
    args = parser.parse_args()
    with app.app_context():
        if args.command == "daily":
            run_daily_weekday()
        elif args.command == "weekly":
            run_weekly()
        elif args.command == "reactivation":
            run_reactivation()
        else:
            run_daily_weekday()
            run_weekly()
            run_reactivation()


if __name__ == "__main__":
    main()
