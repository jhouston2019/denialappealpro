from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB

db = SQLAlchemy()


class ReferralPartner(db.Model):
    """Partner referral codes (?ref=) — track signups and downstream appeal usage."""

    __tablename__ = 'referral_partners'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<ReferralPartner {self.code}>'


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    stripe_customer_id = db.Column(db.String(255), unique=True, index=True)
    subscription_tier = db.Column(db.String(50))  # starter, core, scale, or null
    
    # SEPARATED CREDIT POOLS - subscription resets, bulk accumulates
    subscription_credits = db.Column(db.Integer, default=0, nullable=False)
    bulk_credits = db.Column(db.Integer, default=0, nullable=False)
    
    # USAGE TRACKING - for usage-based pricing
    appeals_generated_monthly = db.Column(db.Integer, default=0, nullable=False)
    appeals_generated_weekly = db.Column(db.Integer, default=0, nullable=False)
    appeals_generated_today = db.Column(db.Integer, default=0, nullable=False)
    
    # USAGE RESET TRACKING
    last_monthly_reset = db.Column(db.Date)
    last_weekly_reset = db.Column(db.Date)
    last_daily_reset = db.Column(db.Date)
    
    # PLAN LIMITS - cached from subscription tier
    plan_limit = db.Column(db.Integer, default=0, nullable=False)
    
    # OVERAGE TRACKING
    overage_count = db.Column(db.Integer, default=0, nullable=False)
    
    # BILLING STATUS
    billing_status = db.Column(db.String(50), default='active')  # active, suspended, cancelled
    
    # DEPRECATED - kept for backward compatibility, computed property
    @property
    def credit_balance(self):
        """Total credits = subscription + bulk"""
        return self.subscription_credits + self.bulk_credits
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # App login (optional — email/password for queue & persistence)
    password_hash = db.Column(db.String(255), nullable=True)
    last_queue_visit_at = db.Column(db.DateTime, nullable=True)
    last_active_at = db.Column(db.DateTime, nullable=True)
    email_retention_opt_in = db.Column(db.Boolean, default=True, nullable=False)

    # Acquisition: 3 free generations for users without an active subscription (tracked per account)
    free_trial_generations_used = db.Column(db.Integer, default=0, nullable=False)
    referred_by_id = db.Column(db.Integer, db.ForeignKey('referral_partners.id'), nullable=True, index=True)

    # Relationships
    appeals = db.relationship('Appeal', backref='user', lazy=True)
    referral_partner = db.relationship('ReferralPartner', backref=db.backref('referred_users', lazy='dynamic'))
    
    def __repr__(self):
        return f'<User {self.email}>'

class SubscriptionPlan(db.Model):
    __tablename__ = 'subscription_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # starter, core, scale
    monthly_price = db.Column(db.Numeric(10, 2), nullable=False)
    included_credits = db.Column(db.Integer, nullable=False)
    overage_price = db.Column(db.Numeric(10, 2), nullable=False)
    stripe_price_id = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    @property
    def included_appeals(self):
        """Alias for included_credits - for usage-based model"""
        return self.included_credits
    
    def __repr__(self):
        return f'<SubscriptionPlan {self.name}>'

class CreditPack(db.Model):
    __tablename__ = 'credit_packs'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    credits = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stripe_price_id = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<CreditPack {self.name} - {self.credits} credits>'

class ProcessedWebhookEvent(db.Model):
    __tablename__ = 'processed_webhook_events'
    
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    event_type = db.Column(db.String(100), nullable=False)
    processed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ProcessedWebhookEvent {self.event_id}>'

class Admin(db.Model):
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Admin {self.username}>'

