"""
Payer-specific appeal tone, structure, and prompt instructions (provider-grade workflow).
"""
from __future__ import annotations

from typing import Any, Dict, Optional

# Keys returned by detect_payer_profile
PROFILE_UHC = "unitedhealthcare"
PROFILE_BCBS = "blue_cross_blue_shield"
PROFILE_AETNA = "aetna"
PROFILE_MEDICARE = "medicare"
PROFILE_GENERAL = "general"


def detect_payer_profile(payer_name: Optional[str]) -> str:
    """Map free-text payer name to a formatting profile."""
    p = (payer_name or "").upper()
    if any(x in p for x in ("MEDICARE", "CMS", "PALMETTO", "NORIDIAN", "NOVITAS")):
        return PROFILE_MEDICARE
    if "AETNA" in p or "MERITAIN" in p:
        return PROFILE_AETNA
    if "UNITED" in p or "UHC" in p or "U MRKT" in p or "OPTUM" in p:
        return PROFILE_UHC
    if "BLUE CROSS" in p or "BLUE SHIELD" in p or " BCBS" in p or p.startswith("BCBS") or " ANTHEM" in p:
        return PROFILE_BCBS
    return PROFILE_GENERAL


def _instructions_unitedhealthcare() -> str:
    return """\
- Tone: Formal, policy-driven, and precise — align every argument with documented coverage criteria and clinical policy bulletins.
- Emphasize complete documentation trails, timely submission of records, and explicit tie-in to UnitedHealthcare / Optum clinical policies where applicable.
- Denial rebuttal: State clearly why the payer’s determination is inconsistent with cited policy language, medical necessity standards, or procedural review requirements; request supervisory review when material facts were not weighed.
- Avoid informal or conversational phrasing; use definitive professional billing and appeals terminology throughout."""


def _instructions_bcbs() -> str:
    return """\
- Tone: Balanced, professional, and collaborative — acknowledge plan requirements while firmly supporting medical necessity and correct coding.
- Structure: Use clear paragraphs separating clinical justification, coding validation (CPT/HCPCS/ICD-10/modifiers), and administrative/policy alignment.
- Emphasize both clinical appropriateness and accurate code assignment; cross-walk diagnosis to procedure where relevant.
- Denial rebuttal: Address each stated reason with evidence and cite plan/ASO requirements when applicable."""


def _instructions_aetna() -> str:
    return """\
- Tone: Highly structured; maintain explicit section headers matching the required appeal framework (clinical, coding, policy, rebuttal).
- Emphasize medical necessity with reference to evidence-based standards and Aetna / member-specific benefit criteria where applicable.
- Policy alignment: Tie arguments to published coverage policies, clinical policy bulletins, or precertification criteria as relevant.
- Use numbered or clearly labeled subsections within argument blocks for scannability by clinical reviewers."""


def _instructions_medicare() -> str:
    return """\
- Tone: Strict compliance and administrative precision — no conversational language, humor, or informal asides.
- Reference CMS manuals (e.g., IOM / Medicare Claims Processing), NCD/LCD framework, and Medicare benefit policy as applicable to the denial.
- Emphasize statutory and regulatory compliance (including timely filing and appeal rights under Medicare rules).
- Denial rebuttal: Frame as correction of coverage or coding determination with explicit reference to CMS guidance and supporting documentation."""


def _instructions_general() -> str:
    return """\
- Tone: Professional, neutral, and authoritative — suitable for any commercial payer.
- Balance clinical, coding, and policy arguments; provide clear denial rebuttal tied to facts and documentation.
- Use structured sections and avoid informal language."""


_PROFILE_INSTRUCTIONS = {
    PROFILE_UHC: _instructions_unitedhealthcare,
    PROFILE_BCBS: _instructions_bcbs,
    PROFILE_AETNA: _instructions_aetna,
    PROFILE_MEDICARE: _instructions_medicare,
    PROFILE_GENERAL: _instructions_general,
}


def apply_payer_formatting(appeal_data: Any, payer: Optional[str] = None) -> Dict[str, Any]:
    """
    Provider-grade payer formatting profile for prompts and downstream display.

    JavaScript mirror: frontend/src/utils/payerFormatting.js (applyPayerFormatting)

    Returns:
      profile: internal key
      payer_label: resolved payer string
      instruction_block: text block to inject into AI prompts
      style_summary: one-line summary for UI badges
    """
    payer_label = payer or getattr(appeal_data, "payer", None) or getattr(appeal_data, "payer_name", "") or "Unknown payer"
    profile = detect_payer_profile(str(payer_label))
    fn = _PROFILE_INSTRUCTIONS.get(profile, _instructions_general)
    instruction_block = fn()
    summaries = {
        PROFILE_UHC: "UHC-style: formal, policy-driven, strong rebuttal",
        PROFILE_BCBS: "BCBS-style: balanced clinical + coding",
        PROFILE_AETNA: "Aetna-style: structured sections, medical necessity focus",
        PROFILE_MEDICARE: "Medicare/CMS: strict compliance tone",
        PROFILE_GENERAL: "General commercial payer formatting",
    }
    return {
        "profile": profile,
        "payer_label": str(payer_label).strip(),
        "instruction_block": instruction_block.strip(),
        "style_summary": summaries.get(profile, summaries[PROFILE_GENERAL]),
    }


def get_payer_formatting_prompt_section(payer_name: str) -> str:
    """Large prompt section for advanced_ai_generator comprehensive prompt."""
    meta = apply_payer_formatting(type("_A", (), {"payer": payer_name})(), payer_name)
    return f"""
===============================================================
PAYER-SPECIFIC FORMATTING ({meta['style_summary']})
===============================================================
You MUST adapt tone, emphasis, and section weighting to match this payer profile ({meta['profile']}):

{meta['instruction_block']}
"""


def payer_formatting_fallback_note(payer_name: str) -> str:
    """Short addendum for non-AI structured_template_fallback."""
    meta = apply_payer_formatting(type("_A", (), {"payer": payer_name})(), payer_name)
    return f"PAYER STYLE NOTE ({meta['profile']}): {meta['style_summary']}"


def applyPayerFormatting(appealData: Any, payer: Optional[str] = None) -> Dict[str, Any]:
    """Alias matching product naming (Python camelCase entry point)."""
    return apply_payer_formatting(appealData, payer)
