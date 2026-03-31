"""
Advanced AI-powered appeal generation with multi-step reasoning and expert knowledge integration
This system generates appeals that are significantly superior to generic ChatGPT responses
"""
import os
import re
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables FIRST before any other imports
load_dotenv()

from openai import OpenAI
from denial_templates import get_denial_template
from appeal_output_structure import (
    SUBMISSION_STRUCTURE_SYSTEM_APPENDIX,
    build_argument_engine_block,
)
from medical_knowledge_base import (
    get_denial_strategy, 
    get_regulatory_reference,
    REGULATORY_REFERENCES,
    MEDICAL_NECESSITY_CRITERIA,
    CLINICAL_GUIDELINES,
    PAYER_TACTICS,
    CASE_LAW_PRECEDENTS,
    REGULATORY_VIOLATION_CHECKLIST,
    CPT_DOCUMENTATION_REQUIREMENTS
)

# Configure structured logging before optional imports (they may log)
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ai_generation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import new optimization modules
try:
    from citation_validator import citation_validator
    from prompt_optimizer import prompt_optimizer
    from ab_testing import ab_testing
    OPTIMIZATION_ENABLED = True
    logger.info("Advanced optimization modules loaded: citation validation, prompt optimization, A/B testing")
except ImportError as e:
    OPTIMIZATION_ENABLED = False
    logger.warning(f"Optimization modules not available - using default logic: {e}")

