"""Seed database with initial payer rules and denial codes."""
import json
from app import app, db
from models import PayerRule, DenialCode


def seed_payer_rules():
    """Seed common payer rules."""
    rules = [
        {
            'payer_name': 'UnitedHealthcare',
            'plan_type': 'commercial',
            'appeal_deadline_days': 180,
            'max_appeal_levels': 2,
            'supports_portal': True,
            'supports_fax': True,
            'supports_mail': True,
            'required_documents': ['Original denial letter', 'Claim form', 'Medical records', 'Itemized bill']
        },
        {
            'payer_name': 'UnitedHealthcare',
            'plan_type': 'medicare',
            'appeal_deadline_days': 120,
            'max_appeal_levels': 2,
            'supports_portal': True,
            'supports_fax': True,
            'supports_mail': True,
            'required_documents': ['Original denial letter', 'Claim form', 'Medical records', 'Medicare card copy']
        },
        {
            'payer_name': 'Anthem Blue Cross',
            'plan_type': 'commercial',
            'appeal_deadline_days': 180,
            'max_appeal_levels': 2,
            'supports_portal': True,
            'supports_fax': True,
            'supports_mail': True,
            'required_documents': ['Original denial letter', 'Claim form', 'Medical records', 'Itemized bill']
        },
        {
            'payer_name': 'Aetna',
            'plan_type': 'commercial',
            'appeal_deadline_days': 180,
            'max_appeal_levels': 2,
            'supports_portal': True,
            'supports_fax': True,
            'supports_mail': True,
            'required_documents': ['Original denial letter', 'Claim form', 'Medical records', 'Itemized bill']
        },
        {
            'payer_name': 'Cigna',
            'plan_type': 'commercial',
            'appeal_deadline_days': 180,
            'max_appeal_levels': 2,
            'supports_portal': False,
            'supports_fax': True,
            'supports_mail': True,
            'required_documents': ['Original denial letter', 'Claim form', 'Medical records', 'Itemized bill']
        },
        {
            'payer_name': 'Medicare',
            'plan_type': 'medicare',
            'appeal_deadline_days': 120,
            'max_appeal_levels': 5,
            'supports_portal': False,
            'supports_fax': True,
            'supports_mail': True,
            'required_documents': ['Original denial letter', 'Claim form', 'Medical records', 'Medicare card copy']
        },
        {
            'payer_name': 'Medicaid',
            'plan_type': 'medicaid',
            'appeal_deadline_days': 60,
            'max_appeal_levels': 2,
            'supports_portal': False,
            'supports_fax': True,
            'supports_mail': True,
            'required_documents': ['Original denial letter', 'Claim form', 'Medical records', 'Medicaid card copy']
        }
    ]
    
    for rule_data in rules:
        existing = PayerRule.query.filter_by(
            payer_name=rule_data['payer_name'],
            plan_type=rule_data['plan_type']
        ).first()
        
        if not existing:
            rule = PayerRule(
                payer_name=rule_data['payer_name'],
                plan_type=rule_data['plan_type'],
                appeal_deadline_days=rule_data['appeal_deadline_days'],
                max_appeal_levels=rule_data['max_appeal_levels'],
                supports_portal=rule_data['supports_portal'],
                supports_fax=rule_data['supports_fax'],
                supports_mail=rule_data['supports_mail'],
                required_documents=json.dumps(rule_data['required_documents'])
            )
            db.session.add(rule)
    
    db.session.commit()
    print(f"Seeded {len(rules)} payer rules")


def seed_denial_codes():
    """Seed common denial reason codes."""
    codes = [
        # Timely filing
        {'code': '29', 'code_type': 'CARC', 'description': 'The time limit for filing has expired', 'category': 'timely_filing'},
        {'code': 'B7', 'code_type': 'CARC', 'description': 'This provider was not certified/eligible to be paid for this procedure/service on this date of service', 'category': 'timely_filing'},
        
        # Missing documentation
        {'code': '16', 'code_type': 'CARC', 'description': 'Claim/service lacks information or has submission/billing error(s)', 'category': 'missing_documentation'},
        {'code': 'M80', 'code_type': 'RARC', 'description': 'Missing/incomplete/invalid documentation', 'category': 'missing_documentation'},
        {'code': 'M124', 'code_type': 'RARC', 'description': 'Missing/incomplete/invalid name, strength, or dosage of the drug furnished', 'category': 'missing_documentation'},
        
        # Coding/billing error
        {'code': '4', 'code_type': 'CARC', 'description': 'The procedure code is inconsistent with the modifier used', 'category': 'coding_billing_error'},
        {'code': '11', 'code_type': 'CARC', 'description': 'The diagnosis is inconsistent with the procedure', 'category': 'coding_billing_error'},
        {'code': '97', 'code_type': 'CARC', 'description': 'The benefit for this service is included in the payment/allowance for another service/procedure', 'category': 'coding_billing_error'},
        {'code': '234', 'code_type': 'CARC', 'description': 'This procedure is not paid separately', 'category': 'coding_billing_error'},
        
        # Authorization related
        {'code': '50', 'code_type': 'CARC', 'description': 'These are non-covered services because this is not deemed a medical necessity', 'category': 'authorization_related'},
        {'code': '197', 'code_type': 'CARC', 'description': 'Precertification/authorization/notification absent', 'category': 'authorization_related'},
        {'code': 'N30', 'code_type': 'RARC', 'description': 'Missing/incomplete/invalid prior authorization or pre-certification number', 'category': 'authorization_related'},
        
        # Administrative/eligibility
        {'code': '26', 'code_type': 'CARC', 'description': 'Expenses incurred prior to coverage', 'category': 'administrative_eligibility'},
        {'code': '27', 'code_type': 'CARC', 'description': 'Expenses incurred after coverage terminated', 'category': 'administrative_eligibility'},
        {'code': '31', 'code_type': 'CARC', 'description': 'Patient cannot be identified as our insured', 'category': 'administrative_eligibility'},
        {'code': '41', 'code_type': 'CARC', 'description': 'Discount agreed to in Preferred Provider contract', 'category': 'administrative_eligibility'},
        
        # Duplicate/already adjudicated
        {'code': '18', 'code_type': 'CARC', 'description': 'Exact duplicate claim/service', 'category': 'duplicate_already_adjudicated'},
        {'code': '22', 'code_type': 'CARC', 'description': 'This care may be covered by another payer per coordination of benefits', 'category': 'duplicate_already_adjudicated'},
        {'code': 'B13', 'code_type': 'CARC', 'description': 'Previously paid. Payment for this claim/service may have been provided in a previous payment', 'category': 'duplicate_already_adjudicated'}
    ]
    
    for code_data in codes:
        existing = DenialCode.query.filter_by(code=code_data['code']).first()
        
        if not existing:
            code = DenialCode(
                code=code_data['code'],
                code_type=code_data['code_type'],
                description=code_data['description'],
                category=code_data['category']
            )
            db.session.add(code)
    
    db.session.commit()
    print(f"Seeded {len(codes)} denial codes")


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_payer_rules()
        seed_denial_codes()
        print("Database seeded successfully")
