from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Appeal(db.Model):
    __tablename__ = 'appeals'
    
    id = db.Column(db.Integer, primary_key=True)
    appeal_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Intake data
    payer_name = db.Column(db.String(200), nullable=False)
    claim_number = db.Column(db.String(100), nullable=False, index=True)
    patient_id = db.Column(db.String(100), nullable=False)
    provider_name = db.Column(db.String(200), nullable=False)
    provider_npi = db.Column(db.String(20), nullable=False)
    date_of_service = db.Column(db.Date, nullable=False)
    denial_reason = db.Column(db.Text, nullable=False)
    denial_code = db.Column(db.String(50))
    cpt_codes = db.Column(db.String(200))
    timely_filing_deadline = db.Column(db.Date)
    denial_letter_path = db.Column(db.String(500))
    
    # Status
    status = db.Column(db.String(50), nullable=False, default='pending')  # pending, paid, completed, failed
    payment_status = db.Column(db.String(50), default='unpaid')
    stripe_payment_intent_id = db.Column(db.String(200))
    
    # Generated files
    appeal_letter_path = db.Column(db.String(500))
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    paid_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Pricing
    price_charged = db.Column(db.Numeric(10, 2), nullable=False, default=10.00)
