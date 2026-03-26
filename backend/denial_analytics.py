"""
Aggregated denial analytics and payer behavior intelligence (scalable in-process aggregation).
"""
from __future__ import annotations

import re
from collections import defaultdict
from decimal import Decimal
from typing import Any, Dict, List, Optional

# Rough CARC → denial "type" for pie chart (expand over time)
CARC_CATEGORY = [
    (re.compile(r"CO-?50|PR-?50", re.I), "medical_necessity", "Medical necessity"),
    (re.compile(r"CO-?16|CO-?97|CO-?151|PR-?96", re.I), "coding", "Coding / bundling"),
    (re.compile(r"CO-?252|CO-?96|PR-?1", re.I), "authorization", "Authorization / precert"),
    (re.compile(r"CO-?45|CO-?59", re.I), "timely_or_admin", "Timely filing / admin"),
    (re.compile(r"CO-?119|CO-?4", re.I), "benefits", "Benefits / eligibility"),
]


def _denial_type_label(denial_code: Optional[str], denial_reason: Optional[str]) -> str:
    blob = f"{denial_code or ''} {denial_reason or ''}"
    for rx, _key, label in CARC_CATEGORY:
        if rx.search(blob):
            return label
    return "Other / unspecified"


def _parse_carc_codes(denial_code: Optional[str], denial_reason: Optional[str]) -> List[str]:
    out = []
    blob = f"{denial_code or ''} {denial_reason or ''}"
    for m in re.finditer(r"\b(CO|PR|OA|PI)[-\s]?(\d{1,3})\b", blob, re.I):
        out.append(f"{m.group(1).upper()}-{m.group(2)}")
    if denial_code and denial_code.strip():
        out.append(denial_code.strip()[:20])
    return list(dict.fromkeys(out))[:8]


