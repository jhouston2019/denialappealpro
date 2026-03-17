"""
Comprehensive integration test suite for AI appeal generation
Tests the complete flow from input to validated output
"""
import unittest
from datetime import datetime, date
from advanced_ai_generator import AdvancedAIAppealGenerator

class MockAppeal:
    """Mock appeal object for testing"""
    def __init__(self, **kwargs):
        self.appeal_id = kwargs.get('appeal_id', 'TEST-001')
        self.payer = kwargs.get('payer', 'UNITED HEALTHCARE')
        self.claim_number = kwargs.get('claim_number', 'CLM123456')
        self.patient_id = kwargs.get('patient_id', 'PAT789')
        self.provider_name = kwargs.get('provider_name', 'Dr. Test Provider')
        self.provider_npi = kwargs.get('provider_npi', '1234567890')
        self.date_of_service = kwargs.get('date_of_service', date(2024, 1, 15))
        self.denial_reason = kwargs.get('denial_reason', 'Not medically necessary')
        self.denial_code = kwargs.get('denial_code', 'CO-50')
        self.diagnosis_code = kwargs.get('diagnosis_code', 'I25.10')
        self.cpt_codes = kwargs.get('cpt_codes', '93458')
        self.billed_amount = kwargs.get('billed_amount', 3500.00)
        self.appeal_level = kwargs.get('appeal_level', 'level_1')
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        
        # AI quality tracking fields
        self.ai_quality_score = None
        self.ai_citation_count = None
        self.ai_word_count = None
        self.ai_model_used = None
        self.ai_generation_method = None

class TestAIGenerationFlow(unittest.TestCase):
    """Test complete AI generation workflow"""
    
    def setUp(self):
        self.generator = AdvancedAIAppealGenerator()
    
    def test_template_fallback_when_disabled(self):
        """Test that system falls back to templates when AI is disabled"""
        # Temporarily disable AI
        original_enabled = self.generator.enabled
        self.generator.enabled = False
        
        appeal = MockAppeal()
        content = self.generator.generate_appeal_content(appeal)
        
        # Should return template content
        self.assertIsNotNone(content)
        self.assertGreater(len(content), 100)
        
        # Restore original state
        self.generator.enabled = original_enabled
    
    def test_direct_generation_low_value(self):
        """Test direct generation for low-value appeals"""
        if not self.generator.enabled:
            self.skipTest("OpenAI API not configured")
        
        appeal = MockAppeal(
            billed_amount=500.00,  # Low value - should use direct generation
            appeal_level='level_1'
        )
        content = self.generator.generate_appeal_content(appeal)
        
        # Verify content was generated
        self.assertIsNotNone(content)
        self.assertGreater(len(content), 200)
        
        # Verify quality metrics were stored
        self.assertIsNotNone(appeal.ai_quality_score)
        self.assertIsNotNone(appeal.ai_citation_count)
        self.assertEqual(appeal.ai_generation_method, 'direct')
    
    def test_chain_of_thought_high_value(self):
        """Test chain-of-thought reasoning for high-value appeals"""
        if not self.generator.enabled:
            self.skipTest("OpenAI API not configured")
        
        appeal = MockAppeal(
            billed_amount=15000.00,  # High value - should trigger chain-of-thought
            appeal_level='level_1',
            denial_code='CO-50',
            cpt_codes='93458,93459'
        )
        content = self.generator.generate_appeal_content(appeal)
        
        # Verify content was generated
        self.assertIsNotNone(content)
        self.assertGreater(len(content), 300)
        
        # Verify chain-of-thought was used
        self.assertEqual(appeal.ai_generation_method, 'chain_of_thought')
        
        # Verify quality metrics
        self.assertIsNotNone(appeal.ai_quality_score)
        self.assertGreater(appeal.ai_citation_count, 0)
    
    def test_citation_verification_workflow(self):
        """Test that citations are extracted and verified"""
        if not self.generator.enabled:
            self.skipTest("OpenAI API not configured")
        
        appeal = MockAppeal(
            billed_amount=8000.00,
            denial_code='CO-96',
            cpt_codes='99285'
        )
        content = self.generator.generate_appeal_content(appeal)
        
        # Extract and verify citations
        citations = self.generator._extract_citations(content)
        verification = self.generator._verify_citations(citations)
        
        # Should have some citations
        total_citations = sum(len(cites) for cites in citations.values())
        self.assertGreater(total_citations, 0)
        
        # Verification should have results
        self.assertIsNotNone(verification['verification_rate'])
    
    def test_quality_validation_comprehensive(self):
        """Test comprehensive quality validation"""
        # Test content with known issues
        poor_content = """
        I am writing to request that you please consider this appeal.
        Maybe the denial was wrong. Hopefully you will approve it.
        Thank you for your consideration.
        """
        quality = self.generator._validate_appeal_quality(poor_content)
        
        # Should fail quality check
        self.assertFalse(quality['passed'])
        self.assertLess(quality['score'], 50)
        self.assertGreater(len(quality['issues']), 3)
        
        # Test professional content
        good_content = """
        This appeal contests the denial of cardiac catheterization (CPT 93458) performed on 
        January 15, 2024, for patient PAT789 under Claim CLM123456. The denial violates 
        29 CFR 2560.503-1(h)(2)(iii) requirements for specific clinical rationale.
        
        Per ACC/AHA 2021 Chest Pain Guidelines, cardiac catheterization is indicated for 
        patients with high-risk unstable angina and documented coronary artery disease. 
        The patient presented with Canadian Cardiovascular Society Class III angina despite 
        maximal medical therapy, meeting all criteria for invasive evaluation.
        
        Under ERISA Section 503 and 42 CFR 411.15(k)(1), this service meets the reasonable 
        and necessary standard. The denial fails to address patient-specific contraindications 
        to conservative management documented in the clinical record.
        
        Pursuant to NCCN guidelines and clinical evidence, the procedure was medically 
        necessary and appropriate. The payer's determination lacks specific clinical basis 
        as required by 29 CFR 2560.503-1(g)(1)(i).
        
        We request immediate reversal and payment of $15,000 within 30 days per applicable 
        prompt pay requirements. The denial represents a violation of ERISA's full and fair 
        review mandate and subjects the plan to potential DOL enforcement action.
        """
        quality = self.generator._validate_appeal_quality(good_content)
        
        # Should pass quality check
        self.assertTrue(quality['passed'])
        self.assertGreaterEqual(quality['score'], 70)

