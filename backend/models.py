from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    stripe_customer_id = db.Column(db.String(255), unique=True, index=True)
    subscription_tier = db.Column(db.String(50))  # starter, growth, pro, or null
    credit_balance = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    appeals = db.relationship('Appeal', backref='user', lazy=True)
    
    def __repr__(self):
        return f'<User {self.email}>'

class SubscriptionPlan(db.Model):
    __tablename__ = 'subscription_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # starter, growth, pro
    monthly_price = db.Column(db.Numeric(10, 2), nullable=False)
    included_credits = db.Column(db.Integer, nullable=False)
    overage_price = db.Column(db.Numeric(10, 2), nullable=False)
    stripe_price_id = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
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
    
    def __repr__(self):
        return f'<Appeal {self.appeal_id}>'