class Appeal(db.Model):
    __tablename__ = 'appeals'
    
    id = db.Column(db.Integer, primary_key=True)
    appeal_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # User relationship
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Intake data
    payer = db.Column(db.String(200), nullable=False)  # Renamed from payer_name for consistency
    claim_number = db.Column(db.String(100), nullable=False, index=True)
    patient_id = db.Column(db.String(100), nullable=False)
    provider_name = db.Column(db.String(200), nullable=False)
    provider_npi = db.Column(db.String(20), nullable=False)
    date_of_service = db.Column(db.Date, nullable=False)
    denial_reason = db.Column(db.Text, nullable=False)
    denial_code = db.Column(db.String(50))
    diagnosis_code = db.Column(db.String(100))
    cpt_codes = db.Column(db.String(200))
    billed_amount = db.Column(db.Numeric(10, 2), default=0.00)
    timely_filing_deadline = db.Column(db.Date)
    denial_letter_path = db.Column(db.String(500))
    
    # Appeal level
    appeal_level = db.Column(db.String(50), default='level_1')  # level_1, level_2, external_review
    
    # Credit tracking
    credit_used = db.Column(db.Boolean, default=False, nullable=False)
    
    # Generation tracking - PREVENT ABUSE
    generation_count = db.Column(db.Integer, default=0, nullable=False)
    last_generated_at = db.Column(db.DateTime)
    retail_token_used = db.Column(db.Boolean, default=False, nullable=False)
    
    # Status
    status = db.Column(db.String(50), nullable=False, default='pending')  # pending, paid, completed, failed
    payment_status = db.Column(db.String(50), default='unpaid')
    stripe_payment_intent_id = db.Column(db.String(200))
    
    # Generated files
    appeal_letter_path = db.Column(db.String(500))
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    paid_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Pricing
    price_charged = db.Column(db.Numeric(10, 2), nullable=False, default=10.00)
    
    # AI Quality Metrics
    ai_quality_score = db.Column(db.Integer)  # 0-100 score from validation
    ai_citation_count = db.Column(db.Integer)  # Number of regulatory/clinical citations
    ai_word_count = db.Column(db.Integer)  # Word count of generated appeal
    ai_model_used = db.Column(db.String(50))  # e.g., "gpt-4-turbo-preview"
    ai_generation_method = db.Column(db.String(50))  # "chain_of_thought" or "direct"
    
    # Outcome Tracking
    outcome_status = db.Column(db.String(50))  # approved, partially_approved, denied, pending_review, withdrawn
    outcome_date = db.Column(db.Date)  # Date of final outcome
    outcome_amount_recovered = db.Column(db.Numeric(10, 2))  # Amount recovered if approved
    outcome_notes = db.Column(db.Text)  # Additional outcome details
    outcome_updated_at = db.Column(db.DateTime)  # Last outcome update timestamp
    
    # Denial queue workflow (operational status — separate from payment status)
    queue_status = db.Column(db.String(50), nullable=False, default='pending')
    queue_notes = db.Column(db.Text)
    generated_letter_text = db.Column(db.Text)  # Draft / edited appeal body for PDF regen

    # Provider tracking dashboard (submission lifecycle — separate from queue_status)
    appeal_tracking_status = db.Column(db.String(50), nullable=True, default='pending', index=True)
    tracking_updated_at = db.Column(db.DateTime, nullable=True)
    payer_fax = db.Column(db.String(50), nullable=True)

    # Recovery / follow-up intelligence
    appeal_generation_kind = db.Column(db.String(20), nullable=True, default='initial')  # initial | follow_up
    submitted_to_payer_at = db.Column(db.DateTime, nullable=True, index=True)
    prior_submission_date = db.Column(db.Date, nullable=True)

    # Pre-generation coding intelligence snapshot (analytics / future outcome linkage)
    intelligence_snapshot_json = db.Column(JSONB, nullable=True)

    # Denial prediction + auto-fix / resubmission (API ingest & recovery workflow)
    denial_prediction_score = db.Column(db.Integer, nullable=True)  # 0-100
    fix_status = db.Column(db.String(32), nullable=True, default='none')  # none | pending | applied | needs_review
    resubmission_ready = db.Column(db.Boolean, nullable=False, default=False)
    corrected_claim_json = db.Column(JSONB, nullable=True)
    resubmission_package_json = db.Column(JSONB, nullable=True)
    
    def __repr__(self):
        return f'<Appeal {self.appeal_id}>'


class CodingIntelligenceLog(db.Model):
    """Feedback loop: coding checks, modifiers, risk — for future tuning (no UI)."""

    __tablename__ = 'coding_intelligence_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    appeal_id = db.Column(db.String(50), nullable=True, index=True)
    event_type = db.Column(db.String(40), nullable=False, default='analyze')
    payload_json = db.Column(db.Text, nullable=False)
    risk_level = db.Column(db.String(20), nullable=True)
    coding_issue_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f'<CodingIntelligenceLog {self.id}>'


class RetentionEmailLog(db.Model):
    """Dedupe retention / reactivation sends per user + campaign + calendar day."""
    __tablename__ = 'retention_email_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    campaign = db.Column(db.String(64), nullable=False)
    sent_day = db.Column(db.Date, nullable=False)
    sent_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'campaign', 'sent_day', name='uq_retention_user_campaign_day'),
    )


class ClaimStatusEvent(db.Model):
    __tablename__ = 'claim_status_events'
    
    id = db.Column(db.Integer, primary_key=True)
    appeal_db_id = db.Column(db.Integer, db.ForeignKey('appeals.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    event_type = db.Column(db.String(80), nullable=False)
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    appeal = db.relationship('Appeal', backref=db.backref('status_events', lazy='dynamic'))
    
    def __repr__(self):
        return f'<ClaimStatusEvent {self.event_type} appeal={self.appeal_db_id}>'