class TestProfessionalLanguageDetection(unittest.TestCase):
    """Test detection of unprofessional or generic language"""
    
    def setUp(self):
        self.generator = AdvancedAIAppealGenerator()
    
    def test_detect_hedging_language(self):
        """Test detection of hedging language (maybe, perhaps, possibly)"""
        content = """
        Perhaps this denial was incorrect. Maybe the service was necessary.
        Possibly the reviewer missed the documentation. It might be that the 
        patient needed this treatment. Could be a mistake.
        """ * 20  # Repeat to meet word count
        quality = self.generator._validate_appeal_quality(content)
        
        # Should detect hedging language
        self.assertLess(quality['score'], 50)
        hedging_issues = [issue for issue in quality['issues'] if any(
            word in issue.lower() for word in ['perhaps', 'maybe', 'possibly', 'might', 'could']
        )]
        self.assertGreater(len(hedging_issues), 0)
    
    def test_detect_emotional_appeals(self):
        """Test detection of emotional/unprofessional language"""
        content = """
        I hope this letter finds you well. Thank you for your consideration.
        We kindly request that you please reconsider. If possible, at your convenience,
        we would appreciate your help. Dear Sir or Madam, we believe that this is important.
        """ * 20  # Repeat to meet word count
        quality = self.generator._validate_appeal_quality(content)
        
        # Should detect multiple generic phrases
        self.assertLess(quality['score'], 40)
        self.assertGreater(len(quality['issues']), 5)

class TestKnowledgeBaseIntegration(unittest.TestCase):
    """Test integration with medical knowledge base"""
    
    def setUp(self):
        self.generator = AdvancedAIAppealGenerator()
    
    def test_payer_tactics_integration(self):
        """Test that payer-specific tactics are available"""
        from medical_knowledge_base import PAYER_TACTICS
        
        # Verify key payers are in knowledge base
        self.assertIn('UNITED HEALTHCARE', PAYER_TACTICS)
        self.assertIn('ANTHEM', PAYER_TACTICS)
        self.assertIn('AETNA', PAYER_TACTICS)
        
        # Verify tactics have required fields
        uhc_tactics = PAYER_TACTICS['UNITED HEALTHCARE']
        self.assertIn('known_tactics', uhc_tactics)
        self.assertIn('winning_strategies', uhc_tactics)
        self.assertIn('escalation_leverage', uhc_tactics)
    
    def test_clinical_guidelines_available(self):
        """Test that clinical guidelines are in knowledge base"""
        from medical_knowledge_base import CLINICAL_GUIDELINES
        
        # Verify major guidelines are available
        self.assertGreater(len(CLINICAL_GUIDELINES), 5)
        
        # Check structure
        for guideline_key, guideline_data in CLINICAL_GUIDELINES.items():
            self.assertIn('organization', guideline_data)
            self.assertIn('guideline_name', guideline_data)
            self.assertIn('key_recommendations', guideline_data)
    
    def test_regulatory_references_comprehensive(self):
        """Test that regulatory references are comprehensive"""
        from medical_knowledge_base import REGULATORY_REFERENCES
        
        # Verify key regulations are present
        self.assertIn('ERISA_SECTION_503', REGULATORY_REFERENCES)
        self.assertIn('CFR_29_2560_503_1', REGULATORY_REFERENCES)
        self.assertIn('ACA_SECTION_2719', REGULATORY_REFERENCES)
        
        # Check structure
        for reg_key, reg_data in REGULATORY_REFERENCES.items():
            self.assertIn('citation', reg_data)
            self.assertIn('description', reg_data)
            self.assertIn('appeal_relevance', reg_data)

if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
