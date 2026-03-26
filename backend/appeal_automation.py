"""
Future-ready hooks for reminders, resubmission triggers, and follow-up alerts.

Call from customer_portal when tracking_status or queue_status changes.
Not fully implemented — structured for incremental rollout.
"""
from __future__ import annotations

from typing import Any, Optional


class AppealAutomationHooks:
    """Extension points for scheduled jobs / webhooks (stubs)."""

    @staticmethod
    def on_tracking_status_change(appeal: Any, old_status: Optional[str], new_status: Optional[str]) -> None:
        """Future: enqueue reminder emails, SLA timers, CRM sync."""
        return

    @staticmethod
    def on_appeal_generated(appeal: Any) -> None:
        """Future: analytics, customer success triggers."""
        return

    @staticmethod
    def schedule_followup_if_pending(appeal: Any, days: int = 14) -> None:
        """Future: persist follow-up task when status is pending with payer."""
        return

    @staticmethod
    def on_follow_up_generated(appeal: Any) -> None:
        """Future: notify billing lead, update CRM, schedule payer SLA."""
        return

    @staticmethod
    def schedule_auto_follow_up_scan(user_id: int) -> None:
        """Future: cron — find appeals eligible for Level 2 and queue jobs."""
        return

    @staticmethod
    def alert_high_value_denial(appeal: Any, threshold_usd: float = 5000.0) -> None:
        """Future: alert when denied amount exceeds threshold."""
        return

    @staticmethod
    def weekly_summary_report_job(user_id: int) -> None:
        """Future: email weekly digest of denials + recovery."""
        return
