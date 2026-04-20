"""
Normalize denial / EOB parse output to a strict API shape (no null/undefined).
Used by /api/parse/denial-letter and /api/parse/denial-text.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def normalize_date(value: Any) -> str:
    """Parse common date strings and return YYYY-MM-DD, or \"\" if unparseable."""
    if not value:
        return ""

    s = str(value).strip()
    if not s:
        return ""

    formats = [
        "%m/%d/%Y",
        "%m/%d/%y",
        "%Y-%m-%d",
        "%m-%d-%Y",
        "%Y/%m/%d",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return ""


def safe_array(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        out = []
        for x in val:
            if x is None:
                continue
            s = str(x).strip()
            if s:
                out.append(s)
        return out
    s = str(val).strip()
    return [s] if s else []


def _merge_icd_fields(raw: Dict[str, Any]) -> List[str]:
    """Union icd_codes + icd10_codes (dedupe, preserve order)."""
    combined = safe_array(raw.get("icd_codes")) + safe_array(raw.get("icd10_codes"))
    seen: set[str] = set()
    out: List[str] = []
    for c in combined:
        k = c.upper()
        if k in seen:
            continue
        seen.add(k)
        out.append(c)
    return out


def safe_string(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, float):
        try:
            return str(Decimal(str(val)).quantize(Decimal("0.01")))
        except (InvalidOperation, ValueError):
            return str(val).strip()
    if isinstance(val, int) and not isinstance(val, bool):
        return str(val)
    return str(val).strip()


def normalize_denial_parse(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return only canonical fields; every value is "" or [] (never None).
    """
    payer = safe_string(raw.get("payer_name") or raw.get("payer"))
    claim = safe_string(raw.get("claim_number"))

    raw_service = raw.get("service_date") or raw.get("date_of_service")
    service_date = normalize_date(raw_service)
    if raw_service not in (None, "") and str(raw_service).strip() and not service_date:
        logger.warning("Invalid service_date format: %s", raw_service)

    cpt_codes = safe_array(raw.get("cpt_codes"))
    icd_codes = _merge_icd_fields(raw)

    primary = safe_string(raw.get("primary_denial_code"))
    if not primary:
        dc_fallback = safe_array(raw.get("denial_codes"))
        if dc_fallback:
            primary = dc_fallback[0]

    rarc_codes = safe_array(raw.get("rarc_codes"))

    denial_reason = safe_string(
        raw.get("denial_reason_text") or raw.get("note") or raw.get("remark")
    )

    billed = safe_string(raw.get("billed_amount"))

    denial_codes: List[str] = []
    if primary:
        denial_codes.append(primary)
    for code in rarc_codes:
        if code and code not in denial_codes:
            denial_codes.append(code)

    # Dedupe preserving order
    seen = set()
    deduped: List[str] = []
    for c in denial_codes:
        k = c.upper()
        if k in seen:
            continue
        seen.add(k)
        deduped.append(c)

    patient_nm = safe_string(raw.get("patient_name") or raw.get("patient") or raw.get("member_name"))

    out = {
        "payer_name": payer,
        "claim_number": claim,
        "service_date": service_date,
        "cpt_codes": list(cpt_codes),
        "icd_codes": list(icd_codes),
        "primary_denial_code": primary,
        "rarc_codes": list(rarc_codes),
        "denial_codes": deduped,
        "denial_reason_text": denial_reason,
        "billed_amount": billed,
        "provider_npi": safe_string(raw.get("provider_npi")),
        "provider_name": safe_string(raw.get("provider_name")),
        "patient_id": safe_string(raw.get("patient_id")),
        "patient_name": patient_nm,
    }

    # Optional high-impact default for common CARC
    p_digits = re.sub(r"\D", "", primary)
    if not out["denial_reason_text"] and p_digits == "97":
        out["denial_reason_text"] = (
            "Procedure bundled with another service and not separately payable."
        )

    if not out["payer_name"]:
        logger.warning("Missing payer_name after normalize_denial_parse")
    if not out["claim_number"]:
        logger.warning("Missing claim_number after normalize_denial_parse")

    return out


def extract_structured(text: str) -> Dict[str, Any]:
    """
    Deterministic label-based extraction (PAYER:, CLM#:, DOS:, etc.).
    Structured values override AI/regex when non-empty (see overlay_structured_over_merge).
    """
    if not text:
        text = ""

    def get(pattern: str) -> str:
        m = re.search(pattern, text, re.I)
        return m.group(1).strip() if m else ""

    cpt_m = re.search(r"CPT:\s*([0-9/\s]+)", text, re.I)
    cpt_part = cpt_m.group(1) if cpt_m else ""
    cpt_codes = [x for x in re.split(r"[/,\s]+", cpt_part.strip()) if x]

    icd_m = re.search(r"ICD:\s*([A-Z0-9\.]+)", text, re.I)
    icd_part = icd_m.group(1) if icd_m else ""
    icd_codes = [x for x in re.split(r"[,\s]+", icd_part.strip()) if x]

    carc_m = re.search(r"CARC\s*(\d+)", text, re.I)
    primary_denial_code = carc_m.group(1).strip() if carc_m else ""

    rarc_codes = re.findall(r"N\d+", text, re.I)
    rarc_codes = list(dict.fromkeys(x.upper() for x in rarc_codes))

    note = get(r"NOTE:\s*(.+)")
    remark = get(r"Remark:\s*(.+)")
    denial_reason_text = (note + " " + remark).strip()

    def get_patient_line() -> str:
        patterns = [
            r"(?:Patient|Member|Subscriber|Insured|Beneficiary)(?:\s+Name)?\s*[:#]\s*([^\n\r]{2,120})",
            r"Pt\.?\s*Name\s*[:#]\s*([^\n\r]{2,120})",
            r"(?:Name\s+of\s+(?:Patient|Member|Subscriber))\s*[:#]\s*([^\n\r]{2,120})",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.I)
            if m:
                s = m.group(1).strip().strip('"').strip("'").rstrip(",").strip()
                if len(s) >= 2:
                    return s
        return ""

    patient_name = get_patient_line()

    return {
        "payer_name": get(r"PAYER:\s*(.+)"),
        "claim_number": get(r"CLM#:\s*([A-Z0-9\-]+)"),
        "service_date": get(r"DOS:\s*([0-9/\-]+)"),
        "patient_name": patient_name,
        "cpt_codes": cpt_codes,
        "icd_codes": icd_codes,
        "primary_denial_code": primary_denial_code,
        "rarc_codes": rarc_codes,
        "denial_reason_text": denial_reason_text,
    }


def overlay_structured_over_merge(merged: Dict[str, Any], structured: Dict[str, Any]) -> Dict[str, Any]:
    """Apply structured fields on top of merged extraction; structured wins when non-empty."""
    out = dict(merged)
    for k, v in structured.items():
        if v is None:
            continue
        if isinstance(v, str) and not v.strip():
            continue
        if isinstance(v, list) and len(v) == 0:
            continue
        out[k] = v
    return out
