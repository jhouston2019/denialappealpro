"""
Test suite for AI citation extraction and verification system
Tests the new hallucination prevention features
"""
import unittest
from advanced_ai_generator import AdvancedAIAppealGenerator

class TestCitationExtraction(unittest.TestCase):
    """Test citation extraction from appeal content"""
    
    def setUp(self):
        self.generator = AdvancedAIAppealGenerator()
    
    def test_extract_cfr_citations(self):
        """Test extraction of CFR citations"""
        content = """
        This appeal is filed pursuant to 29 CFR 2560.503-1(h)(2)(iii) and 42 CFR 411.15(k)(1).
        The denial violates 45 CFR 147.136 requirements.
        """
        citations = self.generator._extract_citations(content)
        
        self.assertGreaterEqual(len(citations['cfr']), 3)
        self.assertIn('29 CFR 2560.503-1', citations['cfr'])
        self.assertIn('42 CFR 411.15', citations['cfr'])
    
    def test_extract_erisa_citations(self):
        """Test extraction of ERISA citations"""
        content = """
        Under ERISA Section 503 and ERISA § 502(a), the plan must provide full and fair review.
        """
        citations = self.generator._extract_citations(content)
        
        self.assertGreaterEqual(len(citations['regulatory']), 2)
        self.assertTrue(any('503' in cite for cite in citations['regulatory']))
        self.assertTrue(any('502' in cite for cite in citations['regulatory']))
    
    def test_extract_clinical_guidelines(self):
        """Test extraction of clinical guideline citations"""
        content = """
        Per ACC/AHA 2021 Chest Pain Guidelines and NCCN 2023 Oncology Guidelines,
        this treatment meets evidence-based standards. The ACR Appropriateness Criteria
        also support this intervention.
        """
        citations = self.generator._extract_citations(content)
        
        self.assertGreaterEqual(len(citations['clinical_guidelines']), 2)
        self.assertTrue(any('ACC/AHA' in cite for cite in citations['clinical_guidelines']))
        self.assertTrue(any('NCCN' in cite for cite in citations['clinical_guidelines']))
    
    def test_extract_usc_citations(self):
        """Test extraction of USC citations"""
        content = """
        This violates 42 USC 1395 and 29 USC 1133 requirements.
        """
        citations = self.generator._extract_citations(content)
        
        self.assertGreaterEqual(len(citations['usc']), 2)
        self.assertIn('42 USC 1395', citations['usc'])
        self.assertIn('29 USC 1133', citations['usc'])
    
    def test_extract_aca_citations(self):
        """Test extraction of ACA citations"""
        content = """
        Under ACA Section 2719 and Affordable Care Act Section 1557, the plan must comply.
        """
        citations = self.generator._extract_citations(content)
        
        self.assertGreaterEqual(len(citations['regulatory']), 2)
        self.assertTrue(any('2719' in cite for cite in citations['regulatory']))
        self.assertTrue(any('1557' in cite for cite in citations['regulatory']))
    
    def test_extract_case_law(self):
        """Test extraction of case law citations"""
        content = """
        As established in Smith v. Aetna and Doe v. United Healthcare, the plan must provide rationale.
        """
        citations = self.generator._extract_citations(content)
        
        self.assertGreaterEqual(len(citations['case_law']), 1)

class TestCitationVerification(unittest.TestCase):
    """Test citation verification against knowledge base"""
    
    def setUp(self):
        self.generator = AdvancedAIAppealGenerator()
    
    def test_verify_known_cfr_citations(self):
        """Test that known CFR citations are verified"""
        citations = {
            'cfr': ['29 CFR 2560.503-1', '42 CFR 411.15'],
            'regulatory': [],
            'clinical_guidelines': [],
            'case_law': [],
            'statutes': [],
            'usc': []
        }
        verification = self.generator._verify_citations(citations)
        
        # At least one should be verified (we have these in REGULATORY_REFERENCES)
        self.assertGreater(len(verification['verified']), 0)
        self.assertGreater(verification['verification_rate'], 0)
    
    def test_detect_unknown_citations(self):
        """Test that unknown citations are flagged"""
        citations = {
            'cfr': ['99 CFR 9999.999'],  # Fake citation
            'regulatory': [],
            'clinical_guidelines': [],
            'case_law': [],
            'statutes': [],
            'usc': []
        }
        verification = self.generator._verify_citations(citations)
        
        # Should be flagged as unverified
        self.assertGreater(len(verification['unverified']), 0)
        self.assertEqual(verification['verification_rate'], 0.0)
    
    def test_verify_clinical_guidelines(self):
        """Test that known clinical guidelines are verified"""
        citations = {
            'cfr': [],
            'regulatory': [],
            'clinical_guidelines': ['ACC/AHA 2021 Guidelines', 'NCCN Oncology Guidelines'],
            'case_law': [],
            'statutes': [],
            'usc': []
        }
        verification = self.generator._verify_citations(citations)
        
        # Should have some verified (we have ACC/AHA and NCCN in CLINICAL_GUIDELINES)
        self.assertGreater(len(verification['verified']), 0)
    
    def test_hallucination_detection(self):
        """Test detection of potential hallucinated guidelines"""
        citations = {
            'cfr': [],
            'regulatory': [],
            'clinical_guidelines': ['FAKE/ORG 2026 Made Up Guidelines'],
            'case_law': [],
            'statutes': [],
            'usc': []
        }
        verification = self.generator._verify_citations(citations)
        
        # Should be flagged as potential hallucination
        self.assertGreater(len(verification['potential_hallucinations']), 0)

class TestQualityValidation(unittest.TestCase):
    """Test enhanced quality validation"""
    
    def setUp(self):
        self.generator = AdvancedAIAppealGenerator()
    
    def test_detect_generic_phrases(self):
        """Test detection of expanded generic phrase list"""
        content = """
        I am writing to request reconsideration. Perhaps you could consider this.
        Maybe the denial was incorrect. Hopefully you will approve this appeal.
        """
        quality = self.generator._validate_appeal_quality(content)
        
        # Should detect multiple generic phrases
        self.assertLess(quality['score'], 70)
        self.assertGreater(len(quality['issues']), 2)
    
    def test_professional_appeal_passes(self):
        """Test that professional appeal with citations passes"""
        content = """
        This appeal contests the denial under 29 CFR 2560.503-1 and ERISA Section 503.
        Per ACC/AHA 2021 Guidelines and NCCN criteria, this treatment is medically necessary.
        The patient's documented condition meets all clinical criteria for coverage.
        Conservative treatment failed as documented in the medical record.
        The denial violates regulatory requirements for specific clinical rationale.
        We request immediate reversal and payment of $15,000 within 30 days per prompt pay requirements.
        """ * 3  # Repeat to meet word count
        quality = self.generator._validate_appeal_quality(content)
        
        # Should pass quality check
        self.assertGreaterEqual(quality['score'], 70)
        self.assertTrue(quality['passed'])
    
    def test_insufficient_citations_flagged(self):
        """Test that appeals with insufficient citations are flagged"""
        content = """
        This is a generic appeal without proper citations.
        The service was medically necessary.
        Please approve this claim.
        """ * 20  # Repeat to meet word count
        quality = self.generator._validate_appeal_quality(content)
        
        # Should fail due to lack of citations
        self.assertLess(quality['score'], 70)
        self.assertTrue(any('citation' in issue.lower() for issue in quality['issues']))

if __name__ == '__main__':
    unittest.main()
