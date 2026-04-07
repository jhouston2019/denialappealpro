"""
Submission-ready appeal generation from structured claim/denial data.
Mandatory section order, CARC interpretation, multi-denial handling, deterministic fallback.
"""

from __future__ import annotations

import datetime
import json
import logging
import math
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import openai

from appeal_output_structure import extract_carc_rarc_from_intake, patient_initials

logger = logging.getLogger(__name__)


def _make_serializable(obj, _depth=0):
    if _depth > 10:
        return str(obj)
    if obj is None or isinstance(obj, (bool, int, float, str)):
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        return obj
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {str(k): _make_serializable(v, _depth + 1) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_make_serializable(i, _depth + 1) for i in obj]
    return str(obj)


def _truncate_string_values(obj, max_len=2000, _depth=0):
    if _depth > 10:
        return obj
    if isinstance(obj, str):
        return obj[:max_len] + "…[truncated]" if len(obj) > max_len else obj
    if isinstance(obj, dict):
        return {k: _truncate_string_values(v, max_len, _depth + 1) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_truncate_string_values(i, max_len, _depth + 1) for i in obj]
    return obj

# CARC → interpretation label (Part 2)
CARC_INTERPRETATION: Dict[str, str] = {
    "50": "medical necessity",
    "97": "bundling / included service",
    "197": "authorization required",
    "29": "timely filing",
    "45": "payment reduction",
    "96": "non-covered service",
    "18": "duplicate claim",
    "119": "frequency limit",
}

# Internal keys for argument templates (one block per CARC in order)
CARC_CATEGORY_KEY: Dict[str, str] = {
    "50": "medical_necessity",
    "97": "bundling",
    "197": "authorization",
    "29": "timely_filing",
    "45": "payment_reduction",
    "96": "non-covered",
    "18": "duplicate",
    "119": "frequency_limit",
}

DEFAULT_PROVIDER_LINE = os.getenv("APPEAL_LETTER_PROVIDER", "Billing Department")

SUBMISSION_APPEAL_SYSTEM_PROMPT = """You are an experienced medical billing appeals specialist. Your output is pasted directly into payer portals or mailed as a formal appeal — ZERO editing by the user.

You will receive STRUCTURED JSON with claim and denial fields. Generate ONE complete appeal letter.

-----------------------------------
DENIAL INTERPRETATION (use for reasoning; do not output this table verbatim)
-----------------------------------

CARC meanings:
- 50 → Medical necessity
- 97 → Bundling / included service
- 197 → Authorization required
- 29 → Timely filing
- 45 → Payment reduction
- 96 → Non-covered service
- 18 → Duplicate claim
- 119 → Frequency limit

If multiple CARC codes appear in the JSON carc_codes array:
- Address EACH denial basis in sequence within APPEAL ARGUMENT
- Combine into one cohesive letter (no duplicate headers)
- Do not collapse multiple codes into a single generic paragraph

-----------------------------------
MANDATORY OUTPUT STRUCTURE (EXACT ORDER, EXACT TOP-LEVEL HEADINGS)
-----------------------------------

HEADER
(empty line)
Provider: [Use the JSON provider_display if present and non-empty; otherwise use exactly: Billing Department]
Payer: [payer_name from JSON]
Patient: [patient_initials from JSON if present; else first letter of patient_name; else exactly: Patient]
Claim Number: [claim_number]
Date of Service: [date_of_service in YYYY-MM-DD or as provided]
CPT Codes: [comma-separated from cpt_codes array, or "As documented" if empty]
ICD-10 Codes: [comma-separated from icd10_codes array, or "As documented" if empty]
Modifiers: [comma-separated from modifiers array, or "None listed" if empty]
Denial Codes: [CARC codes and RARC codes clearly labeled, e.g. CARC: 50, 97 | RARC: N115]

DENIAL SUMMARY
(empty line)
Single paragraph using this pattern (fill bracketed parts from JSON and interpretations):
This claim was denied under CARC [list] and RARC [list], indicating [clear, precise interpretation aligned with the CARC meanings above].

APPEAL ARGUMENT
(empty line)
Build subsections ONLY for denial types present in carc_codes (one block per distinct type, in order of first appearance):

IF MEDICAL NECESSITY (CARC 50):
- State condition and treatment tied to chart/claim context
- Explain clinical necessity
- Emphasize risk if untreated

IF BUNDLING / INCLUDED SERVICE (CARC 97):
- Explain services are distinct and separately identifiable
- Reference separate procedures/sites/sessions where applicable
- Include modifier logic when relevant (e.g. distinct procedural service, -59 / NCCI separation criteria)

IF AUTHORIZATION REQUIRED (CARC 197):
- Argue urgency or exception pathway
- State medical necessity override where supported by facts in JSON

IF TIMELY FILING (CARC 29):
- Provide reason for delay consistent with JSON
- Assert valid exception or good-cause framing (professional, factual)

IF PAYMENT REDUCTION (CARC 45):
- Argue underpayment relative to contract/benefit
- Reference billed vs paid gap from JSON when amounts exist

IF NON-COVERED SERVICE (CARC 96):
- Rebut non-coverage with coverage and medical necessity tied to JSON

IF DUPLICATE CLAIM (CARC 18):
- Clarify distinct service, date, location, or claim line vs any prior payment

IF FREQUENCY LIMIT (CARC 119):
- Justify continued care; emphasize clinical course / worsening when supported

If a CARC in JSON is not in the list above, still address it with a short professional rebuttal tied to denial_reason_text.

STRATEGY INSERT
(empty line)
Include 3–5 bullet lines (- ) with:
- Modifier recommendations when coding or bundling is at issue
- Coding validation statements (CPT/ICD alignment to documentation)
- Direct rebuttal of payer determination, e.g.: "The determination that this service is not medically necessary is not supported by the clinical documentation."

Tone: assertive, professional, no hedging.

DOCUMENTATION STATEMENT
(empty line)
Exactly this sentence:
Supporting documentation is available and can be provided upon request.

FINAL REQUEST
(empty line)
Exactly this sentence:
We respectfully request reconsideration and reprocessing of this claim for full reimbursement.

SIGNATURE
(empty line)
Exactly:
Sincerely,
Billing Department

-----------------------------------
STYLE (MANDATORY)
-----------------------------------

- No fluff, filler, or throat-clearing
- No conversational tone ("I am writing", "Thank you", "please kindly", apologies)
- No markdown code fences or JSON in the output
- Direct, professional, defensible billing language
- Output must read as written by a senior billing professional, not AI
"""


