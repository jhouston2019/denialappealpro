"""
High-accuracy denial / EOB extraction via OpenAI structured JSON.
Falls back gracefully when API unavailable; pairs with regex merge in pdf_parser.
"""

from __future__ import annotations

import json
import logging
import os
import re
from copy import deepcopy
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """You are a medical billing denial extraction engine.

Extract structured claim data from the input text.

The input may be messy, incomplete, or poorly formatted.

Your job is to identify and extract ONLY the following fields:

- payer_name
- claim_number
- patient_name (or initials if available)
- date_of_service
- cpt_codes (array)
- icd10_codes (array)
- modifiers (array)
- carc_codes (array)
- rarc_codes (array)
- billed_amount
- paid_amount
- denial_reason_text (short, exact wording from document)

-----------------------------------
RULES:
-----------------------------------

1. DO NOT GUESS
   - If a value is not clearly present, return null

2. HANDLE MULTIPLE VALUES
   - CPT, ICD, CARC, RARC must be arrays

3. NORMALIZE DATA:
   - CPT codes: numeric strings (e.g. "99213")
   - ICD-10: keep formatting (e.g. "M54.5")
   - CARC: numbers only (e.g. "50")
   - RARC: codes (e.g. "N115")

4. AMOUNTS:
   - Extract numeric values only
   - Remove $, commas

5. DATES:
   - Convert to YYYY-MM-DD if possible

6. DENIAL TEXT:
   - Extract exact denial explanation (1–2 sentences max)

7. PRIORITIZE ACCURACY OVER COMPLETENESS

-----------------------------------
OUTPUT FORMAT (STRICT JSON):
-----------------------------------

{
  "payer_name": "",
  "claim_number": "",
  "patient_name": "",
  "date_of_service": "",
  "cpt_codes": [],
  "icd10_codes": [],
  "modifiers": [],
  "carc_codes": [],
  "rarc_codes": [],
  "billed_amount": "",
  "paid_amount": "",
  "denial_reason_text": ""
}

Use null for any field you cannot support with confidence (not empty string)."""


EXPECTED_KEYS = (
    "payer_name",
    "claim_number",
    "patient_name",
    "date_of_service",
    "cpt_codes",
    "icd10_codes",
    "modifiers",
    "carc_codes",
    "rarc_codes",
    "billed_amount",
    "paid_amount",
    "denial_reason_text",
)


def is_llm_extraction_enabled() -> bool:
    key = os.getenv("OPENAI_API_KEY", "") or ""
    key = key.strip()
    return bool(key and not key.startswith("sk-proj-your"))


def _dedupe_preserve(seq: List[Any]) -> List[Any]:
    seen = set()
    out = []
    for x in seq:
        if x is None:
            continue
        s = str(x).strip()
        if not s:
            continue
        k = s.upper()
        if k in seen:
            continue
        seen.add(k)
        out.append(s)
    return out


def _normalize_amount(val: Any) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return str(Decimal(str(val)).quantize(Decimal("0.01")))
    s = str(val).strip()
    if not s or s.lower() == "null":
        return None
    s = re.sub(r"[$,\s]", "", s)
    if not s:
        return None
    try:
        return str(Decimal(s).quantize(Decimal("0.01")))
    except (InvalidOperation, ValueError):
        return None


