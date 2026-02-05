"""
AI-powered appeal content generation using OpenAI GPT-4
"""
import os
from openai import OpenAI
from denial_templates import get_denial_template

class AIAppealGenerator:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.enabled = bool(self.api_key)
        
        if self.enabled:
            self.client = OpenAI(api_key=self.api_key)
            print("AI appeal generation enabled (OpenAI)")
        else:
            print("AI appeal generation disabled (using templates only)")
    
    def generate_appeal_content(self, appeal):
        """
        Generate AI-powered appeal content based on denial details
        
        Args:
            appeal: Appeal model object with denial information
        
        Returns:
            String containing the generated appeal content
        """
        if not self.enabled:
            # Fallback to template if OpenAI not configured
            template = get_denial_template(appeal.denial_code)
            return self._format_template(template['template'], appeal)
        
        try:
            # Build the prompt for GPT-4
            prompt = self._build_prompt(appeal)
            
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert medical billing specialist and healthcare attorney who writes compelling insurance appeal letters. 

Your appeals are:
- Professional and formal in tone
- Evidence-based with specific medical and policy references
- Structured with clear sections and arguments
- Compliant with insurance regulations
- Persuasive without being argumentative
- Detailed but concise (3-5 substantive paragraphs)

You cite:
- Medical necessity criteria
- Clinical guidelines from medical societies
- Insurance policy language
- Federal and state regulations (ERISA, state insurance laws)
- Evidence-based medicine principles

Format your response as a formal appeal argument only (no greeting, no signature - just the argument body)."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            content = response.choices[0].message.content
            print(f"AI-generated appeal content for {appeal.appeal_id}")
            return content
            
        except Exception as e:
            print(f"Error generating AI content: {e}")
            # Fallback to template on error
            template = get_denial_template(appeal.denial_code)
            return self._format_template(template['template'], appeal)
    
    def _build_prompt(self, appeal):
        """Build the prompt for OpenAI based on appeal details"""
        
        # Get the base template for context
        denial_template = get_denial_template(appeal.denial_code)
        denial_name = denial_template['name']
        
        prompt = f"""Write a compelling insurance appeal letter argument for the following claim denial:

DENIAL INFORMATION:
- Denial Code: {appeal.denial_code or 'Not specified'}
- Denial Type: {denial_name}
- Denial Reason: {appeal.denial_reason}

CLAIM DETAILS:
- Insurance Payer: {appeal.payer_name}
- Provider: {appeal.provider_name} (NPI: {appeal.provider_npi})
- Claim Number: {appeal.claim_number}
- Patient ID: {appeal.patient_id}
- Date of Service: {appeal.date_of_service.strftime('%m/%d/%Y')}
- CPT Codes: {appeal.cpt_codes or 'Not specified'}

REQUIREMENTS:
1. Address the specific denial reason with targeted arguments
2. Cite medical necessity criteria and clinical guidelines
3. Reference applicable insurance policy requirements
4. Include regulatory considerations (ERISA, state law)
5. Request specific action (reconsideration, payment approval)
6. Use professional, formal medical billing language
7. Be persuasive but respectful
8. Keep to 3-5 well-structured paragraphs

Write ONLY the appeal argument body (no "Dear Sir/Madam", no signature block - those are added separately).
Start with "This appeal addresses..." and provide a comprehensive, evidence-based argument for overturning this denial."""
        
        return prompt
    
    def _format_template(self, template_text, appeal):
        """Format template with appeal data (fallback method)"""
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
ai_generator = AIAppealGenerator()
