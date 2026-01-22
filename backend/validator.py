from datetime import datetime, date
from models import db, Appeal

def validate_timely_filing(deadline):
    """Check if timely filing deadline has not passed"""
    if not deadline:
        return True
    return date.today() <= deadline

def check_duplicate(claim_number, payer_name):
    """Check for duplicate appeals in last 90 days"""
    existing = Appeal.query.filter_by(
        claim_number=claim_number,
        payer_name=payer_name
    ).filter(
        Appeal.status.in_(['pending', 'paid', 'completed'])
    ).first()
    
    return existing is not None
