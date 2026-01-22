"""Tests for deterministic rule engine."""
import unittest
from datetime import datetime, timedelta
from app import app, db
from models import PayerRule, DenialCode, Appeal
from rule_engine import RuleEngine


class TestRuleEngine(unittest.TestCase):
    """Test rule engine validation logic."""
    
    def setUp(self):
        """Set up test database."""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = app.test_client()
        
        with app.app_context():
            db.create_all()
            self._seed_test_data()
    
    def tearDown(self):
        """Clean up test database."""
        with app.app_context():
            db.session.remove()
            db.drop_all()
    
    def _seed_test_data(self):
        """Seed test data."""
        # Add payer rule
        rule = PayerRule(
            payer_name='TestPayer',
            plan_type='commercial',
            appeal_deadline_days=180,
            max_appeal_levels=2,
            supports_portal=True,
            supports_fax=True,
            supports_mail=True
        )
        db.session.add(rule)
        
        # Add denial code
        code = DenialCode(
            code='16',
            code_type='CARC',
            description='Missing information',
            category='missing_documentation'
        )
        db.session.add(code)
        
        db.session.commit()
    
    def test_timely_filing_valid(self):
        """Test timely filing with valid deadline."""
        with app.app_context():
            denial_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            is_valid, deadline, message = RuleEngine._check_timely_filing(
                'TestPayer', 'commercial', denial_date
            )
            
            self.assertTrue(is_valid)
            self.assertIsNotNone(deadline)
    
    def test_timely_filing_expired(self):
        """Test timely filing with expired deadline."""
        with app.app_context():
            denial_date = (datetime.now() - timedelta(days=200)).strftime('%Y-%m-%d')
            
            is_valid, deadline, message = RuleEngine._check_timely_filing(
                'TestPayer', 'commercial', denial_date
            )
            
            self.assertFalse(is_valid)
            self.assertIn('HARD STOP', message)
    
    def test_appeal_level_valid(self):
        """Test appeal level within limits."""
        with app.app_context():
            is_valid, message = RuleEngine._check_appeal_level(
                'TestPayer', 'commercial', '1', 'TEST-CLAIM-001'
            )
            
            self.assertTrue(is_valid)
    
    def test_appeal_level_exhausted(self):
        """Test appeal level exceeds maximum."""
        with app.app_context():
            is_valid, message = RuleEngine._check_appeal_level(
                'TestPayer', 'commercial', '3', 'TEST-CLAIM-001'
            )
            
            self.assertFalse(is_valid)
            self.assertIn('exhausted', message)
    
    def test_duplicate_detection(self):
        """Test duplicate appeal detection."""
        with app.app_context():
            # Create existing appeal
            appeal = Appeal(
                appeal_id='TEST-001',
                payer_name='TestPayer',
                plan_type='commercial',
                claim_number='TEST-CLAIM-001',
                patient_id='PT001',
                provider_npi='1234567890',
                date_of_service=datetime.now().date(),
                denial_date=datetime.now().date(),
                denial_reason_codes='["16"]',
                submission_channel='fax',
                denial_category='missing_documentation',
                appeal_deadline=datetime.now().date(),
                deadline_compliant=True,
                submission_status='submitted',
                submission_timestamp=datetime.utcnow(),
                price_charged=10.00
            )
            db.session.add(appeal)
            db.session.commit()
            
            # Check for duplicate
            is_valid, message = RuleEngine._check_duplicate(
                'TEST-CLAIM-001', 'TestPayer'
            )
            
            self.assertFalse(is_valid)
            self.assertIn('Duplicate', message)
    
    def test_submission_channel_validation(self):
        """Test submission channel validation."""
        with app.app_context():
            # Valid channel
            is_valid, message = RuleEngine._validate_submission_channel(
                'TestPayer', 'commercial', 'fax'
            )
            self.assertTrue(is_valid)
            
            # Invalid channel
            is_valid, message = RuleEngine._validate_submission_channel(
                'TestPayer', 'commercial', 'invalid'
            )
            self.assertFalse(is_valid)
    
    def test_denial_classification(self):
        """Test denial code classification."""
        with app.app_context():
            category = RuleEngine.classify_denial(['16'])
            self.assertEqual(category, 'missing_documentation')


if __name__ == '__main__':
    unittest.main()
