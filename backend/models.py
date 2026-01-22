"""Database models."""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Appeal(db.Model):
    """Immutable appeal execution record."""
    
    __tablename__ = 'appeals'
    
    # Primary identifier
    id = db.Column(db.Integer, primary_key=True)
    appeal_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Intake data
    payer_name = db.Column(db.String(200), nullable=False)
    plan_type = db.Column(db.String(50), nullable=False)  # commercial, medicare, medicaid
    claim_number = db.Column(db.String(100), nullable=False, index=True)
    patient_id = db.Column(db.String(100), nullable=False)
    provider_npi = db.Column(db.String(20), nullable=False)
    date_of_service = db.Column(db.Date, nullable=False)
    denial_date = db.Column(db.Date, nullable=False)
    denial_reason_codes = db.Column(db.Text, nullable=False)  # JSON array as string
    appeal_level = db.Column(db.String(50))
    submission_channel = db.Column(db.String(50), nullable=False)  # portal, fax, mail
    
    # Classification
    denial_category = db.Column(db.String(100), nullable=False)
    
    # Execution metadata
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    appeal_deadline = db.Column(db.Date, nullable=False)
    deadline_compliant = db.Column(db.Boolean, nullable=False)
    
    # Submission
    submission_timestamp = db.Column(db.DateTime)
    submission_method = db.Column(db.String(50))
    submission_status = db.Column(db.String(50), nullable=False)  # prepared, submitted, failed
    
    # Generated artifacts
    appeal_letter_path = db.Column(db.String(500))
    attachment_checklist_path = db.Column(db.String(500))
    
    # Audit
    rules_applied = db.Column(db.Text)  # JSON as string
    execution_log = db.Column(db.Text)  # JSON as string
    
    # Pricing
    price_charged = db.Column(db.Numeric(10, 2), nullable=False)
    
    def __repr__(self):
        return f'<Appeal {self.appeal_id}>'


class PayerRule(db.Model):
    """Payer-specific rules for deterministic execution."""
    
    __tablename__ = 'payer_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    payer_name = db.Column(db.String(200), nullable=False, index=True)
    plan_type = db.Column(db.String(50), nullable=False)
    
    # Timely filing
    appeal_deadline_days = db.Column(db.Integer, nullable=False)
    
    # Appeal levels
    max_appeal_levels = db.Column(db.Integer, nullable=False, default=2)
    
    # Submission channels
    supports_portal = db.Column(db.Boolean, default=False)
    supports_fax = db.Column(db.Boolean, default=True)
    supports_mail = db.Column(db.Boolean, default=True)
    
    # Required documents (JSON array as string)
    required_documents = db.Column(db.Text)
    
    # Special rules
    requires_resubmission = db.Column(db.Boolean, default=False)
    special_instructions = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('payer_name', 'plan_type', name='unique_payer_plan'),
    )
    
    def __repr__(self):
        return f'<PayerRule {self.payer_name} - {self.plan_type}>'


class DenialCode(db.Model):
    """Denial reason code taxonomy."""
    
    __tablename__ = 'denial_codes'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    code_type = db.Column(db.String(20), nullable=False)  # CARC, RARC
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    
    # Category values:
    # - timely_filing
    # - missing_documentation
    # - coding_billing_error
    # - authorization_related
    # - administrative_eligibility
    # - duplicate_already_adjudicated
    
    def __repr__(self):
        return f'<DenialCode {self.code}>'