def _digits_carc(tok: str) -> Optional[str]:
    s = str(tok).strip().upper()
    if not s or s in ("AS", "STATED", "ON", "EOB", "(NONE)"):
        return None
    m = re.match(r"^(?:CO|PR|OA|CARC)[:\s-]*(\d{1,3})$", s, re.I)
    if m:
        return str(int(m.group(1)))
    m = re.match(r"^(\d{1,3})$", s)
    if m:
        return str(int(m.group(1)))
    return None


def extract_carc_codes_from_appeal(appeal) -> List[str]:
    carc_line, _ = extract_carc_rarc_from_intake(appeal)
    out: List[str] = []
    for part in re.split(r"[,;\s]+", carc_line or ""):
        d = _digits_carc(part)
        if d and d not in out:
            out.append(d)
    dc = getattr(appeal, "denial_code", None) or ""
    d0 = _digits_carc(dc)
    if d0 and d0 not in out:
        out.insert(0, d0)
    text = f"{getattr(appeal, 'denial_reason', '') or ''} {dc}"
    for m in re.finditer(r"\bCO[\s:-]*(\d{1,3})\b", text, re.I):
        d = str(int(m.group(1)))
        if d not in out:
            out.append(d)
    for m in re.finditer(r"\b(?:PR|OA)[\s:-]*(\d{1,3})\b", text, re.I):
        d = str(int(m.group(1)))
        if d not in out:
            out.append(d)
    return out[:20]


def extract_rarc_codes_from_appeal(appeal) -> List[str]:
    _, rarc_line = extract_carc_rarc_from_intake(appeal)
    out: List[str] = []
    for part in re.split(r"[,;\s]+", rarc_line or ""):
        p = str(part).strip().upper()
        if re.match(r"^(N\d{1,4}|M\d{1,3}|MA\d{2,4})$", p) and p not in out:
            out.append(p)
    text = getattr(appeal, "denial_reason", "") or ""
    for m in re.finditer(r"\b(N\d{1,4}|M\d{1,3}|MA\d{2,4})\b", text, re.I):
        u = m.group(1).upper()
        if u not in out:
            out.append(u)
    return out[:20]


