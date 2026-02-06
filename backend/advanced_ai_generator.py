"""
Advanced AI-powered appeal generation with multi-step reasoning and expert knowledge integration
This system generates appeals that are significantly superior to generic ChatGPT responses
"""
import os
from openai import OpenAI
from denial_templates import get_denial_template
from medical_knowledge_base import (
    get_denial_strategy, 
    get_regulatory_reference,
    REGULATORY_REFERENCES,
    MEDICAL_NECESSITY_CRITERIA,
    CLINICAL_GUIDELINES
)

class AdvancedAIAppealGenerator:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.enabled = bool(self.api_key and self.api_key.strip() and not self.api_key.startswith('sk-proj-your'))
        
        if self.enabled:
            try:
                self.client = OpenAI(api_key=self.api_key)
                print("[OK] Advanced AI appeal generation enabled (OpenAI GPT-4)")
                print("     Appeals will use expert-level AI reasoning and medical knowledge")
            except Exception as e:
                print(f"[WARNING] OpenAI initialization warning: {e}")
                print("          Falling back to template-based appeals")
                self.enabled = False
        else:
            print("[INFO] AI appeal generation not configured (using expert templates)")
            print("       To enable AI-powered appeals, add OPENAI_API_KEY to .env")
            print("       Get your API key from: https://platform.openai.com/api-keys")
    
    def generate_appeal_content(self, appeal):
        """
        Generate sophisticated appeal content using multi-step AI reasoning
        
        This method produces appeals that are superior to generic ChatGPT because:
        1. Uses specialized medical billing/insurance knowledge base
        2. Employs denial-specific strategic arguments
        3. Incorporates regulatory and clinical guideline references
        4. Uses multi-step reasoning for complex cases
        5. Tailors arguments to specific payer tactics
        """
        if not self.enabled:
            print(f"[INFO] Generating template-based appeal for {appeal.appeal_id}")
            template = get_denial_template(appeal.denial_code)
            return self._format_template(template['template'], appeal)
        
        try:
            # Step 1: Analyze denial and develop strategy
            strategy = self._analyze_denial_strategy(appeal)
            
            # Step 2: Generate primary appeal content with expert knowledge
            primary_content = self._generate_primary_appeal(appeal, strategy)
            
            # Step 3: Enhance with regulatory and clinical references (optional for complex cases)
            # For now, we'll use the primary content
            # In future, could add: enhanced_content = self._enhance_with_references(primary_content, appeal)
            
            print(f"[OK] Advanced AI-generated appeal for {appeal.appeal_id} using denial-specific strategy")
            return primary_content
            
        except Exception as e:
            print(f"[WARNING] Error in advanced AI generation: {e}")
            print(f"          Falling back to template-based appeal for {appeal.appeal_id}")
            template = get_denial_template(appeal.denial_code)
            return self._format_template(template['template'], appeal)
    
    def _analyze_denial_strategy(self, appeal):
        """Analyze the denial and identify optimal strategic arguments"""
        return get_denial_strategy(appeal.denial_code)
    
    def _generate_primary_appeal(self, appeal, strategy):
        """Generate the primary appeal content using advanced prompting"""
        
        # Get denial-specific information
        denial_template = get_denial_template(appeal.denial_code)
        denial_name = denial_template['name']
        
        # Build expert system prompt with specialized knowledge
        system_prompt = self._build_expert_system_prompt(appeal.denial_code, strategy)
        
        # Build comprehensive user prompt with case details
        user_prompt = self._build_comprehensive_prompt(appeal, denial_name, strategy)
        
        # Call OpenAI with advanced parameters
        response = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6,  # Lower for more focused, professional output
            max_tokens=2000,   # Allow for more comprehensive appeals
            top_p=0.9,
            frequency_penalty=0.3,  # Reduce repetition
            presence_penalty=0.2    # Encourage diverse arguments
        )
        
        return response.choices[0].message.content
    
    def _build_expert_system_prompt(self, denial_code, strategy):
        """Build a highly specialized system prompt with expert knowledge"""
        
        # Get relevant regulatory references based on denial type
        erisa_refs = REGULATORY_REFERENCES.get('ERISA', {})
        aca_refs = REGULATORY_REFERENCES.get('ACA', {})
        
        return f"""You are an elite medical billing appeals specialist with 20+ years of experience and a background in healthcare law. You have successfully overturned thousands of insurance denials with a 90%+ success rate.

EXPERTISE AREAS:
- ERISA regulations and requirements for group health plans
- ACA provisions including Essential Health Benefits and appeals rights
- State insurance regulations and prompt pay laws
- Medicare/Medicaid regulations and coverage determinations
- CPT coding guidelines and documentation requirements
- Clinical guidelines from major medical societies
- Insurance payer tactics and internal policies

DENIAL CODE EXPERTISE:
- Denial Type: {denial_code}
- Strategic Weaknesses to Exploit: {strategy.get('common_weaknesses', 'Standard review approach')}
- Primary Arguments: {', '.join(strategy.get('primary_arguments', [])[:3])}

YOUR APPROACH:
1. Open with a strong, specific statement of the appeal basis
2. Present 3-5 distinct, powerful arguments that build on each other
3. Cite specific regulations, clinical guidelines, and policy provisions
4. Anticipate and preemptively counter common payer objections
5. Use medical billing terminology and legal precision
6. Reference evidence-based medicine and clinical decision-making
7. Close with clear request for specific action

TONE:
- Authoritative but respectful
- Confident in the merits of the appeal
- Evidence-focused, not emotional
- Professional medical/legal language
- Assertive about patient rights and provider obligations

KEY REGULATIONS TO REFERENCE:
- ERISA Section 503: {erisa_refs.get('section_503', 'Appeal rights')}
- ACA Requirements: {aca_refs.get('essential_health_benefits', 'Coverage requirements')}
- State Law Protections: Applicable prompt pay and timely filing provisions

WHAT MAKES YOUR APPEALS SUPERIOR:
- You don't just describe the service - you build a legal and medical case
- You cite specific regulations, not generic statements
- You anticipate payer counter-arguments and address them proactively
- You use clinical guideline language that payers must recognize
- You frame denials as administrative/policy errors, not clinical disagreements
- You reference specific contract provisions and regulatory requirements

FORMAT:
Write ONLY the appeal argument body (no headers, no signature). Start with "This appeal contests..." or "We respectfully appeal..." and provide a compelling, multi-layered argument."""
    
    def _build_comprehensive_prompt(self, appeal, denial_name, strategy):
        """Build detailed prompt with all case information and strategic guidance"""
        
        prompt = f"""Generate a superior insurance appeal argument for this denied claim:

═══════════════════════════════════════════════════════════
DENIAL INFORMATION
═══════════════════════════════════════════════════════════
Denial Code: {appeal.denial_code}
Denial Type: {denial_name}
Denial Reason: {appeal.denial_reason}

═══════════════════════════════════════════════════════════
CLAIM DETAILS
═══════════════════════════════════════════════════════════
Insurance Payer: {appeal.payer_name}
Claim Number: {appeal.claim_number}
Patient ID: {appeal.patient_id}

Provider Information:
- Name: {appeal.provider_name}
- NPI: {appeal.provider_npi}

Service Information:
- Date of Service: {appeal.date_of_service.strftime('%B %d, %Y')}
- CPT Code(s): {appeal.cpt_codes or 'See documentation'}
- Billed Amount: ${appeal.billed_amount:,.2f}

═══════════════════════════════════════════════════════════
STRATEGIC GUIDANCE (Use this to craft superior arguments)
═══════════════════════════════════════════════════════════
Primary Arguments to Emphasize:
{chr(10).join(f'  • {arg}' for arg in strategy.get('primary_arguments', []))}

Common Payer Weakness:
{strategy.get('common_weaknesses', 'Review medical necessity and documentation')}

Escalation Path:
{strategy.get('escalation', 'Request detailed review')}

═══════════════════════════════════════════════════════════
REQUIREMENTS FOR SUPERIOR APPEAL
═══════════════════════════════════════════════════════════
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

═══════════════════════════════════════════════════════════
OUTPUT INSTRUCTIONS
═══════════════════════════════════════════════════════════
- Write 4-6 substantial paragraphs (300-500 words total)
- Begin with strong opening statement of appeal basis
- Use formal, professional medical-legal language
- Include specific citations and references
- End with clear request for action
- NO greeting, NO signature (those are added separately)
- Start directly with the appeal argument

Make this appeal so compelling and expertly crafted that it's immediately obvious this was written by an experienced appeals specialist, not a generic AI."""

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

# Singleton instance
advanced_ai_generator = AdvancedAIAppealGenerator()