def _normalize_date(val: Any) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() == "null":
        return None
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%Y/%m/%d", "%d-%b-%Y", "%b %d, %Y"):
        try:
            from datetime import datetime

            return datetime.strptime(s[:20], fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _normalize_carc_token(c: str) -> str:
    s = str(c).strip()
    digits = re.sub(r"\D", "", s)
    if not digits:
        return ""
    n = int(digits)
    return str(n)


def _normalize_rarc_token(c: str) -> str:
    s = str(c).strip().upper()
    m = re.match(r"^([NMP]A?)(\d+)$", s, re.I)
    if m:
        return f"{m.group(1).upper()}{m.group(2)}"
    return s


def post_process_extraction(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Validate shape, empty string → null, dedupe arrays, normalize amounts/dates."""
    if not data or not isinstance(data, dict):
        data = {}
    out: Dict[str, Any] = {}
    for k in EXPECTED_KEYS:
        out[k] = None

    for k in EXPECTED_KEYS:
        v = data.get(k)
        if k in (
            "cpt_codes",
            "icd10_codes",
            "modifiers",
            "carc_codes",
            "rarc_codes",
        ):
            if v is None:
                out[k] = []
            elif isinstance(v, list):
                out[k] = _dedupe_preserve(v)
            elif isinstance(v, str) and v.strip():
                parts = re.split(r"[,;\s]+", v.strip())
                out[k] = _dedupe_preserve([p for p in parts if p])
            else:
                out[k] = []
            continue

        if v is None or (isinstance(v, str) and not v.strip()):
            out[k] = None
            continue

        if k in ("billed_amount", "paid_amount"):
            out[k] = _normalize_amount(v)
            continue

        if k == "date_of_service":
            out[k] = _normalize_date(v)
            continue

        out[k] = str(v).strip() if v is not None else None

    # CPT: keep numeric 5-digit style when possible
    cpts = []
    for c in out["cpt_codes"]:
        cu = str(c).upper().strip()
        if re.match(r"^\d{5}$", cu) or re.match(r"^[A-V]\d{4}$", cu):
            cpts.append(cu)
        elif re.match(r"^\d{4,5}$", cu):
            cpts.append(cu.zfill(5) if len(cu) < 5 else cu)
        else:
            cpts.append(cu)
    out["cpt_codes"] = _dedupe_preserve(cpts)[:40]

    carcs = []
    for c in out["carc_codes"]:
        nc = _normalize_carc_token(c)
        if nc:
            carcs.append(nc)
    out["carc_codes"] = _dedupe_preserve(carcs)[:30]

    rarcs = []
    for c in out["rarc_codes"]:
        nr = _normalize_rarc_token(c)
        if nr:
            rarcs.append(nr)
    out["rarc_codes"] = _dedupe_preserve(rarcs)[:30]

    out["icd10_codes"] = _dedupe_preserve([str(x).upper().strip() for x in out["icd10_codes"]])[:40]
    out["modifiers"] = _dedupe_preserve([str(x).upper().strip().replace("-", "") for x in out["modifiers"]])[
        :20
    ]

    if out["denial_reason_text"]:
        out["denial_reason_text"] = str(out["denial_reason_text"]).strip()[:800]

    return out


def _compact_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower())


def _verbatim_in_raw(value: Optional[str], raw_text: str) -> bool:
    if not value or not raw_text:
        return False
    v = str(value).strip()
    if len(v) < 3:
        return False
    if v in raw_text:
        return True
    if v.lower() in raw_text.lower():
        return True
    v2 = re.sub(r"[\s\-]+", "", v)
    r2 = re.sub(r"[\s\-]+", "", raw_text)
    if len(v2) >= 5 and v2.lower() in r2.lower():
        return True
    return False


def _code_in_raw(code: str, raw_text: str) -> bool:
    if not code or not raw_text:
        return False
    c = str(code).strip()
    if len(c) < 2:
        return False
    if c in raw_text:
        return True
    if c.upper() in raw_text.upper():
        return True
    return False


def calculate_confidence(extracted_data: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    """
    Per-field high | medium | low using presence + match against raw text.
    """
    raw = raw_text or ""
    fc: Dict[str, str] = {}

    def set_field(key: str, level: str):
        fc[key] = level

    # Scalars
    for field, val in [
        ("payer_name", extracted_data.get("payer_name")),
        ("claim_number", extracted_data.get("claim_number")),
        ("patient_name", extracted_data.get("patient_name")),
        ("date_of_service", extracted_data.get("date_of_service")),
        ("billed_amount", extracted_data.get("billed_amount")),
        ("paid_amount", extracted_data.get("paid_amount")),
        ("denial_reason_text", extracted_data.get("denial_reason_text")),
    ]:
        if val is None or val == "" or (isinstance(val, list) and not val):
            set_field(field, "low")
            continue
        sval = str(val)
        if field in ("billed_amount", "paid_amount"):
            digits = re.sub(r"[^\d.]", "", sval)
            if digits and digits.replace(".", "", 1).isdigit():
                if _verbatim_in_raw(sval, raw) or re.search(
                    re.escape(digits.split(".")[0]), raw.replace(",", "")
                ):
                    set_field(field, "high")
                else:
                    set_field(field, "medium")
            else:
                set_field(field, "low")
        elif field == "date_of_service":
            if _verbatim_in_raw(sval, raw) or sval.replace("-", "/") in raw:
                set_field(field, "high")
            else:
                set_field(field, "medium")
        elif field == "denial_reason_text":
            if len(sval) >= 20 and _compact_text(sval)[:80] in _compact_text(raw):
                set_field(field, "high")
            elif any(w for w in sval.split()[:6] if len(w) > 4 and w.lower() in raw.lower()):
                set_field(field, "medium")
            else:
                set_field(field, "low")
        else:
            if _verbatim_in_raw(sval, raw):
                set_field(field, "high")
            else:
                set_field(field, "medium")

    # Arrays — aggregate level
    for arr_key, item_checker in [
        ("cpt_codes", lambda item: _code_in_raw(item, raw)),
        ("icd10_codes", lambda item: _code_in_raw(item.replace(".", ""), raw.replace(".", ""))),
        ("carc_codes", lambda item: _code_in_raw(item, raw) or _code_in_raw(f"CO {item}", raw)),
        ("rarc_codes", lambda item: _code_in_raw(item, raw)),
        ("modifiers", lambda item: _code_in_raw(item, raw) or _code_in_raw("-" + item, raw)),
    ]:
        arr = extracted_data.get(arr_key) or []
        if not arr:
            set_field(arr_key, "low")
            continue
        hits = sum(1 for x in arr if item_checker(str(x)))
        ratio = hits / len(arr) if arr else 0
        if ratio >= 0.7:
            set_field(arr_key, "high")
        elif ratio >= 0.3 or len(arr) > 0:
            set_field(arr_key, "medium")
        else:
            set_field(arr_key, "low")

    levels = {"high": 3, "medium": 2, "low": 1}
    scores = [levels.get(v, 1) for v in fc.values()]
    avg = sum(scores) / max(len(scores), 1)
    if avg >= 2.5:
        overall = "high"
    elif avg >= 1.8:
        overall = "medium"
    else:
        overall = "low"

    return {"fieldConfidence": fc, "overall": overall}


def llm_carc_to_denial_code_strings(carc_codes: List[str]) -> List[str]:
    """Map numeric CARC list to CO-## tokens for merge with regex engine."""
    out = []
    for c in carc_codes or []:
        nc = _normalize_carc_token(str(c))
        if nc:
            out.append(f"CO-{nc}")
    return _dedupe_preserve(out)


def extract_with_openai(raw_text: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Call OpenAI; return post-processed extraction dict or None + error message.
    Never raises — caller merges with regex.
    """
    if not is_llm_extraction_enabled():
        return None, "OpenAI not configured"

    text = raw_text if raw_text else ""
    if len(text.strip()) < 15:
        return None, "text too short"

    try:
        from openai import OpenAI
    except ImportError:
        return None, "openai package missing"

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    model = os.getenv("OPENAI_EXTRACTION_MODEL", "gpt-4o-mini")
    user_block = (
        "Document text (preserve meaning; line breaks may be messy):\n\n"
        + text[:48000]
    )

    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_block},
            ],
        )
        content = (resp.choices[0].message.content or "").strip()
        parsed = json.loads(content)
    except Exception as e:
        logger.warning("LLM denial extraction failed: %s", e)
        return None, str(e)[:300]

    processed = post_process_extraction(parsed if isinstance(parsed, dict) else {})
    return processed, None


def llm_result_to_merged_fields(llm: Dict[str, Any]) -> Dict[str, Any]:
    """Map LLM post-processed fields to pdf_parser-style names."""
    denial_codes = llm_carc_to_denial_code_strings(llm.get("carc_codes") or [])
    return {
        "payer_name": llm.get("payer_name"),
        "claim_number": llm.get("claim_number"),
        "patient_name": llm.get("patient_name"),
        "service_date": llm.get("date_of_service"),
        "denial_date": None,
        "cpt_codes": llm.get("cpt_codes") or [],
        "icd_codes": llm.get("icd10_codes") or [],
        "rarc_codes": llm.get("rarc_codes") or [],
        "denial_codes": denial_codes,
        "billed_amount": _to_float_or_none(llm.get("billed_amount")),
        "paid_amount": _to_float_or_none(llm.get("paid_amount")),
        "denied_amount": None,
        "denial_reason_text": llm.get("denial_reason_text"),
        "modifiers": llm.get("modifiers") or [],
    }


def _to_float_or_none(v: Any) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(Decimal(str(v)))
    except (InvalidOperation, ValueError, TypeError):
        return None


def merge_extraction_layers(
    llm_fields: Optional[Dict[str, Any]],
    regex_fields: Dict[str, Any],
) -> Dict[str, Any]:
    """
    LLM values win when present; regex fills gaps.
    denial_codes / rarc / cpt / icd: union, deduped, all CARCs kept.
    """
    out = deepcopy(regex_fields)
    out.setdefault("modifiers", [])
    out.setdefault("patient_name", None)
    out.setdefault("denial_reason_text", None)
    if not llm_fields:
        return out

    def pick(llm_v, rx_v):
        if llm_v is not None and llm_v != "" and llm_v != []:
            return llm_v
        return rx_v

    out["payer_name"] = pick(llm_fields.get("payer_name"), out.get("payer_name"))
    out["claim_number"] = pick(llm_fields.get("claim_number"), out.get("claim_number"))
    out["service_date"] = pick(llm_fields.get("service_date"), out.get("service_date"))
    if llm_fields.get("denial_date"):
        out["denial_date"] = llm_fields.get("denial_date")

    out["cpt_codes"] = _dedupe_preserve(
        list(llm_fields.get("cpt_codes") or []) + list(out.get("cpt_codes") or [])
    )[:40]
    out["icd_codes"] = _dedupe_preserve(
        list(llm_fields.get("icd_codes") or []) + list(out.get("icd_codes") or [])
    )[:40]
    out["rarc_codes"] = _dedupe_preserve(
        list(llm_fields.get("rarc_codes") or []) + list(out.get("rarc_codes") or [])
    )[:30]

    dc_llm = list(llm_fields.get("denial_codes") or [])
    dc_rx = list(out.get("denial_codes") or [])
    out["denial_codes"] = _dedupe_preserve(dc_llm + dc_rx)[:40]

    if llm_fields.get("billed_amount") is not None:
        out["billed_amount"] = llm_fields.get("billed_amount")
    if llm_fields.get("paid_amount") is not None:
        out["paid_amount"] = llm_fields.get("paid_amount")
    if llm_fields.get("denied_amount") is not None:
        out["denied_amount"] = llm_fields.get("denied_amount")

    out["patient_name"] = pick(llm_fields.get("patient_name"), out.get("patient_name"))
    dr_llm = llm_fields.get("denial_reason_text")
    if dr_llm:
        out["denial_reason_text"] = dr_llm
    out["modifiers"] = _dedupe_preserve(
        list(llm_fields.get("modifiers") or []) + list(out.get("modifiers") or [])
    )[:20]

    return out


def build_api_response_dict(
    merged: Dict[str, Any],
    raw_text: str,
    *,
    llm_used: bool,
    llm_error: Optional[str] = None,
) -> Dict[str, Any]:
    """Assemble final API payload including confidence and field_confidence for UI."""
    conf = calculate_confidence(
        {
            "payer_name": merged.get("payer_name"),
            "claim_number": merged.get("claim_number"),
            "patient_name": merged.get("patient_name"),
            "date_of_service": merged.get("service_date"),
            "cpt_codes": merged.get("cpt_codes"),
            "icd10_codes": merged.get("icd_codes"),
            "modifiers": merged.get("modifiers"),
            "carc_codes": [
                re.sub(r"\D", "", str(x)) for x in (merged.get("denial_codes") or []) if x
            ],
            "rarc_codes": merged.get("rarc_codes"),
            "billed_amount": merged.get("billed_amount"),
            "paid_amount": merged.get("paid_amount"),
            "denial_reason_text": merged.get("denial_reason_text"),
        },
        raw_text,
    )

    billed = merged.get("billed_amount")
    paid = merged.get("paid_amount")
    denied = merged.get("denied_amount")

    fc = conf["fieldConfidence"]
    field_confidence_camel = {
        "claimNumber": fc.get("claim_number", "low"),
        "dateOfService": fc.get("date_of_service", "low"),
        "payer": fc.get("payer_name", "low"),
        "patientName": fc.get("patient_name", "low"),
        "cptCodes": fc.get("cpt_codes", "low"),
        "icdCodes": fc.get("icd10_codes", "low"),
        "carcCodes": fc.get("carc_codes", "low"),
        "rarcCodes": fc.get("rarc_codes", "low"),
        "modifiers": fc.get("modifiers", "low"),
        "billedAmount": fc.get("billed_amount", "low"),
        "paidAmount": fc.get("paid_amount", "low"),
        "denialReasonText": fc.get("denial_reason_text", "low"),
    }

    result = {
        "success": True,
        "denial_codes": merged.get("denial_codes") or [],
        "primary_denial_code": (merged.get("denial_codes") or [None])[0],
        "rarc_codes": merged.get("rarc_codes") or [],
        "cpt_codes": merged.get("cpt_codes") or [],
        "icd_codes": merged.get("icd_codes") or [],
        "modifiers": merged.get("modifiers") or [],
        "claim_number": merged.get("claim_number"),
        "payer_name": merged.get("payer_name"),
        "patient_name": merged.get("patient_name"),
        "denial_date": merged.get("denial_date"),
        "service_date": merged.get("service_date"),
        "billed_amount": billed,
        "denied_amount": denied,
        "paid_amount": paid,
        "provider_npi": merged.get("provider_npi"),
        "raw_text": (raw_text or "")[:500],
        "denial_reason_text": merged.get("denial_reason_text"),
        "confidence": conf["overall"],
        "field_confidence": field_confidence_camel,
        "fieldConfidence": field_confidence_camel,
        "extraction_engine": "llm+regex" if llm_used else "regex",
        "llm_error": llm_error,
    }

    if conf["overall"] == "low":
        result["warning"] = "Low confidence extraction - please review all fields carefully"

    return result


def build_normalized_api_response(
    merged: Dict[str, Any],
    raw_text: str,
    *,
    llm_used: bool,
    llm_error: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Final /api/parse/denial-letter (and denial-text) payload: strict normalized fields
    (no null/undefined) plus confidence and backward-compatible extras for onboarding UI.
    """
    from utils.normalize_denial_parse import (
        normalize_date,
        normalize_denial_parse,
        safe_array,
        safe_string,
    )

    conf = calculate_confidence(
        {
            "payer_name": merged.get("payer_name"),
            "claim_number": merged.get("claim_number"),
            "patient_name": merged.get("patient_name"),
            "date_of_service": merged.get("service_date"),
            "cpt_codes": merged.get("cpt_codes"),
            "icd10_codes": merged.get("icd_codes"),
            "modifiers": merged.get("modifiers"),
            "carc_codes": [
                re.sub(r"\D", "", str(x)) for x in (merged.get("denial_codes") or []) if x
            ],
            "rarc_codes": merged.get("rarc_codes"),
            "billed_amount": merged.get("billed_amount"),
            "paid_amount": merged.get("paid_amount"),
            "denial_reason_text": merged.get("denial_reason_text"),
        },
        raw_text,
    )

    normalized = normalize_denial_parse(merged)

    paid = merged.get("paid_amount")
    denied = merged.get("denied_amount")

    fc = conf["fieldConfidence"]
    field_confidence_camel = {
        "claimNumber": fc.get("claim_number", "low"),
        "dateOfService": fc.get("date_of_service", "low"),
        "payer": fc.get("payer_name", "low"),
        "patientName": fc.get("patient_name", "low"),
        "cptCodes": fc.get("cpt_codes", "low"),
        "icdCodes": fc.get("icd10_codes", "low"),
        "carcCodes": fc.get("carc_codes", "low"),
        "rarcCodes": fc.get("rarc_codes", "low"),
        "modifiers": fc.get("modifiers", "low"),
        "billedAmount": fc.get("billed_amount", "low"),
        "paidAmount": fc.get("paid_amount", "low"),
        "denialReasonText": fc.get("denial_reason_text", "low"),
    }

    err = "" if llm_error is None else str(llm_error)

    result: Dict[str, Any] = {
        "success": True,
        **normalized,
        "patient_name": safe_string(merged.get("patient_name")),
        "denial_date": normalize_date(merged.get("denial_date")),
        "paid_amount": safe_string(paid) if paid is not None else "",
        "denied_amount": safe_string(denied) if denied is not None else "",
        "modifiers": safe_array(merged.get("modifiers")),
        "confidence": conf["overall"],
        "field_confidence": field_confidence_camel,
        "fieldConfidence": field_confidence_camel,
        "raw_text": (raw_text or "")[:500],
        "extraction_engine": "llm+regex" if llm_used else "regex",
        "llm_error": err,
    }

    if conf["overall"] == "low":
        result["warning"] = "Low confidence extraction - please review all fields carefully"

    return result