def analyze_payer_behavior(claims_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    analyzePayerBehavior(claimsData) — per-payer rollups.

    Each row expects: payer, billed_amount or amount, denial_code, denial_reason, claim_number (optional).
    """
    by_payer: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in claims_rows:
        p = (row.get("payer") or "Unknown").strip() or "Unknown"
        by_payer[p].append(row)

    insights = []
    for payer, rows in sorted(by_payer.items(), key=lambda x: -len(x[1])):
        amounts = []
        reasons_count: Dict[str, int] = defaultdict(int)
        carc_count: Dict[str, int] = defaultdict(int)
        for r in rows:
            amt = r.get("amount")
            if amt is None:
                amt = r.get("billed_amount")
            try:
                amounts.append(float(amt or 0))
            except (TypeError, ValueError):
                amounts.append(0.0)
            lbl = _denial_type_label(r.get("denial_code"), r.get("denial_reason"))
            reasons_count[lbl] += 1
            for c in _parse_carc_codes(r.get("denial_code"), r.get("denial_reason")):
                carc_count[c] += 1

        top_reason = max(reasons_count.items(), key=lambda x: x[1])[0] if reasons_count else "—"
        top_carc = max(carc_count.items(), key=lambda x: x[1])[0] if carc_count else "—"
        avg_amt = sum(amounts) / len(amounts) if amounts else 0.0
        recovery_opp = round(sum(amounts) * 0.35, 2)

        # Pattern heuristic for display
        if reasons_count.get("Medical necessity", 0) >= max(1, len(rows) // 2):
            pattern = "High documentation / medical necessity denials"
        elif reasons_count.get("Coding / bundling", 0) >= max(1, len(rows) // 3):
            pattern = "Coding and edit-related denials frequent"
        elif reasons_count.get("Authorization / precert", 0) >= max(1, len(rows) // 4):
            pattern = "Authorization workflow gaps"
        else:
            pattern = "Mixed denial drivers — review top CARC codes"

        insights.append(
            {
                "payer": payer,
                "claim_count": len(rows),
                "top_denial_type": top_reason,
                "top_carc": top_carc,
                "avg_denial_amount": round(avg_amt, 2),
                "recovery_opportunity_estimate": recovery_opp,
                "pattern_summary": pattern,
                "carc_frequency": sorted(carc_count.items(), key=lambda x: -x[1])[:5],
            }
        )
    return insights


def actionable_recommendations(payer_insights: List[Dict[str, Any]]) -> List[str]:
    """Cross-payer actionable tips (rules-based)."""
    recs = []
    for pi in payer_insights[:12]:
        p = pi["payer"]
        if "Medical necessity" in pi.get("top_denial_type", ""):
            recs.append(f"{p}: Increase clinical documentation specificity for medical necessity (labs, progression, failed conservative care).")
        if "Coding" in pi.get("top_denial_type", "") or "CO-97" in str(pi.get("top_carc", "")):
            recs.append(f"{p}: Review NCCI edits and modifier usage (-59, -25, -XS) for high-volume CPT pairs.")
        if "Authorization" in pi.get("top_denial_type", "") or "252" in str(pi.get("top_carc", "")):
            recs.append(f"{p}: Tighten authorization workflows for imaging and specialty services before DOS.")
        if pi.get("avg_denial_amount", 0) > 2500:
            recs.append(f"{p}: Prioritize appeals on claims over $2,500 — recovery ROI is elevated.")
    # De-dupe preserve order
    seen = set()
    out = []
    for r in recs:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out[:15]


def compute_recovery_dashboard(user_id: int, appeals_query) -> Dict[str, Any]:
    """
    Single-call payload for Denial Insights + Payer Intelligence tabs.
    `appeals_query` is SQLAlchemy query already scoped to user_id, not executed.
    """
    rows = appeals_query.all()
    n = len(rows)
    total_amt = sum(float(r.billed_amount or 0) for r in rows)
    denied_amt = sum(float(r.billed_amount or 0) for r in rows if (r.appeal_tracking_status or "").lower() == "denied")
    potential_recovery = round(total_amt * 0.35, 2)
    avg_claim = round(total_amt / n, 2) if n else 0.0
    appeals_generated = sum(1 for r in rows if r.generated_letter_text and str(r.generated_letter_text).strip())

    # Bar: denials by payer (count claims per payer)
    payer_counts: Dict[str, int] = defaultdict(int)
    for r in rows:
        payer_counts[(r.payer or "Unknown").strip() or "Unknown"] += 1
    denials_by_payer = sorted(
        [{"payer": k, "count": v} for k, v in payer_counts.items()],
        key=lambda x: -x["count"],
    )[:20]

    # Pie: denial types
    type_counts: Dict[str, int] = defaultdict(int)
    for r in rows:
        lbl = _denial_type_label(getattr(r, "denial_code", None), getattr(r, "denial_reason", None))
        type_counts[lbl] += 1
    denial_types_pie = [{"type": k, "count": v} for k, v in sorted(type_counts.items(), key=lambda x: -x[1])]

    # Top 10 by amount
    sorted_amt = sorted(rows, key=lambda r: float(r.billed_amount or 0), reverse=True)[:10]
    top_claims = [
        {
            "claim_number": r.claim_number,
            "payer": r.payer,
            "amount": float(r.billed_amount or 0),
            "denial_code": r.denial_code,
            "appeal_tracking_status": getattr(r, "appeal_tracking_status", None) or "pending",
            "appeal_id": r.appeal_id,
        }
        for r in sorted_amt
    ]

    claim_dicts = [
        {
            "payer": r.payer,
            "amount": float(r.billed_amount or 0),
            "denial_code": r.denial_code,
            "denial_reason": (r.denial_reason or "")[:500],
            "claim_number": r.claim_number,
        }
        for r in rows
    ]
    payer_intel = analyze_payer_behavior(claim_dicts)
    recommendations = actionable_recommendations(payer_intel)

    return {
        "metrics": {
            "total_claims_processed": n,
            "total_denied_amount": round(denied_amt, 2),
            "total_potential_recovery": potential_recovery,
            "average_claim_value": avg_claim,
            "appeals_generated": appeals_generated,
        },
        "denials_by_payer": denials_by_payer,
        "denial_types": denial_types_pie,
        "top_claims": top_claims,
        "payer_intelligence": payer_intel,
        "recommendations": recommendations,
    }


def analyzePayerBehavior(claimsData: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """JS-friendly export name."""
    return analyze_payer_behavior(claimsData)
