"""
Submission-ready appeal document structure for medical billing professionals.
Used by advanced_ai_generator prompts and template fallback.
"""
import re
from typing import Dict, List, Optional, Tuple

from denial_rules import get_denial_rule
from payer_formatting import payer_formatting_fallback_note


def patient_initials(appeal) -> str:
    pid = (getattr(appeal, 'patient_id', None) or 'XX').strip()
    if len(pid) >= 2:
        return f"{pid[0].upper()}{pid[1].upper()}"
    return (pid + 'X').upper()[:2] if pid else 'XX'


def extract_carc_rarc_from_intake(appeal) -> Tuple[str, str]:
    """Parse CARC/RARC from structured denial_reason or denial_code."""
    text = (getattr(appeal, 'denial_reason', None) or '') + '\n'
    carc_m = re.search(r'CARC code\(s\):\s*([^\n]+)', text, re.I)
    rarc_m = re.search(r'RARC code\(s\):\s*([^\n]+)', text, re.I)
    carc = carc_m.group(1).strip() if carc_m else ''
    rarc = rarc_m.group(1).strip() if rarc_m else ''
    dc = (getattr(appeal, 'denial_code', None) or '').strip()
    if not carc and dc:
        carc = dc.replace('CO-', '').replace('co-', '').strip() or dc
    if carc == '(none)':
        carc = ''
    if rarc == '(none)':
        rarc = ''
    return carc or 'as stated on EOB', rarc or 'as stated on EOB'


def mapped_denial_reason_text(appeal) -> str:
    rule = get_denial_rule(getattr(appeal, 'denial_code', None) or '')
    if rule:
        return rule.get('description', 'a payer adjustment as described in the remittance advice.')[:280]
    return 'an adjustment category that requires formal appeal and documentation review.'


def argument_engine_instructions(denial_strategy: str) -> str:
    """Which structured argument blocks the model must include."""
    s = (denial_strategy or 'general').lower()
    blocks: List[str] = []
    if s in ('medical_necessity', 'non_covered', 'experimental', 'not_covered_patient', 'general'):
        blocks.append(
            'MEDICAL NECESSITY: Include a "Clinical justification" subsection with evidence-based rationale and record references.'
        )
    if s in ('coding_error', 'diagnosis_error', 'patient_info_error'):
        blocks.append(
            'CODING: Include "CPT/ICD validation" and "Modifier explanation" subsections tying codes to documentation.'
        )
    if s == 'benefit_maximum':
        blocks.append(
            'BUNDLING / CCI: Address NCCI edits if applicable; explain distinct services / separate reimbursement criteria.'
        )
    if s in ('prior_authorization', 'precertification'):
        blocks.append(
            'AUTHORIZATION: Include urgency, retroactive authorization, or good-faith submission where applicable.'
        )
    if s == 'timely_filing':
        blocks.append(
            'TIMELY FILING: Include timeline reconstruction and exception / good-cause reasoning with dates.'
        )
    if s == 'duplicate_claim':
        blocks.append('DUPLICATE: Differentiate this claim line from any prior paid service with dates and codes.')
    if s == 'coordination_benefits':
        blocks.append('COB: State primary/secondary responsibility and attach EOB logic as applicable.')
    if not blocks:
        blocks.append(
            'Include targeted argument subsections matching the denial (clinical, coding, administrative, or policy).'
        )
    return '\n'.join(f'- {b}' for b in blocks)


def strategy_layer_examples(denial_strategy: str, cpt_codes: Optional[str]) -> str:
    """Concrete strategy lines the model should mirror (not generic filler)."""
    s = (denial_strategy or '').lower()
    lines = []
    if s in ('coding_error',):
        lines.append(
            f'Modifier -25 (or applicable modifier) is appropriate to distinguish this separately identifiable evaluation '
            f'from the procedural component when documentation supports a significant, separately identifiable service.'
        )
    if s in ('benefit_maximum', 'coding_error'):
        lines.append(
            'This service meets criteria for separate reimbursement under applicable NCCI and payer policy when '
            'documentation establishes a distinct session, anatomical site, or encounter from the bundled component.'
        )
    if s in ('medical_necessity', 'non_covered', 'experimental'):
        lines.append(
            'The denial does not reflect the documented clinical necessity in the record relative to the payer’s '
            'stated medical policy and evidence-based criteria for this diagnosis and procedure mix.'
        )
    if s in ('prior_authorization', 'precertification'):
        lines.append(
            'Retroactive consideration is warranted where delay would have harmed the patient or where authorization '
            'was impracticable under the circumstances documented.'
        )
    if s == 'timely_filing':
        lines.append(
            'The filing timeline supports an exception or equitable tolling when payer delay, misinformation, or '
            'administrative error contributed to the submission date.'
        )
    if not lines:
        lines.append(
            'The appeal should tie each payer-stated reason to specific documentation, policy language, and regulatory review standards.'
        )
    return '\n'.join(f'- {x}' for x in lines[:5])


