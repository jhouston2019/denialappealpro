"""
Level-2 (follow-up) appeal generation — references prior submission and escalates tone.
"""
from __future__ import annotations

import re
from datetime import datetime, date
from typing import Any, Optional, Tuple

from appeal_output_structure import extract_carc_rarc_from_intake


def should_generate_follow_up(
    appeal: Any,
    appeal_status: Optional[str] = None,
    days_no_response: int = 30,
) -> Tuple[bool, str]:
    """
    Trigger when tracking status is denied, or submitted/pending with no payer response
    for >= days_no_response after submitted_to_payer_at.
    """
    st = (appeal_status or getattr(appeal, "appeal_tracking_status", None) or "").lower()
    kind = (getattr(appeal, "appeal_generation_kind", None) or "initial").lower()
    if kind == "follow_up":
        return False, "Follow-up already generated for this appeal record"

    if st == "denied":
        return True, "Prior determination denied — second-level appeal appropriate"

    sub_at = getattr(appeal, "submitted_to_payer_at", None)
    if sub_at and st in ("submitted", "pending"):
        if isinstance(sub_at, datetime):
            delta = datetime.utcnow() - sub_at.replace(tzinfo=None) if sub_at.tzinfo else datetime.utcnow() - sub_at
        else:
            delta = datetime.utcnow() - datetime.combine(sub_at, datetime.min.time())
        if delta.days >= days_no_response and st != "approved":
            return True, f"No payer response within {days_no_response} days of submission"

    return False, "Follow-up conditions not met (set status to Denied or record submission date)"


def _prior_submission_date_str(appeal: Any) -> str:
    d = getattr(appeal, "prior_submission_date", None)
    if d and isinstance(d, date):
        return d.strftime("%B %d, %Y")
    sub = getattr(appeal, "submitted_to_payer_at", None)
    if sub and isinstance(sub, datetime):
        return sub.strftime("%B %d, %Y")
    lg = getattr(appeal, "last_generated_at", None)
    if lg and isinstance(lg, datetime):
        return lg.strftime("%B %d, %Y")
    cr = getattr(appeal, "created_at", None)
    if cr and isinstance(cr, datetime):
        return cr.strftime("%B %d, %Y")
    return datetime.utcnow().strftime("%B %d, %Y")


def _extract_argument_snippet(original_text: Optional[str], max_chars: int = 1200) -> str:
    if not original_text or not str(original_text).strip():
        return "Clinical, coding, and policy arguments were previously submitted with supporting documentation."
    t = str(original_text).strip()
    for marker in ("APPEAL ARGUMENT", "DENIAL SUMMARY", "Basis for Appeal"):
        m = re.search(rf"{re.escape(marker)}[^\n]*\n(.+)", t, re.I | re.S)
        if m:
            chunk = m.group(1)[:max_chars]
            return chunk.strip() + ("…" if len(m.group(1)) > max_chars else "")
    return t[:max_chars] + ("…" if len(t) > max_chars else "")


def generate_follow_up_letter_text(original_appeal: Any, appeal_status: Optional[str] = None) -> str:
    """
    Second-level appeal body for PDF (document title / RE line: Second-Level Appeal via appeal_pdf_builder).
    """
    payer = getattr(original_appeal, "payer", None) or "the payer"
    claim = getattr(original_appeal, "claim_number", "") or getattr(original_appeal, "appeal_id", "")
    carc, rarc = extract_carc_rarc_from_intake(original_appeal)
    orig = getattr(original_appeal, "generated_letter_text", None) or ""
    snippet = _extract_argument_snippet(orig)

    return f"""This is a follow-up regarding the appeal submitted for Claim #{claim}.

Denial codes under review: CARC {carc}; RARC {rarc}. This follow-up restates those codes for the second-level review and ties them to the documentation previously submitted to {payer}.

{snippet}

The previous determination does not reflect a complete or accurate review of the submitted documentation.

Formal reconsideration is requested.
"""


def generateFollowUpAppeal(originalAppeal: Any, appealStatus: Optional[str] = None) -> str:
    """Public alias (product naming)."""
    return generate_follow_up_letter_text(originalAppeal, appealStatus)
