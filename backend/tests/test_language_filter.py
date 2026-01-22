"""Tests for language filtering."""
import unittest
from appeal_generator import LanguageFilter


class TestLanguageFilter(unittest.TestCase):
    """Test language filter prevents forbidden phrases."""
    
    def test_forbidden_medical_necessity(self):
        """Test detection of medical necessity language."""
        text = "This treatment is medically necessary for the patient."
        self.assertFalse(LanguageFilter.validate_text(text))
    
    def test_forbidden_legal_obligation(self):
        """Test detection of legal obligation language."""
        text = "The payer has a legal obligation to cover this claim."
        self.assertFalse(LanguageFilter.validate_text(text))
    
    def test_forbidden_entitlement(self):
        """Test detection of entitlement language."""
        text = "The patient is entitled to this coverage."
        self.assertFalse(LanguageFilter.validate_text(text))
    
    def test_forbidden_guarantee(self):
        """Test detection of guarantee language."""
        text = "This appeal will guarantee approval."
        self.assertFalse(LanguageFilter.validate_text(text))
    
    def test_valid_procedural_language(self):
        """Test acceptance of procedural language."""
        text = "This appeal is submitted in accordance with plan procedures."
        self.assertTrue(LanguageFilter.validate_text(text))
    
    def test_valid_neutral_language(self):
        """Test acceptance of neutral language."""
        text = "This submission requests reconsideration of the denial determination."
        self.assertTrue(LanguageFilter.validate_text(text))
    
    def test_case_insensitive(self):
        """Test case-insensitive detection."""
        text = "This is MEDICALLY NECESSARY treatment."
        self.assertFalse(LanguageFilter.validate_text(text))


if __name__ == '__main__':
    unittest.main()