SUBMISSION_STRUCTURE_SYSTEM_APPENDIX = """
================================================================
MANDATORY OUTPUT STRUCTURE (STRICT ORDER — DO NOT DEVIATE)
================================================================
Produce the appeal as a single submission-ready document for medical billing.
Use EXACTLY these top-level sections in this order, with clear headings:

1. HEADER SECTION
2. DENIAL SUMMARY
3. APPEAL ARGUMENT SECTIONS
4. STRATEGY LAYER
5. DOCUMENTATION STATEMENT
6. REPROCESSING REQUEST
7. SIGNATURE

----------------------------------------------------------------
SECTION RULES
----------------------------------------------------------------
(1) HEADER SECTION — Include all lines that apply:
Provider: [provider name or "On file"]
Payer: [payer name]
Patient: [initials only — redacted]
Claim Number: [claim number]
Date of Service: [DOS]
CPT Codes: [CPT/HCPCS as billed]
ICD-10 Codes: [diagnosis codes as billed]
Denial Codes: [CARC and RARC as applicable]

(2) DENIAL SUMMARY — Use this pattern (fill bracketed parts with case facts):
"This claim was denied under CARC [codes] and RARC [codes], indicating [mapped denial reason from case]."

(3) APPEAL ARGUMENT SECTIONS — Build ONLY the subsections that match this denial type (see ARGUMENT ENGINE below).
   Use professional, direct sentences. No narrative fluff. No conversational tone.

(4) STRATEGY LAYER — CRITICAL: Include 2–4 bullet points with SPECIFIC strategy language, for example:
   - Modifier / distinct service logic where modifiers or separate E/M are at issue
   - NCCI / separate reimbursement criteria where bundling is at issue
   - Clinical necessity vs. payer policy where medical necessity is at issue
   Do not use vague phrases like "we believe" or "we hope"; state positions as professional assertions tied to facts.

(5) DOCUMENTATION STATEMENT — Include VERBATIM:
"Supporting documentation is available and can be provided upon request for all statements made in this appeal."

(6) REPROCESSING REQUEST — End the substantive letter with VERBATIM:
"We respectfully request reconsideration and reprocessing of this claim for full reimbursement."

(7) SIGNATURE — One line:
[Provider / Authorized Representative Name and Title]

----------------------------------------------------------------
STYLE
----------------------------------------------------------------
- No greeting ("Dear…"). No chatty transitions.
- No generic AI phrasing ("I am writing to", "Thank you for your consideration", "In conclusion").
- Concise, professional, suitable for attachment to a formal appeal packet.
================================================================
"""


def build_argument_engine_block(denial_strategy: str) -> str:
    return f"""
ARGUMENT ENGINE (include matching subsections under "APPEAL ARGUMENT SECTIONS"):
{argument_engine_instructions(denial_strategy)}

STRATEGY LAYER must incorporate concrete lines such as (adapt to facts):
{strategy_layer_examples(denial_strategy, None)}
"""


def structured_template_fallback(appeal) -> str:
    """Non-AI fallback: same 7-part structure with conservative professional text."""
    payer = getattr(appeal, 'payer', None) or getattr(appeal, 'payer_name', 'the payer')
    provider = getattr(appeal, 'provider_name', 'Provider')
    claim = getattr(appeal, 'claim_number', '')
    dos = appeal.date_of_service.strftime('%m/%d/%Y') if getattr(appeal, 'date_of_service', None) else ''
    cpt = getattr(appeal, 'cpt_codes', None) or 'As billed'
    icd = getattr(appeal, 'diagnosis_code', None) or 'As billed'
    carc, rarc = extract_carc_rarc_from_intake(appeal)
    mapped = mapped_denial_reason_text(appeal)
    rule = get_denial_rule(getattr(appeal, 'denial_code', None) or '')
    strat = (rule or {}).get('strategy', 'general')
    initials = patient_initials(appeal)
    amt = getattr(appeal, 'billed_amount', 0) or 0

    arg_block = (rule or {}).get('description', 'The denial should be reversed based on the documentation and benefit terms.')
    strategy_lines = strategy_layer_examples(strat, cpt)

    style_note = payer_formatting_fallback_note(payer)

    return f"""HEADER SECTION

{style_note}

Provider: {provider}
Payer: {payer}
Patient: {initials}
Claim Number: {claim}
Date of Service: {dos}
CPT Codes: {cpt}
ICD-10 Codes: {icd}
Denial Codes: CARC {carc} | RARC {rarc}

DENIAL SUMMARY

This claim was denied under CARC {carc} and RARC {rarc}, indicating {mapped}

APPEAL ARGUMENT SECTIONS

{arg_block}

STRATEGY LAYER

{strategy_lines}

DOCUMENTATION STATEMENT

Supporting documentation is available and can be provided upon request for all statements made in this appeal.

REPROCESSING REQUEST

We respectfully request reconsideration and reprocessing of this claim for full reimbursement.

SIGNATURE

{provider} — Authorized Billing Representative

Reference: Billed amount ${float(amt):,.2f}; appeal submitted for formal reconsideration per plan and regulatory procedures.
"""