def _split_codes(s: Optional[str]) -> List[str]:
    if not s:
        return []
    return [x.strip() for x in re.split(r"[,;\s]+", str(s)) if x.strip()][:40]


def _extract_modifiers(cpt_field: Optional[str]) -> List[str]:
    if not cpt_field:
        return []
    out: List[str] = []
    for tok in re.split(r"[,;\s]+", str(cpt_field)):
        t = tok.strip()
        if re.match(r"^-?\d{2}$", t) and not t.lstrip("-").startswith("0"):
            norm = t if t.startswith("-") else f"-{t}"
            if norm not in out:
                out.append(norm)
    return out[:20]


def _derive_patient_initials(appeal) -> str:
    base = patient_initials(appeal)
    if base and base != "XX":
        return base
    name = (getattr(appeal, "patient_name", None) or "").strip()
    if len(name) >= 2:
        parts = [p for p in re.split(r"[\s,]+", name) if p]
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[-1][0]}".upper()
        return re.sub(r"[^A-Za-z]", "", name)[:2].upper() or "Patient"
    return "Patient"


def _money_str(v: Any) -> str:
    if v is None or v == "":
        return ""
    try:
        return f"{float(str(v).replace(',', '').strip()):.2f}"
    except (TypeError, ValueError):
        return ""


def _paid_from_denial_reason(text: str) -> str:
    if not text:
        return ""
    m = re.search(
        r"Paid(?:\s+amount)?[:\s]*\$?\s*([\d,]+\.?\d*)",
        text,
        re.I,
    )
    if m:
        return m.group(1).replace(",", "")
    return ""


def build_structured_intake_from_appeal(appeal) -> Dict[str, Any]:
    dos = getattr(appeal, "date_of_service", None)
    dos_s = dos.strftime("%Y-%m-%d") if dos else ""
    billed = getattr(appeal, "billed_amount", None)
    dr = getattr(appeal, "denial_reason", "") or ""
    paid_raw = getattr(appeal, "paid_amount", None)
    if paid_raw is None:
        ptxt = _paid_from_denial_reason(dr)
        paid_raw = ptxt if ptxt else None
    initials = _derive_patient_initials(appeal)
    pname = getattr(appeal, "patient_name", None) or getattr(appeal, "patient_id", "") or ""
    provider = getattr(appeal, "provider_name", None) or ""
    denial_snippet = dr.strip()[:1500]
    return {
        "payer_name": getattr(appeal, "payer", None)
        or getattr(appeal, "payer_name", "")
        or "Unknown payer",
        "claim_number": getattr(appeal, "claim_number", "") or "",
        "patient_name": str(pname).strip(),
        "patient_initials": initials,
        "date_of_service": dos_s,
        "cpt_codes": _split_codes(getattr(appeal, "cpt_codes", None)),
        "icd10_codes": _split_codes(getattr(appeal, "diagnosis_code", None)),
        "modifiers": _extract_modifiers(getattr(appeal, "cpt_codes", None)),
        "carc_codes": extract_carc_codes_from_appeal(appeal),
        "rarc_codes": extract_rarc_codes_from_appeal(appeal),
        "billed_amount": _money_str(billed),
        "paid_amount": _money_str(paid_raw),
        "denial_reason_text": denial_snippet,
        "provider_display": provider.strip() or DEFAULT_PROVIDER_LINE,
    }


def _denial_interpretation_phrase(carc_codes: List[str]) -> str:
    if not carc_codes:
        return "a payer adjustment as described in the remittance advice"
    labels = []
    for c in carc_codes:
        lab = CARC_INTERPRETATION.get(c)
        if lab and lab not in labels:
            labels.append(lab)
    if not labels:
        return "multiple adjustment categories requiring formal reconsideration"
    if len(labels) == 1:
        return labels[0]
    return "multiple separate issues: " + "; ".join(labels)


def _ordered_unique_carcs(carc_codes: List[str]) -> List[str]:
    """Preserve order; one argument block per distinct CARC (each code handled separately)."""
    seen = set()
    out: List[str] = []
    for c in carc_codes:
        if c in seen:
            continue
        seen.add(c)
        out.append(c)
    return out


