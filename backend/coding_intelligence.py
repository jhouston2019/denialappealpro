"""
Coding validation, modifier suggestions, and pre-submission denial risk (rule-based, <1s typical).
Not a substitute for certified coding — assists intake and appeal prep.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

# High-level E/M ranges (simplified)
_EM_RANGE = re.compile(r"^99[2-4]\d{2}$")
_HIGH_OFFICE_EM = re.compile(r"^992(0[4-5]|1[3-5])$")
_PROCEDURE_SURGICAL = re.compile(r"^(1\d{4}|2\d{4}|3\d{4}|4\d{4}|5\d{4}|6\d{4})$")
_IMAGING = re.compile(r"^(7\d{4})$")


def _split_codes(raw: Optional[Any]) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        parts = raw
    else:
        parts = re.split(r"[\s,;]+", str(raw).strip())
    out: List[str] = []
    for p in parts:
        p = p.strip().upper().replace(".", "")
        if not p:
            continue
        base = re.match(r"^(\d{5})", p)
        if base:
            out.append(base.group(1))
        elif re.match(r"^\d{5}$", p):
            out.append(p)
    return list(dict.fromkeys(out))[:40]


def _split_icd(raw: Optional[Any]) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        parts = raw
    else:
        parts = re.split(r"[\s,;]+", str(raw).strip())
    out: List[str] = []
    for p in parts:
        p = re.sub(r"[^A-Z0-9.]", "", p.upper())
        if len(p) >= 3:
            out.append(p)
    return list(dict.fromkeys(out))[:24]


def _icd_specificity(icd: str) -> str:
    core = icd.replace(".", "")
    if len(core) <= 3:
        return "unspecified"
    if core.startswith("Z") and len(core) <= 5:
        return "general_z"
    if re.match(r"^[A-Z]\d{2}\d{3}$", core) or re.match(r"^[A-Z]\d{2}\.\d", icd):
        return "specific"
    return "moderate"


def _normalize_validate_pair(cpt_codes: Any, icd_codes: Any, kwargs: Any) -> tuple[Any, Any]:
    if isinstance(cpt_codes, dict):
        d = cpt_codes
        return (
            d.get("cptCodes") or d.get("cpt_codes"),
            d.get("icdCodes") or d.get("icd10_codes") or d.get("icd_codes"),
        )
    cpt = kwargs.get("cptCodes") if kwargs.get("cptCodes") is not None else cpt_codes
    icd = kwargs.get("icdCodes") if kwargs.get("icdCodes") is not None else icd_codes
    return (cpt, icd)


def validateCoding(cpt_codes: Any = None, icd_codes: Any = None, **kwargs: Any) -> Dict[str, Any]:
    """
    validateCoding({ cptCodes, icdCodes }) or validateCoding(cpt_str, icd_str)
    Returns valid, issues, suggestions, weakIcdCodes for UI highlight.
    """
    cpt_in, icd_in = _normalize_validate_pair(cpt_codes, icd_codes, kwargs)
    cpts = _split_codes(cpt_in)
    icds = _split_icd(icd_in)
    issues: List[str] = []
    suggestions: List[str] = []
    weak_icd: List[str] = []

    if not cpts:
        issues.append("No CPT/HCPCS codes provided — cannot validate medical necessity pairing.")
        suggestions.append("Enter at least one procedure or visit code.")

    if not icds:
        issues.append("No ICD-10 diagnosis codes provided — missing diagnosis linkage.")
        suggestions.append("Add diagnosis codes that support medical necessity for each service line.")

    em_codes = [c for c in cpts if _EM_RANGE.match(c)]
    proc_codes = [c for c in cpts if _PROCEDURE_SURGICAL.match(c)]
    img_codes = [c for c in cpts if _IMAGING.match(c)]

    for icd in icds:
        spec = _icd_specificity(icd)
        if spec in ("unspecified", "general_z"):
            weak_icd.append(icd)

    for em in em_codes:
        if icds:
            only_z = all(i.startswith("Z") for i in icds)
            if only_z and _HIGH_OFFICE_EM.match(em):
                issues.append(f"ICD-10 pattern may not support CPT {em} (high-level E/M with only Z-series diagnoses).")
                suggestions.append("Add active diagnoses documented for this visit or align E/M level with payer policy.")
            if only_z and em >= "99204" and not _HIGH_OFFICE_EM.match(em):
                issues.append(f"ICD-10 may not fully support CPT {em} for medical necessity if only screening codes apply.")
                suggestions.append("Ensure visit diagnosis matches the work performed.")

    if em_codes and icds:
        only_z_screening = all(i.startswith("Z") for i in icds)
        if only_z_screening and any(c >= "99204" for c in em_codes):
            if not any("ICD-10 pattern may not support CPT" in x for x in issues):
                issues.append("Diagnosis is too general or screening-only for the service complexity reported.")
                suggestions.append("Use diagnoses that support medical necessity for the E/M level billed.")

    if em_codes and proc_codes:
        issues.append("E/M and procedure on the same encounter often require modifier -25 on the E/M when distinct.")
        suggestions.append("Confirm separate E/M service from procedure; consider modifier -25 if payer rules allow.")

    for icd in icds:
        if _icd_specificity(icd) == "unspecified":
            issues.append(f"ICD-10 {icd} appears truncated or unspecified — may lack specificity for the service.")
            suggestions.append("Use the most specific billable ICD-10 supported by documentation.")

    if proc_codes and not em_codes and len(icds) == 1 and _icd_specificity(icds[0]) in ("general_z", "unspecified"):
        issues.append("Procedure coding with a single broad or Z-code diagnosis may indicate incomplete linkage.")
        suggestions.append("Link complications, anatomy, or active conditions as documented.")

    if img_codes and icds:
        if all(_icd_specificity(i) in ("unspecified", "general_z", "moderate") for i in icds):
            issues.append("Imaging CPT with broadly stated diagnoses — payer may question medical necessity specificity.")
            suggestions.append("Tighten ICD-10 to findings or symptoms that justify the study.")

    if img_codes:
        issues.append("Imaging CPT codes often require prior authorization by payer and policy.")
        suggestions.append("Verify authorization on file for the DOS and modality.")

    valid = len(issues) == 0
    return {
        "valid": valid,
        "issues": issues[:14],
        "suggestions": suggestions[:14],
        "weakIcdCodes": list(dict.fromkeys(weak_icd))[:24],
        "cpt_parsed": cpts,
        "icd_parsed": icds,
    }


def _parse_carc_from_text(blob: str) -> List[int]:
    out: List[int] = []
    for m in re.finditer(r"(?:CO|PR|PI|OA)?[-\s]?(\d{1,3})", (blob or "").upper()):
        try:
            n = int(m.group(1))
            if 0 < n <= 999:
                out.append(n)
        except ValueError:
            pass
    return list(dict.fromkeys(out))[:24]


def _carc_from_any(carc_codes: Any, denial_blob: str) -> List[int]:
    nums = _parse_carc_from_text(denial_blob)
    if isinstance(carc_codes, list):
        for x in carc_codes:
            nums.extend(_parse_carc_from_text(str(x)))
    elif carc_codes:
        nums.extend(_parse_carc_from_text(str(carc_codes)))
    return list(dict.fromkeys(nums))[:24]


def _normalize_suggest_args(
    cpt_codes: Any, denial_codes: Any, context: Optional[Dict[str, Any]]
) -> tuple[List[str], List[int], Dict[str, Any], str]:
    ctx: Dict[str, Any] = dict(context or {})
    carcs: List[int]

    if isinstance(cpt_codes, dict):
        d = cpt_codes
        cpt_raw = d.get("cptCodes") or d.get("cpt_codes")
        carc_raw = d.get("carcCodes") or d.get("carc_codes")
        ctx = {**ctx, **(d.get("context") or {})}
        cpts = _split_codes(cpt_raw)
        blob = " ".join(str(x) for x in carc_raw) if isinstance(carc_raw, list) else str(carc_raw or "")
        carcs = _carc_from_any(carc_raw, blob)
        if denial_codes:
            extra = " ".join(str(x) for x in denial_codes) if isinstance(denial_codes, list) else str(denial_codes)
            blob = (blob + " " + extra).strip()
    else:
        cpts = _split_codes(cpt_codes)
        if isinstance(denial_codes, list):
            blob = " ".join(str(x) for x in denial_codes)
        else:
            blob = str(denial_codes or "")
        carcs = _carc_from_any(None, blob)

    blob = (blob + " " + str(ctx.get("denial_reason") or "")).strip()
    carcs = list(dict.fromkeys(carcs + _parse_carc_from_text(blob)))[:24]
    return cpts, carcs, ctx, blob


def suggestModifiers(
    cpt_codes: Any = None,
    denial_codes: Any = None,
    context: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    suggestModifiers({ cptCodes, carcCodes, context }) or legacy (cpt, denial_blob, context).
    Returns recommendedModifiers and reasoning (one string per rule line).
    """
    cpts, carcs, ctx, blob = _normalize_suggest_args(cpt_codes, denial_codes, context)

    recommended: List[str] = []
    reasoning_lines: List[str] = []

    em_codes = [c for c in cpts if _EM_RANGE.match(c)]
    proc_codes = [c for c in cpts if _PROCEDURE_SURGICAL.match(c)]
    img_codes = [c for c in cpts if _IMAGING.match(c)]
    proc_like = proc_codes + img_codes

    if em_codes and proc_like:
        recommended.append("-25")
        reasoning_lines.append("Separate E/M service performed with procedure — distinct service when documented.")

    if 97 in carcs or "BUNDL" in blob.upper():
        if "-59" not in recommended and "-XS" not in recommended:
            recommended.append("-59")
        reasoning_lines.append("CARC 97 (bundling / inclusive payment) — distinct procedural service may require -59 or -XS.")

    if 4 in carcs or "MODIFIER" in blob.upper():
        if "-59" not in recommended:
            recommended.append("-59")
        reasoning_lines.append("CARC 4 or modifier-related denial — review NCCI and append -59 or appropriate modifier when distinct.")

    if ctx.get("global_period_unrelated") or "GLOBAL" in blob.upper():
        recommended.append("-24")
        reasoning_lines.append("Unrelated E/M during postoperative global period — use -24 when policy criteria are met.")

    if "REPEAT" in blob.upper() or 76 in carcs:
        recommended.append("-76")
        reasoning_lines.append("Repeat procedure by same physician — -76 when the same procedure is repeated.")

    if "DIFFERENT" in blob.upper() and "PHYSICIAN" in blob.upper():
        recommended.append("-77")
        reasoning_lines.append("Repeat procedure, different physician — consider -77.")

    n_proc = len([c for c in cpts if _PROCEDURE_SURGICAL.match(c) or _IMAGING.match(c)])
    if n_proc >= 2:
        if "-59" not in recommended and "-XS" not in recommended:
            recommended.append("-59")
        reasoning_lines.append("Multiple procedures — evaluate distinct services; -59 or -XS when separately reportable.")

    seen = set()
    mods: List[str] = []
    for m in recommended:
        if m not in seen:
            seen.add(m)
            mods.append(m)

    if not reasoning_lines:
        reasoning_lines.append("No automatic modifier rules triggered — verify payer policy and NCCI edits.")

    return {
        "recommendedModifiers": mods[:8],
        "reasoning": reasoning_lines[:12],
        "matched_carcs": carcs,
    }


