"""
Real-Time Citation Validator - Validates citations during AI generation

This system provides citation guidance to the AI in real-time, reducing hallucinations
by giving the AI a list of valid citations it can use.
"""
import logging
from medical_knowledge_base import (
    REGULATORY_REFERENCES,
    CLINICAL_GUIDELINES,
    CASE_LAW_PRECEDENTS
)

logger = logging.getLogger(__name__)

class CitationValidator:
    """
    Provides real-time citation validation and guidance for AI generation
    """
    
    def __init__(self):
        self.valid_citations = self._build_valid_citation_list()
    
    def _build_valid_citation_list(self) -> dict:
        """
        Build a comprehensive list of valid citations the AI can use
        This prevents hallucinations by giving the AI explicit options
        """
        citations = {
            'regulatory': [],
            'clinical': [],
            'case_law': []
        }
        
        # Extract regulatory citations
        for key, data in REGULATORY_REFERENCES.items():
            citations['regulatory'].append({
                'citation': data['citation'],
                'short_name': key,
                'description': data['description'],
                'use_for': data.get('appeal_relevance', 'General appeals')
            })
        
        # Extract clinical guidelines
        for key, data in CLINICAL_GUIDELINES.items():
            citations['clinical'].append({
                'citation': f"{data['organization']} {data['guideline_name']}",
                'short_name': key,
                'organization': data['organization'],
                'use_for': ', '.join(data.get('applicable_conditions', ['General']))
            })
        
        # Extract case law
        for key, data in CASE_LAW_PRECEDENTS.items():
            citations['case_law'].append({
                'citation': data['case_name'],
                'short_name': key,
                'principle': data['legal_principle'],
                'use_for': data.get('appeal_application', 'General')
            })
        
        return citations
    
    def get_relevant_citations(self, denial_code: str, cpt_codes: str = None, payer: str = None) -> dict:
        """
        Get citations relevant to this specific appeal
        
        This provides the AI with a curated list of valid citations to use,
        dramatically reducing hallucination risk.
        """
        relevant = {
            'regulatory': [],
            'clinical': [],
            'case_law': []
        }
        
        # Always include core ERISA and CFR citations
        core_regulatory = [
            'ERISA_SECTION_503',
            'CFR_29_2560_503_1',
            'ACA_SECTION_2719'
        ]
        
        for cite in self.valid_citations['regulatory']:
            if cite['short_name'] in core_regulatory:
                relevant['regulatory'].append(cite)
        
        # Add denial-specific regulatory citations
        if denial_code:
            denial_map = {
                'CO-50': ['CFR_42_411_15', 'MEDICARE_SECONDARY_PAYER'],  # Medical necessity
                'CO-96': ['EMERGENCY_MEDICAL_TREATMENT'],  # Non-covered charges
                'CO-16': ['CFR_29_2560_503_1'],  # Timely filing
                'CO-197': ['ERISA_SECTION_503', 'CFR_29_2560_503_1']  # Precert
            }
            
            for reg_key in denial_map.get(denial_code, []):
                for cite in self.valid_citations['regulatory']:
                    if cite['short_name'] == reg_key and cite not in relevant['regulatory']:
                        relevant['regulatory'].append(cite)
        
        # Add CPT-specific clinical guidelines
        if cpt_codes:
            cpt_list = [code.strip() for code in cpt_codes.split(',')]
            
            # Map CPT codes to relevant guidelines
            cpt_guideline_map = {
                '93458': ['ACC_AHA_CHEST_PAIN', 'ACC_AHA_CORONARY'],  # Cardiac cath
                '99285': ['ACEP_EMERGENCY'],  # ED Level 5
                '27447': ['AAOS_KNEE'],  # Knee arthroplasty
                '70553': ['ACR_APPROPRIATENESS'],  # MRI brain
                '99214': ['GENERAL_MEDICAL']  # Office visit
            }
            
            for cpt in cpt_list:
                for guideline_key in cpt_guideline_map.get(cpt, []):
                    for cite in self.valid_citations['clinical']:
                        if cite['short_name'] == guideline_key and cite not in relevant['clinical']:
                            relevant['clinical'].append(cite)
        
        # Add general clinical guidelines if none specific
        if not relevant['clinical']:
            # Add top 3 most versatile guidelines
            general_guidelines = ['GENERAL_MEDICAL', 'MEDICAL_NECESSITY_GENERAL']
            for guideline_key in general_guidelines:
                for cite in self.valid_citations['clinical']:
                    if cite['short_name'] == guideline_key:
                        relevant['clinical'].append(cite)
                        break
        
        # Add relevant case law
        case_law_map = {
            'CO-50': ['MEDICAL_NECESSITY_CASE'],
            'CO-96': ['EMERGENCY_SERVICES_CASE'],
            'CO-197': ['PRIOR_AUTH_CASE']
        }
        
        for case_key in case_law_map.get(denial_code, []):
            for cite in self.valid_citations['case_law']:
                if cite['short_name'] == case_key and cite not in relevant['case_law']:
                    relevant['case_law'].append(cite)
        
        return relevant
    
    def format_citation_guidance(self, relevant_citations: dict) -> str:
        """
        Format relevant citations as guidance text for the AI prompt
        
        This explicitly tells the AI which citations it can use,
        preventing it from making up non-existent regulations.
        """
        guidance = "\n\nVALID CITATIONS YOU MAY USE (DO NOT cite anything not in this list):\n\n"
        
        # Regulatory citations
        if relevant_citations['regulatory']:
            guidance += "REGULATORY CITATIONS:\n"
            for cite in relevant_citations['regulatory']:
                guidance += f"- {cite['citation']}: {cite['description']}\n"
            guidance += "\n"
        
        # Clinical guidelines
        if relevant_citations['clinical']:
            guidance += "CLINICAL GUIDELINES:\n"
            for cite in relevant_citations['clinical']:
                guidance += f"- {cite['citation']}: Use for {cite['use_for']}\n"
            guidance += "\n"
        
        # Case law
        if relevant_citations['case_law']:
            guidance += "CASE LAW PRECEDENTS:\n"
            for cite in relevant_citations['case_law']:
                guidance += f"- {cite['citation']}: {cite['principle']}\n"
            guidance += "\n"
        
        guidance += "CRITICAL: Only cite regulations, guidelines, and cases from the above list. "
        guidance += "Do not invent or hallucinate any citations not explicitly provided. "
        guidance += "If you need to reference a concept without a specific citation, use general language instead.\n"
        
        return guidance

# Singleton instance
citation_validator = CitationValidator()