class AdvancedAIAppealGenerator:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.enabled = bool(self.api_key and self.api_key.strip() and not self.api_key.startswith('sk-proj-your'))
        
        if self.enabled:
            try:
                self.client = OpenAI(api_key=self.api_key)
                logger.info("Advanced AI appeal generation enabled (OpenAI GPT-4)")
                logger.info("Appeals will use expert-level AI reasoning and medical knowledge")
            except Exception as e:
                logger.warning(f"OpenAI initialization warning: {e}")
                logger.warning("Falling back to template-based appeals")
                self.enabled = False
        else:
            logger.info("AI appeal generation not configured (using expert templates)")
            logger.info("To enable AI-powered appeals, add OPENAI_API_KEY to .env")
            logger.info("Get your API key from: https://platform.openai.com/api-keys")
    
    def generate_appeal_content(self, appeal):
        """
        Generate a submission-ready appeal: mandatory payer letter structure,
        CARC/RARC interpretation, multi-denial handling. OpenAI when configured;
        deterministic engine on failure or when API disabled.
        """
        from appeal_submission_engine import (
            build_structured_intake_from_appeal,
            generate_submission_appeal,
            render_deterministic_submission_appeal,
        )

        structured = build_structured_intake_from_appeal(appeal)
        client = self.client if self.enabled else None
        model_tag = os.getenv("OPENAI_APPEAL_MODEL", "gpt-4o")

        try:
            text, source = generate_submission_appeal(structured, client)
            if hasattr(appeal, "ai_model_used"):
                appeal.ai_model_used = model_tag if source == "llm" else "deterministic_submission"
            if hasattr(appeal, "ai_generation_method"):
                appeal.ai_generation_method = (
                    "submission_engine_llm"
                    if source == "llm"
                    else "submission_engine_deterministic"
                )
            if hasattr(appeal, "ai_word_count"):
                appeal.ai_word_count = len(text.split())
            return text
        except Exception as e:
            logger.error(
                f"Submission appeal generation failed for {appeal.appeal_id}: {e}",
                extra={"appeal_id": appeal.appeal_id, "error": str(e)},
                exc_info=True,
            )
            return render_deterministic_submission_appeal(structured)
    
    def _analyze_denial_strategy(self, appeal):
        """Analyze the denial and identify optimal strategic arguments"""
        return get_denial_strategy(appeal.denial_code)
    
    def _generate_with_reasoning(self, appeal, strategy, relevant_citations=None):
        """
        Use chain-of-thought reasoning for complex/high-value appeals
        This produces superior results by having the AI think through the case step-by-step
        
        Args:
            relevant_citations: Pre-validated citations the AI can use (prevents hallucinations)
        """
        from denial_rules import get_denial_rule
        from timely_filing import calculate_timely_filing
        
        denial_rule = get_denial_rule(appeal.denial_code)
        payer_name = getattr(appeal, 'payer', getattr(appeal, 'payer_name', 'Unknown Payer'))
        
        # Get payer-specific intelligence
        payer_tactics = None
        payer_upper = payer_name.upper()
        for known_payer in PAYER_TACTICS.keys():
            if known_payer in payer_upper or payer_upper in known_payer:
                payer_tactics = PAYER_TACTICS[known_payer]
                break
        
        # Calculate timely filing
        timely_filing_result = None
        if hasattr(appeal, 'created_at') and appeal.date_of_service:
            try:
                timely_filing_result = calculate_timely_filing(
                    denial_date=appeal.created_at,
                    service_date=appeal.date_of_service,
                    payer=payer_name,
                    appeal_level=getattr(appeal, 'appeal_level', 'level_1')
                )
            except Exception:
                pass
        
        # Step 1: Strategic Analysis (Chain-of-Thought)
        analysis_prompt = f"""You are analyzing a complex insurance denial to develop a winning appeal strategy.

DENIAL DETAILS:
- Code: {appeal.denial_code}
- Reason: {appeal.denial_reason}
- Amount: ${appeal.billed_amount:,.2f}
- Payer: {payer_name}
- CPT Codes: {appeal.cpt_codes or 'See documentation'}
- Appeal Level: {getattr(appeal, 'appeal_level', 'level_1')}

PAYER INTELLIGENCE:
{f"Known Tactics: {', '.join(payer_tactics['known_tactics'][:2])}" if payer_tactics else "No specific payer intelligence available"}

TASK: Analyze this denial and identify:
1. The strongest 3 arguments (regulatory, clinical, procedural)
2. Likely payer objections and how to counter them
3. Any procedural violations in the denial itself
4. Escalation leverage points

Provide your strategic analysis in 150 words."""

        analysis_response = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "You are a senior healthcare appeals strategist analyzing a denial to develop winning arguments."},
                {"role": "user", "content": analysis_prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        strategic_analysis = analysis_response.choices[0].message.content
        
        # Step 2: Generate appeal with strategic analysis context
        return self._generate_primary_appeal(appeal, strategy, relevant_citations, strategic_analysis)
    
    def _generate_primary_appeal(self, appeal, strategy, relevant_citations=None, strategic_analysis=None):
        """
        Generate the primary appeal content using advanced prompting
        
        Args:
            relevant_citations: Pre-validated citations the AI can use (prevents hallucinations)
        """
        
        # Import denial rules and timely filing calculator
        from denial_rules import get_denial_rule, get_required_sections, get_strategy
        from timely_filing import calculate_timely_filing
        from datetime import datetime
        
        # Get denial-specific information from new rules engine
        denial_rule = get_denial_rule(appeal.denial_code)
        if denial_rule:
            denial_name = denial_rule['description']
            required_sections = denial_rule['required_sections']
            required_docs = denial_rule['required_docs']
            denial_strategy = denial_rule['strategy']
        else:
            # Fallback to old template system
            denial_template = get_denial_template(appeal.denial_code)
            denial_name = denial_template['name']
            required_sections = []
            required_docs = []
            denial_strategy = "general"
        
        # Calculate timely filing status
        timely_filing_result = None
        if hasattr(appeal, 'created_at') and appeal.date_of_service:
            try:
                timely_filing_result = calculate_timely_filing(
                    denial_date=appeal.created_at,
                    service_date=appeal.date_of_service,
                    payer=getattr(appeal, 'payer', getattr(appeal, 'payer_name', 'Unknown')),
                    appeal_level=getattr(appeal, 'appeal_level', 'level_1')
                )
            except Exception as e:
                print(f"[WARNING] Could not calculate timely filing: {e}")
        
        # Build expert system prompt with specialized knowledge
        appeal_level = getattr(appeal, 'appeal_level', 'level_1')
        system_prompt = self._build_expert_system_prompt(
            appeal.denial_code, 
            strategy, 
            denial_rule,
            timely_filing_result,
            appeal_level
        )
        
        # Build comprehensive user prompt with case details
        user_prompt = self._build_comprehensive_prompt(
            appeal,
            denial_name,
            strategy,
            required_sections,
            required_docs,
            timely_filing_result,
            strategic_analysis,
            denial_strategy,
        )
        
        # Add citation guidance to prevent hallucinations
        if relevant_citations and OPTIMIZATION_ENABLED:
            citation_guidance = citation_validator.format_citation_guidance(relevant_citations)
            user_prompt += citation_guidance
            logger.info(f"Added {len(relevant_citations['regulatory']) + len(relevant_citations['clinical'])} pre-validated citations to prompt")
        
        # Prepare base API parameters
        api_params = {
            'model': "gpt-4-turbo-preview",
            'messages': [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            'temperature': 0.4,      # Lower = more focused, deterministic, professional
            'max_tokens': 4000,      # Structured 7-section submission-ready appeals
            'top_p': 0.85,           # Slightly lower for more precise language
            'frequency_penalty': 0.4, # Higher to reduce repetition of arguments
            'presence_penalty': 0.3   # Encourage diverse strategic angles
        }
        
        # Apply A/B test parameter adjustments if optimization enabled
        if OPTIMIZATION_ENABLED and hasattr(appeal, 'appeal_id'):
            api_params = ab_testing.apply_test_parameters(appeal.appeal_id, api_params)
        
        # Call OpenAI with optimized parameters
        response = self.client.chat.completions.create(**api_params)
        
        return response.choices[0].message.content
    
    def _build_expert_system_prompt(self, denial_code, strategy, denial_rule=None, timely_filing_result=None, appeal_level='level_1'):
        """Build a highly specialized system prompt with expert knowledge"""
        
        # Get relevant regulatory references based on denial type
        erisa_refs = REGULATORY_REFERENCES.get('ERISA', {})
        aca_refs = REGULATORY_REFERENCES.get('ACA', {})
        
        # Add timely filing context if available
        timely_filing_context = ""
        if timely_filing_result:
            if not timely_filing_result['within_window']:
                timely_filing_context = f"\n\nCRITICAL: This appeal is OUTSIDE the standard filing window. You MUST address timely filing and provide good cause arguments."
            elif timely_filing_result['urgency'] == 'critical':
                timely_filing_context = f"\n\nURGENT: Only {timely_filing_result['days_remaining']} days remaining. Emphasize urgency and request expedited review."
        
        # Add denial rule context if available
        denial_rule_context = ""
        if denial_rule:
            denial_rule_context = f"\n\nREQUIRED SECTIONS: Your appeal MUST include these sections:\n" + "\n".join(f"- {section}" for section in denial_rule['required_sections'])
        
        # Adjust tone and aggression based on appeal level
        appeal_level_context = ""
        if appeal_level == 'level_2':
            appeal_level_context = "\n\nAPPEAL LEVEL 2 - ESCALATED: This is a second-level appeal. The initial denial was upheld. Increase assertiveness. Reference the inadequacy of the first-level review. Cite specific procedural failures. Emphasize legal and regulatory violations. Mention external review rights and potential DOI complaints."
        elif appeal_level == 'level_3':
            appeal_level_context = "\n\nAPPEAL LEVEL 3 - FINAL INTERNAL: This is the final internal appeal before external review or litigation. Use maximum assertiveness. Cite all procedural violations. Reference bad faith and unfair claims practices. Explicitly state intent to pursue external review, state DOI complaint, and legal remedies if denied. This is the last chance for the payer to correct their error before escalation."
        
        return f"""You are a senior healthcare reimbursement attorney and certified medical billing specialist with 25+ years of experience overturning insurance denials. You have:

- JD with healthcare law specialization
- CMRS (Certified Medical Reimbursement Specialist) certification
- Former insurance company medical director experience (you know their internal review processes)
- 92% overturn rate on medical necessity denials
- Published author on ERISA appeals and insurance bad faith litigation{timely_filing_context}{denial_rule_context}{appeal_level_context}

CORE COMPETENCIES:
- ERISA Section 503 claims procedures and full-and-fair review requirements
- 29 CFR 2560.503-1 regulatory compliance for group health plans
- ACA Section 2719 internal/external review mandates
- State insurance code provisions (prompt pay, timely filing, bad faith)
- Medicare Secondary Payer Act and coordination of benefits
- Anti-Assignment provisions and provider standing
- Clinical guideline interpretation (MCG, Milliman, InterQual, Hayes)
- CPT/ICD-10 coding accuracy and medical necessity documentation
- Peer-to-peer review strategy and medical director engagement

PAYER-SPECIFIC INTELLIGENCE:
- UnitedHealthcare: Aggressive on medical necessity, vulnerable on timely filing technicalities
- Anthem/BCBS: Strict on prior auth, responds to clinical guideline citations
- Aetna: Uses Milliman criteria heavily, challenge with patient-specific factors
- Cigna: Strong on coordination of benefits, weak on emergency service denials
- Medicare Advantage: Must cite CMS guidance and Medicare coverage policies

DENIAL CODE MASTERY - {denial_code}:
- Strategic Vulnerabilities: {strategy.get('common_weaknesses', 'Standard administrative review')}
- Winning Arguments: {', '.join(strategy.get('primary_arguments', ['Policy compliance', 'Clinical necessity', 'Regulatory requirement'])[:3])}
- Escalation Path: {strategy.get('escalation', 'Request supervisory review')}

ADVANCED ARGUMENTATION FRAMEWORK:
1. LEGAL FOUNDATION: Cite specific regulatory violations or contractual breaches
2. CLINICAL IMPERATIVE: Reference evidence-based guidelines by name (not generic "standards")
3. ADMINISTRATIVE ERROR: Identify procedural failures in payer's review process
4. FINANCIAL IMPACT: Quantify harm and reference prompt pay/bad faith implications
5. PRECEDENT: Reference similar cases, coverage policies, or LCD/NCD determinations
6. PREEMPTIVE DEFENSE: Address anticipated payer objections before they raise them
7. ESCALATION THREAT: Subtly reference external review, DOI complaint, or legal remedies

LANGUAGE PRECISION:
- Use "medical necessity" not "needed" - it's a legal standard
- Cite "42 CFR 411.15" not "Medicare rules" - specificity signals expertise
- Reference "ERISA Section 503(2)" not "appeal rights" - shows legal grounding
- Name guidelines: "ACC/AHA 2021 Chest Pain Guidelines" not "cardiology standards"
- Use "coverage determination" not "decision" - insurance industry terminology
- Reference "EOC Section X.Y" when applicable - shows you read the policy

TACTICAL SUPERIORITY OVER GENERIC AI:
- Generic AI: "The service was medically necessary based on the patient's condition"
- YOUR RESPONSE: "Per 42 CFR 411.15(k)(1), this service meets the reasonable and necessary standard as it is safe, effective, and consistent with ACC/AHA Class I recommendations for patients with documented coronary artery disease and Canadian Cardiovascular Society Class III angina. The denial fails to address patient-specific contraindications to conservative management documented in the clinical record."

- Generic AI: "We request reconsideration of this denial"
- YOUR RESPONSE: "Pursuant to ERISA Section 503 and 29 CFR 2560.503-1(h)(2)(iii), we request full and fair review with access to all claim files and medical necessity criteria applied. The initial determination fails to comply with regulatory requirements for specific rationale and clinical basis for adverse determination."

WHAT YOU NEVER DO:
- Never use emotional appeals or patient hardship stories (payers ignore these)
- Never admit uncertainty or use hedging language ("may," "might," "could")
- Never make general statements without regulatory or clinical citations where applicable
- Never accept payer's framing - reframe denials as administrative/procedural errors when supported by facts

{SUBMISSION_STRUCTURE_SYSTEM_APPENDIX}

Your appeals win because they demonstrate command of payer policy, coding, and regulatory review standards."""
    
    def _build_comprehensive_prompt(self, appeal, denial_name, strategy, required_sections=None, required_docs=None, timely_filing_result=None, strategic_analysis=None, denial_strategy=None):
        """Build detailed prompt with all case information and strategic guidance"""
        
        # Get payer name (handle both 'payer' and 'payer_name' attributes)
        payer_name = getattr(appeal, 'payer', getattr(appeal, 'payer_name', 'Unknown Payer'))
        denial_strategy = denial_strategy or 'general'
        
        # Get appeal level
        appeal_level = getattr(appeal, 'appeal_level', 'level_1').replace('_', ' ').title()
        
        # Get payer-specific tactical intelligence
        payer_tactics = None
        payer_upper = payer_name.upper()
        for known_payer in PAYER_TACTICS.keys():
            if known_payer in payer_upper or payer_upper in known_payer:
                payer_tactics = PAYER_TACTICS[known_payer]
                break
        
        # Build timely filing section
        timely_filing_section = ""
        if timely_filing_result:
            timely_filing_section = f"""
===============================================================
TIMELY FILING ANALYSIS
===============================================================
Status: {timely_filing_result['status']}
Days Remaining: {timely_filing_result['days_remaining']}
Urgency Level: {timely_filing_result['urgency'].upper()}
Recommended Strategy: {timely_filing_result['recommended_strategy']}

Strategic Recommendation:
{timely_filing_result['recommendation']}
"""
        
        # Build required sections guidance
        required_sections_text = ""
        if required_sections:
            required_sections_text = f"""
===============================================================
REQUIRED SECTIONS (MUST INCLUDE ALL)
===============================================================
{chr(10).join(f'{i+1}. {section}' for i, section in enumerate(required_sections))}
"""
        
        # Build required documentation guidance
        required_docs_text = ""
        if required_docs:
            required_docs_text = f"""
Required Documentation References:
{chr(10).join(f'  - {doc}' for doc in required_docs)}
"""
        
        # Build payer-specific tactical section
        payer_tactics_text = ""
        if payer_tactics:
            payer_tactics_text = f"""
===============================================================
PAYER-SPECIFIC TACTICAL INTELLIGENCE: {payer_name.upper()}
===============================================================
Known Tactics:
{chr(10).join(f'  - {tactic}' for tactic in payer_tactics['known_tactics'])}

Winning Strategies Against This Payer:
{chr(10).join(f'  - {strat}' for strat in payer_tactics['winning_strategies'])}

Escalation Leverage:
  - {payer_tactics['escalation_leverage']}
"""

        from payer_formatting import get_payer_formatting_prompt_section

        payer_formatting_text = get_payer_formatting_prompt_section(payer_name)
        
        # Build strategic analysis section
        strategic_analysis_text = ""
        if strategic_analysis:
            strategic_analysis_text = f"""
===============================================================
STRATEGIC ANALYSIS (Your preliminary case assessment)
===============================================================
{strategic_analysis}
"""
        
        prompt = f"""Generate a superior insurance appeal argument for this denied claim:

===============================================================
DENIAL INFORMATION
===============================================================
Denial Code: {appeal.denial_code}
Denial Type: {denial_name}
Denial Reason: {appeal.denial_reason}

===============================================================
CLAIM DETAILS
===============================================================
Insurance Payer: {payer_name}
Claim Number: {appeal.claim_number}
Patient ID: {appeal.patient_id}

Provider Information:
- Name: {appeal.provider_name}
- NPI: {appeal.provider_npi}

Service Information:
- Date of Service: {appeal.date_of_service.strftime('%B %d, %Y')}
- CPT Code(s): {appeal.cpt_codes or 'See documentation'}
- ICD-10 / Diagnosis: {getattr(appeal, 'diagnosis_code', None) or 'See documentation'}
- Billed Amount: ${appeal.billed_amount:,.2f}
- Appeal Level: {appeal_level}

{self._get_cpt_intelligence(appeal.cpt_codes) if appeal.cpt_codes else ""}
{timely_filing_section}
{payer_tactics_text}
{payer_formatting_text}
{required_sections_text}
===============================================================
STRATEGIC GUIDANCE (Use this to craft superior arguments)
===============================================================
Primary Arguments to Emphasize:
{chr(10).join(f'  • {arg}' for arg in strategy.get('primary_arguments', []))}

Common Payer Weakness:
{strategy.get('common_weaknesses', 'Review medical necessity and documentation')}

Escalation Path:
{strategy.get('escalation', 'Request detailed review')}

Regulatory Citations to Consider:
{chr(10).join(f'  - {citation}' for citation in strategy.get('regulatory_citations', []))}
{required_docs_text}
{strategic_analysis_text}

===============================================================
REGULATORY VIOLATION ANALYSIS
===============================================================
Review the denial letter for these procedural violations:

ERISA Violations (if group health plan):
  • Does denial lack specific clinical rationale?
  • Does denial fail to cite specific plan provisions?
  • Was full and fair review provided with access to claim files?
  • Did payer respond within required timeframes?

State Law Violations:
  • Does timely filing limit violate state minimum?
  • Has payer violated prompt pay law (typically 30-45 days)?
  • Are there unfair claims practices (misrepresentation, inadequate investigation)?

If violations exist, LEAD with procedural/regulatory arguments before clinical arguments.

===============================================================
REQUIREMENTS FOR SUPERIOR APPEAL
===============================================================
Your appeal must be SIGNIFICANTLY BETTER than what a user could get from generic ChatGPT:

1. REGULATORY SPECIFICITY
   - Cite specific ERISA sections, ACA provisions, or state laws
   - Reference actual regulatory language, not generic statements
   - Demonstrate knowledge of insurance law and appeals rights

2. CLINICAL PRECISION
   - Reference specific clinical practice guidelines (ACC/AHA, ACR, NCCN, etc.)
   - Use evidence-based medicine terminology
   - Cite medical necessity criteria and coverage determination frameworks

3. STRATEGIC ARGUMENTATION
   - Build multi-layered argument with distinct points
   - Anticipate payer objections and address preemptively
   - Frame as administrative/policy error, not clinical disagreement
   - Use knowledge of common payer tactics

4. PROFESSIONAL LANGUAGE
   - Use medical billing and healthcare law terminology
   - Reference CPT guidelines, coding principles, contract provisions
   - Write at the level of an attorney or senior claims analyst

5. ACTIONABLE CLOSE
   - Request specific action (payment, reconsideration, peer review)
   - State timeline expectations per regulations
   - Reference appeal rights and next steps if denied again

===============================================================
CITATION FORMATTING STANDARDS
===============================================================
Use these exact citation formats for maximum credibility:

REGULATORY:
- "Pursuant to 29 CFR 2560.503-1(g)(1)(iii)..."
- "Under ERISA Section 503(2)..."
- "Per 42 CFR 411.15(k)(1)..."
- "In accordance with ACA Section 2719(b)..."

CLINICAL GUIDELINES:
- "The 2021 ACC/AHA Chest Pain Guidelines (Class I recommendation)..."
- "Per ACR Appropriateness Criteria (rating: 8 - Usually Appropriate)..."
- "NCCN Guidelines v2.2024 (Category 1 evidence)..."
- "ASAM Criteria 4th Edition, Level 3.5 criteria..."

CASE LAW:
- "As established in Rush Prudential HMO v. Moran..."
- "Consistent with the holding in Wit v. United Behavioral Health..."

POLICY REFERENCES:
- "Per Evidence of Coverage (EOC) Section 4.2, page 23..."
- "The Summary Plan Description (SPD) explicitly states..."
- "Provider Agreement Section 7.3 requires..."

===============================================================
INDUSTRY TERMINOLOGY REQUIREMENTS
===============================================================
Use precise industry language:
- "coverage determination" not "decision"
- "medical necessity standard" not "needed"
- "adverse benefit determination" not "denial"
- "claims adjudication" not "processing"
- "utilization review criteria" not "guidelines"
- "evidence-based medicine" not "best practices"
- "clinical documentation" not "medical records"
- "provider network agreement" not "contract"
- "coordination of benefits" not "other insurance"
- "timely filing provision" not "deadline"

===============================================================
OUTPUT INSTRUCTIONS (SUBMISSION-READY DOCUMENT)
===============================================================
Follow the system prompt MANDATORY OUTPUT STRUCTURE exactly (7 sections, fixed order).
Use the case data above for the HEADER SECTION (redact patient to initials only in header).
Denial Summary must follow: "This claim was denied under CARC [codes] and RARC [codes], indicating [reason]."
Populate Appeal Argument Sections using the argument engine guidance below; omit subsections that do not apply.
Strategy Layer bullets must be specific (modifiers, NCCI, clinical necessity, timelines)—not generic platitudes.
Include the Documentation Statement and Reprocessing Request sentences verbatim as specified in the system prompt.
Close with the SIGNATURE line placeholder as instructed.
- No conversational filler, no "Dear", no "Thank you for your consideration."
- Professional, direct, concise—ready to paste into a payer portal or PDF.

{build_argument_engine_block(denial_strategy)}

QUALITY BENCHMARK:
The document must be usable as-is by a medical billing specialist for formal submission."""

        return prompt
    
    def _format_template(self, template_text, appeal):
        """Fallback template formatting"""
        replacements = {
            '{date_of_service}': appeal.date_of_service.strftime('%m/%d/%Y'),
            '{provider_name}': appeal.provider_name,
            '{provider_npi}': appeal.provider_npi,
            '{claim_number}': appeal.claim_number,
            '{patient_id}': appeal.patient_id,
            '{payer_name}': appeal.payer_name,
            '{cpt_codes}': appeal.cpt_codes or 'as documented',
            '{denial_code}': appeal.denial_code or 'as stated',
            '{auth_context}': 'Authorization was not obtained prior to service due to the urgent nature of care.',
            '{cob_details}': 'This plan is listed as primary coverage on file.',
            '{filing_context}': 'The claim was submitted as soon as administratively possible.',
            '{delay_reason}': 'administrative processing delays and coordination with the patient.',
            '{coverage_category}': 'medically necessary services',
            '{correct_benefit_category}': 'the appropriate benefit category',
            '{precert_context}': 'The service was provided under urgent circumstances.',
            '{missing_info_list}': 'all requested documentation and information',
            '{documentation_list}': 'medical records, clinical notes, and supporting documentation',
            '{corrected_info}': 'as listed above in the claim reference section',
            '{tax_id}': 'on file with the payer',
            '{corrected_date}': appeal.date_of_service.strftime('%m/%d/%Y'),
            '{corrected_code}': appeal.cpt_codes or 'as documented',
            '{corrected_diagnosis_codes}': 'as documented in the medical record',
            '{modifiers}': 'as billed',
            '{modifier_rationale}': 'The modifiers indicate the appropriate circumstances of service.',
            '{correct_pos}': '11',
            '{pos_description}': 'Office',
            '{service_location}': appeal.provider_name,
            '{units}': '1',
            '{unit_calculation_explanation}': 'per CPT guidelines'
        }
        
        for placeholder, value in replacements.items():
            template_text = template_text.replace(placeholder, value)
        
        return template_text
    
    def _get_cpt_intelligence(self, cpt_codes: str) -> str:
        """Extract CPT-specific appeal guidance based on codes"""
        if not cpt_codes:
            return ""
        
        cpt_guidance = []
        
        # Check for E&M codes
        if any(code in cpt_codes for code in ['99213', '99214', '99215', '99203', '99204', '99205']):
            em_guidance = CPT_DOCUMENTATION_REQUIREMENTS.get('E&M_codes', {}).get('appeal_arguments', [])
            if em_guidance:
                cpt_guidance.append("E&M CODING GUIDANCE:\n" + "\n".join(f"  • {arg}" for arg in em_guidance[:3]))
        
        # Check for imaging codes (70000-79999 range)
        if any(code.startswith(('70', '71', '72', '73', '74', '75', '76', '77', '78', '79')) for code in cpt_codes.split(',')):
            imaging_guidance = CPT_DOCUMENTATION_REQUIREMENTS.get('diagnostic_imaging', {}).get('appeal_arguments', [])
            if imaging_guidance:
                cpt_guidance.append("IMAGING APPEAL GUIDANCE:\n" + "\n".join(f"  • {arg}" for arg in imaging_guidance[:3]))
        
        # Check for surgical codes (10000-69999 range)
        if any(code[0].isdigit() and 10000 <= int(code[:5].split('-')[0]) < 70000 for code in cpt_codes.split(',') if code.strip()):
            surgical_guidance = CPT_DOCUMENTATION_REQUIREMENTS.get('surgical', {}).get('appeal_arguments', [])
            if surgical_guidance:
                cpt_guidance.append("SURGICAL APPEAL GUIDANCE:\n" + "\n".join(f"  • {arg}" for arg in surgical_guidance[:3]))
        
        # Check for PT codes (97000-97799)
        if any(code.startswith('97') for code in cpt_codes.split(',')):
            pt_guidance = CPT_DOCUMENTATION_REQUIREMENTS.get('physical_therapy', {}).get('appeal_arguments', [])
            if pt_guidance:
                cpt_guidance.append("PHYSICAL THERAPY APPEAL GUIDANCE:\n" + "\n".join(f"  • {arg}" for arg in pt_guidance[:3]))
        
        # Check for behavioral health codes (90000-90899)
        if any(code.startswith('90') for code in cpt_codes.split(',')):
            bh_guidance = CPT_DOCUMENTATION_REQUIREMENTS.get('behavioral_health', {}).get('appeal_arguments', [])
            if bh_guidance:
                cpt_guidance.append("BEHAVIORAL HEALTH APPEAL GUIDANCE:\n" + "\n".join(f"  • {arg}" for arg in bh_guidance[:3]))
        
        if cpt_guidance:
            return f"""
===============================================================
CPT-SPECIFIC APPEAL INTELLIGENCE
===============================================================
{chr(10).join(cpt_guidance)}
"""
        return ""
    
    def _validate_appeal_quality(self, appeal_content: str) -> dict:
        """
        Validate that the generated appeal meets professional quality standards
        Returns dict with quality score and specific issues
        """
        issues = []
        score = 100
        
        # Check for generic AI language (red flags)
        generic_phrases = [
            'I am writing to',
            'Thank you for',
            'I hope this',
            'Please consider',
            'We believe that',
            'It is important to note',
            'As you can see',
            'In conclusion',
            'I feel that',
            'I think that',
            'It seems that',
            'Perhaps',
            'Maybe',
            'Possibly',
            'Hopefully',
            'We hope that',
            'We wish to',
            'We would like to',
            'May be',
            'Might be',
            'Could be',
            'Should be considered',
            'We ask that you',
            'We kindly request',
            'If possible',
            'At your convenience',
            'When you have time',
            'We appreciate your consideration',
            'Dear Sir or Madam',
            'To Whom It May Concern'
        ]
        for phrase in generic_phrases:
            if phrase.lower() in appeal_content.lower():
                issues.append(f"Contains generic phrase: '{phrase}'")
                score -= 10
        
        # Check for regulatory citations (should have at least 2)
        regulatory_patterns = ['CFR', 'ERISA', 'ACA Section', 'USC', 'Section 503']
        citation_count = sum(1 for pattern in regulatory_patterns if pattern in appeal_content)
        if citation_count < 2:
            issues.append(f"Insufficient regulatory citations (found {citation_count}, need 2+)")
            score -= 15
        
        # Check for clinical guideline references
        guideline_patterns = ['ACC/AHA', 'ACR', 'NCCN', 'AAOS', 'ASAM', 'USPSTF', 'APA', 'Guidelines']
        guideline_count = sum(1 for pattern in guideline_patterns if pattern in appeal_content)
        if guideline_count < 1:
            issues.append("No clinical guideline citations found")
            score -= 10
        
        # Check length (should be substantial)
        word_count = len(appeal_content.split())
        if word_count < 300:
            issues.append(f"Appeal too brief ({word_count} words, recommend 400+)")
            score -= 15
        
        # Check for specific dollar amount request
        if '$' not in appeal_content and 'payment' not in appeal_content.lower():
            issues.append("Missing specific payment request")
            score -= 10
        
        return {
            'score': max(0, score),
            'issues': issues,
            'passed': score >= 70
        }
    
    def _extract_citations(self, appeal_content: str) -> dict:
        """
        Extract all regulatory, clinical, and legal citations from appeal content
        Returns structured citation data for verification
        """
        citations = {
            'regulatory': [],
            'clinical_guidelines': [],
            'case_law': [],
            'statutes': [],
            'cfr': [],
            'usc': []
        }
        
        # Extract CFR citations (e.g., "29 CFR 2560.503-1", "42 CFR 411.15")
        cfr_pattern = r'\b(\d+)\s+CFR\s+([\d.]+(?:\([a-z0-9]+\))?(?:\([ivx]+\))?)'
        cfr_matches = re.finditer(cfr_pattern, appeal_content, re.IGNORECASE)
        for match in cfr_matches:
            citations['cfr'].append(f"{match.group(1)} CFR {match.group(2)}")
        
        # Extract ERISA citations (e.g., "ERISA Section 503", "ERISA § 502(a)")
        erisa_pattern = r'ERISA\s+(?:Section|§)\s+([\d]+(?:\([a-z0-9]+\))?)'
        erisa_matches = re.finditer(erisa_pattern, appeal_content, re.IGNORECASE)
        for match in erisa_matches:
            citations['regulatory'].append(f"ERISA Section {match.group(1)}")
        
        # Extract USC citations (e.g., "42 USC 1395", "29 USC 1133")
        usc_pattern = r'\b(\d+)\s+U\.?S\.?C\.?\s+([\d]+)'
        usc_matches = re.finditer(usc_pattern, appeal_content, re.IGNORECASE)
        for match in usc_matches:
            citations['usc'].append(f"{match.group(1)} USC {match.group(2)}")
        
        # Extract ACA citations (e.g., "ACA Section 2719", "Affordable Care Act Section 1557")
        aca_pattern = r'(?:ACA|Affordable Care Act)\s+Section\s+([\d]+)'
        aca_matches = re.finditer(aca_pattern, appeal_content, re.IGNORECASE)
        for match in aca_matches:
            citations['regulatory'].append(f"ACA Section {match.group(1)}")
        
        # Extract clinical guideline references
        guideline_orgs = ['ACC/AHA', 'NCCN', 'ACR', 'AAOS', 'ASAM', 'USPSTF', 'APA', 'ACOG', 'AAN', 'IDSA']
        for org in guideline_orgs:
            if org in appeal_content:
                # Try to extract year and specific guideline name
                pattern = rf'{re.escape(org)}\s+(\d{{4}})?\s*([^.]+?(?:Guidelines?|Criteria|Recommendations?))'
                matches = re.finditer(pattern, appeal_content, re.IGNORECASE)
                for match in matches:
                    year = match.group(1) or ''
                    guideline = match.group(2).strip()
                    citations['clinical_guidelines'].append(f"{org} {year} {guideline}".strip())
        
        # Extract case law references (e.g., "Smith v. Aetna", "Doe v. United Healthcare")
        case_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+v\.?\s+([A-Z][a-zA-Z\s]+?)(?:\s+\(|\s+,|\.|$)'
        case_matches = re.finditer(case_pattern, appeal_content)
        for match in case_matches:
            citations['case_law'].append(f"{match.group(1)} v. {match.group(2).strip()}")
        
        return citations
    
    def _verify_citations(self, citations: dict) -> dict:
        """
        Verify extracted citations against known knowledge base
        Returns verification results with hallucination warnings
        """
        verification = {
            'verified': [],
            'unverified': [],
            'potential_hallucinations': [],
            'verification_rate': 0.0
        }
        
        total_citations = 0
        verified_count = 0
        
        # Verify CFR citations against REGULATORY_REFERENCES
        for cfr_cite in citations['cfr']:
            total_citations += 1
            # Check if this CFR citation exists in our knowledge base
            found = False
            for reg_key, reg_data in REGULATORY_REFERENCES.items():
                if cfr_cite.lower() in reg_data['citation'].lower():
                    verification['verified'].append({
                        'citation': cfr_cite,
                        'type': 'CFR',
                        'source': reg_key
                    })
                    verified_count += 1
                    found = True
                    break
            if not found:
                verification['unverified'].append({
                    'citation': cfr_cite,
                    'type': 'CFR',
                    'warning': 'Not found in knowledge base - verify accuracy'
                })
        
        # Verify ERISA citations
        for erisa_cite in citations['regulatory']:
            if 'ERISA' in erisa_cite:
                total_citations += 1
                found = False
                for reg_key, reg_data in REGULATORY_REFERENCES.items():
                    if 'erisa' in reg_key.lower() and any(num in erisa_cite for num in ['503', '502', '510']):
                        verification['verified'].append({
                            'citation': erisa_cite,
                            'type': 'ERISA',
                            'source': reg_key
                        })
                        verified_count += 1
                        found = True
                        break
                if not found:
                    verification['unverified'].append({
                        'citation': erisa_cite,
                        'type': 'ERISA',
                        'warning': 'Not found in knowledge base - verify accuracy'
                    })
        
        # Verify clinical guidelines
        for guideline in citations['clinical_guidelines']:
            total_citations += 1
            found = False
            for clin_key, clin_data in CLINICAL_GUIDELINES.items():
                if any(org in guideline.upper() for org in clin_key.upper().split('_')):
                    verification['verified'].append({
                        'citation': guideline,
                        'type': 'Clinical Guideline',
                        'source': clin_key
                    })
                    verified_count += 1
                    found = True
                    break
            if not found:
                verification['potential_hallucinations'].append({
                    'citation': guideline,
                    'type': 'Clinical Guideline',
                    'warning': 'Guideline not in knowledge base - may be hallucinated or outdated'
                })
        
        # Calculate verification rate
        if total_citations > 0:
            verification['verification_rate'] = verified_count / total_citations
        
        return verification

# Singleton instance
advanced_ai_generator = AdvancedAIAppealGenerator()