def detectDenialRisk(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    detectDenialRisk(input) — uses cptCodes, icdCodes, modifiers, carcCodes, payer, planType.
    """
    risks: List[str] = []
    recs: List[str] = []
    score = 0

    cpts = _split_codes(input_data.get("cpt_codes") or input_data.get("cptCodes"))
    icds = _split_icd(
        input_data.get("icd10_codes")
        or input_data.get("icd_codes")
        or input_data.get("diagnosis_code")
        or input_data.get("icdCodes")
    )
    mods = str(input_data.get("modifiers") or "").upper()
    payer = str(input_data.get("payer") or "")
    plan = str(input_data.get("planType") or input_data.get("plan_type") or "")

    carc_blob = " ".join(
        [
            str(input_data.get("denial_code") or ""),
            str(input_data.get("carc_codes") or ""),
            str(input_data.get("carcCodes") or ""),
        ]
    )
    if isinstance(input_data.get("carcCodes"), list):
        carc_blob += " " + " ".join(str(x) for x in input_data["carcCodes"])
    denial_blob = " ".join(
        [
            carc_blob,
            str(input_data.get("denial_reason") or ""),
            str(input_data.get("rarc_codes") or ""),
        ]
    )
    carc_nums = _parse_carc_from_text(denial_blob)

    if not cpts:
        score += 15
        risks.append("Missing procedure codes — high scrubber / medical necessity exposure.")
        recs.append("Enter all line-item CPT/HCPCS codes.")

    if not icds:
        score += 22
        risks.append("Missing diagnosis codes — high likelihood of medical necessity denial.")
        recs.append("Add ICD-10 codes tied to documentation.")

    for icd in icds:
        if _icd_specificity(icd) in ("unspecified", "general_z") and cpts:
            score += 12
            risks.append("Weak ICD-10 specificity relative to billed services.")
            recs.append("Use specific, billable diagnoses supported by the record.")
            break

    em_codes = [c for c in cpts if _EM_RANGE.match(c)]
    proc_codes = [c for c in cpts if _PROCEDURE_SURGICAL.match(c)]
    if em_codes and proc_codes and "-25" not in mods and "25" not in mods:
        score += 18
        risks.append("HIGH RISK: E/M plus procedure same day without modifier -25 — likely bundling or denial.")
        recs.append("Add modifier -25 to the E/M when separately identifiable.")

    if 197 in carc_nums or 16 in carc_nums:
        score += 14
        risks.append("Authorization / precertification cited on claim (CARC pattern).")
        recs.append("Secure authorization or retro-auth documentation before resubmission.")

    if 252 in _parse_carc_from_text(denial_blob):
        score += 8
        risks.append("Additional documentation or authorization gap (CARC 252 pattern).")
        recs.append("Submit complete clinical packet or auth proof.")

    if any(_IMAGING.match(c) for c in cpts):
        score += 8
        risks.append("Authorization-sensitive CPT: advanced imaging often requires precert.")
        recs.append("Confirm precertification and medical necessity narrative.")

    if plan.upper() in ("MEDICAID", "MEDICARE"):
        score += 5
        risks.append(f"{plan} plans often apply strict LCD / NCD medical necessity rules.")
        recs.append("Align diagnoses and modifiers with program coverage policies.")

    if "UNITED" in payer.upper() or "UHC" in payer.upper():
        score += 6
        risks.append("Known payer pattern: strict policy-driven medical necessity reviews.")
        recs.append("Cite applicable clinical policy in documentation.")

    if em_codes and icds and all(i.startswith("Z") for i in icds) and any(c >= "99204" for c in em_codes):
        score += 14
        risks.append("HIGH RISK: high-complexity E/M without active diagnosis codes on claim.")
        recs.append("Strengthen clinical documentation and diagnosis linkage.")

    if score >= 38:
        level = "High"
    elif score >= 20:
        level = "Medium"
    else:
        level = "Low"

    if not risks:
        risks.append("Properly matched coding — continue routine documentation review.")
    if not recs:
        recs.append("Maintain complete chart and timely filing.")

    return {
        "riskLevel": level,
        "riskScore": min(100, score),
        "risks": risks[:12],
        "recommendations": recs[:12],
    }


def run_intelligence_analysis(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Single payload: cpt_codes / cptCodes; icd10_codes (canonical) / icd_codes / icdCodes / diagnosis_code; carcCodes; planType."""
    cpt = payload.get("cpt_codes") or payload.get("cptCodes") or ""
    icd = (
        payload.get("icd10_codes")
        or payload.get("icd_codes")
        or payload.get("icdCodes")
        or payload.get("diagnosis_code")
        or ""
    )

    carc_list = payload.get("carcCodes") or payload.get("carc_codes")
    if carc_list is None and payload.get("carc_codes"):
        carc_list = payload.get("carc_codes")

    denial = payload.get("denial_codes") or payload.get("denial_code") or ""
    denial += " " + str(payload.get("carc_codes") or "") + " " + str(payload.get("rarc_codes") or "")
    if isinstance(carc_list, list):
        denial += " " + " ".join(str(x) for x in carc_list)

    coding = validateCoding({"cptCodes": cpt, "icdCodes": icd})
    modifiers = suggestModifiers(
        {
            "cptCodes": cpt,
            "carcCodes": carc_list if carc_list is not None else payload.get("carc_codes"),
            "context": {
                "denial_reason": payload.get("denial_reason"),
                "global_period_unrelated": payload.get("global_period_unrelated"),
            },
        },
        denial,
        None,
    )
    risk = detectDenialRisk(payload)
    return {
        "coding": coding,
        "modifiers": modifiers,
        "risk": risk,
    }


def validateCoding_export(cpt_codes: Any, icd_codes: Any) -> Dict[str, Any]:
    return validateCoding(cpt_codes, icd_codes)
