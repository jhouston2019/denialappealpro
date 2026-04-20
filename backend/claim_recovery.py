"""
Denial recovery pipeline: prediction scoring, auto-fix, resubmission package.
Designed for API/EHR ingestion and batch processing (<1s per claim typical).
"""
from __future__ import annotations

import json
import re
from decimal import Decimal
from typing import Any, Dict, List, Optional

from coding_intelligence import (
    detectDenialRisk,
    run_intelligence_analysis,
    suggestModifiers,
    validateCoding,
)


def _merge_modifiers(existing: str, recommended: List[str]) -> str:
    parts = [p for p in re.split(r"[\s,;]+", (existing or "").strip()) if p]
    have = {p.upper().replace("-", "") for p in parts}
    out = list(parts)
    for m in recommended:
        k = str(m).strip().upper().replace("-", "")
        if k and k not in have:
            out.append(str(m).strip())
            have.add(k)
    return ", ".join(out)


def predictDenialScore(claim: Dict[str, Any]) -> Dict[str, Any]:
    """
    Payer-oriented denial prediction: score 0-100 with bands:
    0-30 Low, 31-70 Medium, 71-100 High.
    """
    dr = detectDenialRisk(claim)
    base = float(dr.get("riskScore") or 0)
    # Spread into full 0-100 range for display (internal model is conservative)
    score = int(min(100, max(0, round(base * 1.08 + 4))))

    payer = str(claim.get("payer") or "")
    cpt_blob = str(claim.get("cpt_codes") or claim.get("cptCodes") or "")
    mods = str(claim.get("modifiers") or "").upper()

    explanations: List[str] = []
    for r in (dr.get("risks") or [])[:4]:
        explanations.append(r)

    pu = payer.upper()
    if "UHC" in pu or "UNITED" in pu or "AETNA" in pu:
        explanations.append("Known payer pattern: rigorous medical necessity and policy edits.")
        score = min(100, score + 5)
    if "9921" in cpt_blob or "9920" in cpt_blob or "9921" in cpt_blob:
        if "25" not in mods and "992" in cpt_blob:
            explanations.append("E/M codes often require modifier review when paired with procedures.")
    if re.search(r"\b7\d{4}\b", cpt_blob):
        explanations.append("High-risk CPT: imaging frequently tied to authorization denials.")

    if len(explanations) < 2:
        explanations.append("Combine coding alignment, documentation, and timely filing for best outcomes.")

    score = int(min(100, max(0, score)))

    if score <= 30:
        level = "Low"
    elif score <= 70:
        level = "Medium"
    else:
        level = "High"

    return {
        "score": score,
        "riskLevel": level,
        "explanation": explanations[:8],
    }


def autoFixClaim(claimData: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply recommended modifiers, flag weak ICDs, attach suggested improvements.
    """
    cpt = claimData.get("cpt_codes") or claimData.get("cptCodes") or ""
    icd = (
        claimData.get("icd10_codes")
        or claimData.get("icd_codes")
        or claimData.get("icdCodes")
        or claimData.get("diagnosis_code")
        or ""
    )
    denial_blob = " ".join(
        [
            str(claimData.get("denial_codes") or ""),
            str(claimData.get("denial_code") or ""),
            str(claimData.get("carc_codes") or ""),
        ]
    )
    carc = claimData.get("carcCodes") or claimData.get("carc_codes")

    coding = validateCoding({"cptCodes": cpt, "icdCodes": icd})
    mods = suggestModifiers(
        {
            "cptCodes": cpt,
            "carcCodes": carc if carc is not None else [],
            "context": {"denial_reason": claimData.get("denial_reason") or ""},
        },
        denial_blob,
        None,
    )

    corrected = dict(claimData)
    prev_mod = str(corrected.get("modifiers") or "")
    rec = mods.get("recommendedModifiers") or []
    new_mods = _merge_modifiers(prev_mod, rec)
    corrected["modifiers"] = new_mods

    changes_applied: List[str] = []
    for m in rec:
        mk = m.upper().replace("-", "")
        if mk and mk not in prev_mod.upper().replace("-", ""):
            changes_applied.append(f"Added modifier {m}")

    weak = coding.get("weakIcdCodes") or []
    if weak:
        corrected["icd_specificity_flags"] = weak
        changes_applied.append(f"Flagged ICD specificity issue for: {', '.join(weak[:6])}")

    corrected["suggested_improvements"] = (coding.get("suggestions") or [])[:12]
    corrected["coding_valid"] = coding.get("valid", True)

    return {
        "correctedClaim": corrected,
        "changesApplied": changes_applied[:20],
        "coding": coding,
        "modifiers": mods,
    }


def prepareResubmission(claim: Dict[str, Any], appeal_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Build resubmission package: corrected data + checklist (appeal letter optional / separate flow).
    """
    fixed = autoFixClaim(claim)
    pred = predictDenialScore(fixed["correctedClaim"])

    package = {
        "appealReference": appeal_id,
        "correctedClaim": fixed["correctedClaim"],
        "changesApplied": fixed["changesApplied"],
        "denialPrediction": pred,
        "checklist": [
            "Verify corrected CPT/ICD/modifiers in your PM or clearinghouse",
            "Attach payer-requested documentation if denial cited medical necessity or auth",
            "Resubmit electronically or per payer portal instructions",
            "Retain audit trail of edits and submission confirmation",
        ],
        "ehrReady": True,
        "webhookHint": "Subscribe to claim status updates when available",
    }

    return {
        "updatedClaim": fixed["correctedClaim"],
        "appealDocument": None,
        "resubmissionPackage": package,
        "changesApplied": fixed["changesApplied"],
    }


def run_claim_pipeline(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Ingest pipeline: validate + modifiers + risk + prediction."""
    analysis = run_intelligence_analysis(payload)
    prediction = predictDenialScore(payload)
    return {
        "analysis": analysis,
        "prediction": prediction,
    }


def apply_pipeline_to_appeal(appeal: Any, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist intelligence + prediction on an Appeal row (SQLAlchemy model). Returns pipeline result dict."""
    result = run_claim_pipeline(payload)
    analysis = result["analysis"]
    prediction = result["prediction"]
    snap = {
        "codingIssues": (analysis.get("coding") or {}).get("issues") or [],
        "modifiersSuggested": (analysis.get("modifiers") or {}).get("recommendedModifiers") or [],
        "riskLevel": (analysis.get("risk") or {}).get("riskLevel"),
        "predictionScore": prediction.get("score"),
        "predictionLevel": prediction.get("riskLevel"),
        "payer": str(payload.get("payer") or "")[:200],
        "outcome": None,
    }
    appeal.intelligence_snapshot_json = json.dumps(
        {**snap, "full_analysis": analysis, "prediction": prediction},
        default=str,
    )[:12000]
    appeal.denial_prediction_score = prediction.get("score")
    appeal.fix_status = "none"
    appeal.resubmission_ready = bool(
        (prediction.get("score") or 100) <= 30 and (analysis.get("coding") or {}).get("valid")
    )
    return result