def _argument_block_for_category(carc: str, cat: str, d: Dict[str, Any]) -> str:
    cpt = ", ".join(d.get("cpt_codes") or []) or "the billed procedure(s)"
    icd = ", ".join(d.get("icd10_codes") or []) or "the documented diagnosis(es)"
    mods = ", ".join(d.get("modifiers") or [])
    amt_b = d.get("billed_amount") or ""
    amt_p = d.get("paid_amount") or ""
    snip = (d.get("denial_reason_text") or "").strip()
    snip_line = f" Payer rationale excerpt: {snip[:400]}" if snip else ""

    if cat == "medical_necessity":
        return f"""MEDICAL NECESSITY (CARC {carc})
The services billed ({cpt}) with diagnoses ({icd}) reflect medically necessary care consistent with the treating provider’s clinical judgment and the encounter documentation. The clinical record supports the medical necessity of the service for the patient’s condition. Failure to provide or reimburse appropriate care exposes the patient to avoidable clinical risk and is inconsistent with standard-of-care expectations.{snip_line}"""

    if cat == "bundling":
        mod_line = f" Applicable modifiers on file: {mods}." if mods else ""
        return f"""BUNDLING / DISTINCT SERVICE (CARC {carc})
The services reported represent distinct procedures or separately identifiable services, not duplicate components of a single bundled allowance. Where payer edits applied inappropriate bundling, the documentation supports separate reimbursement under distinct procedural identifiers and, where appropriate, modifier use to signal separate encounters or anatomic sites (e.g., NCCI distinct service criteria).{mod_line}{snip_line}"""

    if cat == "authorization":
        return f"""AUTHORIZATION / PRECERTIFICATION (CARC {carc})
Where authorization was cited, the appeal addresses timely submission, medical necessity, and any exception pathway applicable to the patient’s clinical circumstances. Retroactive or corrective authorization consideration is warranted where delay would have compromised care or where payer systems or communication barriers affected compliance.{snip_line}"""

    if cat == "timely_filing":
        return f"""TIMELY FILING (CARC {carc})
The submission timeline is supported by good-cause or exception facts documented in the billing file (e.g., payer delay, missing remittance, administrative correction, or other factors outside the provider’s reasonable control). The appeal requests equitable consideration of the filing date relative to actual knowledge of the denial.{snip_line}"""

    if cat == "payment_reduction":
        gap = ""
        if amt_b and amt_p:
            gap = f" Billed {amt_b} versus paid {amt_p} reflects an underpayment relative to the benefit and coding as billed."
        return f"""PAYMENT REDUCTION / UNDERPAYMENT (CARC {carc})
The remittance does not correctly reflect the contracted benefit or correct allowable for the coded service.{gap} The appeal requests reprocessing to the correct payment consistent with plan terms and the submitted codes.{snip_line}"""

    if cat == "non-covered":
        return f"""NON-COVERED SERVICE (CARC {carc})
The service is a covered benefit for the reported diagnosis and clinical context, or the non-coverage determination is inconsistent with the plan’s medical policy as applied to this claim. The appeal requests coverage reconsideration based on the encounter documentation.{snip_line}"""

    if cat == "duplicate":
        return f"""DUPLICATE CLAIM (CARC {carc})
This claim line is not a duplicate of a prior paid service. It reflects a distinct date of service, procedure, place of service, or claim identifier as documented. The appeal requests removal of duplicate classification and reprocessing.{snip_line}"""

    if cat == "frequency_limit":
        return f"""FREQUENCY LIMIT (CARC {carc})
Continued care is clinically warranted based on the patient’s course, response, and documented need. The appeal requests reconsideration of frequency edits in light of individualized clinical facts rather than a generic limit.{snip_line}"""

    return f"""ADJUSTMENT CATEGORY (CARC {carc})
The payer’s determination for this category is not supported by the documentation and coding submitted. The appeal requests formal review and reversal consistent with the record.{snip_line}"""


def render_deterministic_submission_appeal(d: Dict[str, Any]) -> str:
    """Non-LLM submission-ready letter following mandatory structure."""
    provider = d.get("provider_display") or DEFAULT_PROVIDER_LINE
    payer = d.get("payer_name") or "Unknown payer"
    initials = d.get("patient_initials") or "Patient"
    claim = d.get("claim_number") or ""
    dos = d.get("date_of_service") or ""
    cpt = ", ".join(d.get("cpt_codes") or []) or "As documented"
    icd = ", ".join(d.get("icd10_codes") or []) or "As documented"
    mods = ", ".join(d.get("modifiers") or [])
    if not mods:
        mods = "None listed"
    carcs = d.get("carc_codes") or []
    rarcs = d.get("rarc_codes") or []
    carc_s = ", ".join(carcs) if carcs else "as stated on remittance"
    rarc_s = ", ".join(rarcs) if rarcs else "as stated on remittance"
    denial_codes_line = f"CARC: {carc_s} | RARC: {rarc_s}"

    interp = _denial_interpretation_phrase(carcs)
    summary = (
        f"This claim was denied under CARC {carc_s} and RARC {rarc_s}, indicating {interp}."
    )

    arg_parts = []
    for carc in _ordered_unique_carcs(carcs):
        cat = CARC_CATEGORY_KEY.get(carc, "other")
        arg_parts.append(_argument_block_for_category(carc, cat, d))
    if not arg_parts:
        arg_parts.append(
            "GENERAL APPEAL\n"
            "The denial is not consistent with the submitted documentation and coding. "
            "The appeal requests formal reconsideration and reprocessing based on the complete claim file."
            + (f" {d.get('denial_reason_text', '')[:500]}" if d.get("denial_reason_text") else "")
        )
    argument_body = "\n\n".join(arg_parts)

    strategy_bullets = [
        "Coding validation: CPT, ICD-10, and modifiers align to the encounter documentation as submitted.",
        "The payer’s adjustment rationale must be reconciled to the specific facts of this claim line, not generic edit outcomes.",
        "The determination as applied is not supported by the clinical and billing record submitted with the claim.",
    ]
    if "97" in carcs:
        strategy_bullets.insert(
            0,
            "Modifier and distinct-service logic: where separate identifiable services are documented, bundling overrides require explicit policy citation per line.",
        )
    if "50" in carcs or "96" in carcs:
        strategy_bullets.insert(
            0,
            "Medical necessity rebuttal: the payer’s medical necessity determination is not supported by the documentation of diagnosis, treatment plan, and outcomes.",
        )
    strategy_text = "\n".join(f"- {b}" for b in strategy_bullets[:5])

    return f"""HEADER

Provider: {provider}
Payer: {payer}
Patient: {initials}
Claim Number: {claim}
Date of Service: {dos}
CPT Codes: {cpt}
ICD-10 Codes: {icd}
Modifiers: {mods}
Denial Codes: {denial_codes_line}

DENIAL SUMMARY

{summary}

APPEAL ARGUMENT

{argument_body}

STRATEGY INSERT

{strategy_text}

DOCUMENTATION STATEMENT

Supporting documentation is available and can be provided upon request.

FINAL REQUEST

We respectfully request reconsideration and reprocessing of this claim for full reimbursement.

SIGNATURE

Sincerely,
Billing Department
"""


def generate_submission_appeal_openai(client, structured: Dict[str, Any]) -> str:
    if client is None:
        raise ValueError("OpenAI client required")

    try:
        safe = _truncate_string_values(_make_serializable(structured))
        structured_json = json.dumps(safe, indent=2, ensure_ascii=False)
    except Exception as serial_exc:
        raise ValueError(f"Could not serialize structured intake: {serial_exc}") from serial_exc

    model = os.getenv("OPENAI_APPEAL_MODEL", "gpt-4o")
    user_content = (
        "STRUCTURED CLAIM DATA (JSON — use only as facts; output must be plain text appeal, no JSON):\n"
        + structured_json
        + "\n\nGenerate the full appeal letter now, following the system instructions exactly."
    )

    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=0.2,
            max_tokens=4000,
            messages=[
                {"role": "system", "content": SUBMISSION_APPEAL_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
        return (resp.choices[0].message.content or "").strip()
    except openai.AuthenticationError:
        raise
    except openai.RateLimitError as e:
        raise RuntimeError(f"OpenAI rate limit hit: {e}") from e
    except openai.BadRequestError as e:
        raise ValueError(f"OpenAI rejected the request (prompt too large or invalid): {e}") from e
    except openai.OpenAIError as e:
        raise RuntimeError(f"OpenAI API error: {e}") from e


def generate_submission_appeal(
    structured: Dict[str, Any], client: Any = None
) -> Tuple[str, str]:
    """
    Primary path: OpenAI when client provided; always falls back to deterministic on failure.
    Returns (letter_text, source) where source is 'llm' or 'deterministic'.
    """
    if client is not None:
        try:
            return generate_submission_appeal_openai(client, structured), "llm"
        except Exception as e:
            logger.warning("Submission appeal LLM failed, using deterministic: %s", e)
    return render_deterministic_submission_appeal(structured), "deterministic"
