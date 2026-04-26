"""
SQLAlchemy models for internal engine API only.
Maps to existing Supabase public.users and public.appeals (no schema changes).
Flask does not write to public.users (read-only User row for provider profile merge).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.dialects.postgresql import JSONB, UUID
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import ForeignKey, Integer, String, DateTime, Date, Text as SAText, Numeric

db = SQLAlchemy()


class User(db.Model):
    """public.users — read only for provider profile; Next.js/Supabase own writes."""

    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id: Any = db.Column(UUID(as_uuid=True), primary_key=True)
    email = db.Column(String(255), unique=True, nullable=False, index=True)
    is_paid = db.Column(db.Boolean, nullable=True)
    plan_limit = db.Column(db.Integer, nullable=False, default=0)
    appeals_generated_monthly = db.Column(db.Integer, nullable=False, default=0)

    provider_name = db.Column(String(200), nullable=True)
    provider_npi = db.Column(String(20), nullable=True)
    provider_address = db.Column(String(500), nullable=True)
    provider_phone = db.Column(String(50), nullable=True)
    provider_fax = db.Column(String(50), nullable=True)

    def __repr__(self):
        return f"<User {self.email}>"


class Appeal(db.Model):
    __tablename__ = "appeals"
    __table_args__ = {"schema": "public"}

    # Primary key: integer in Supabase (not UUID)
    id = db.Column(Integer, primary_key=True, autoincrement=True)
    appeal_id = db.Column(String(50), unique=True, nullable=False, index=True)
    user_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("public.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    payer = db.Column(String(200), nullable=False)
    payer_name = db.Column(db.Text, nullable=True)
    claim_number = db.Column(String(100), nullable=False, index=True)
    patient_id = db.Column(String(100), nullable=False)
    provider_name = db.Column(String(200), nullable=False)
    provider_npi = db.Column(String(20), nullable=False)
    date_of_service = db.Column(db.Date, nullable=False)
    denial_reason = db.Column(SAText, nullable=False)
    denial_code = db.Column(String(50), nullable=True)
    diagnosis_code = db.Column(String(100), nullable=True)
    cpt_codes = db.Column(String(200), nullable=True)
    billed_amount = db.Column(Numeric(10, 2), default=0.00)
    timely_filing_deadline = db.Column(db.Date, nullable=True)
    denial_letter_path = db.Column(String(500), nullable=True)
    appeal_level = db.Column(String(50), default="level_1")
    credit_used = db.Column(db.Boolean, nullable=False, default=False)
    generation_count = db.Column(db.Integer, nullable=False, default=0)
    last_generated_at = db.Column(DateTime, nullable=True)
    retail_token_used = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(String(50), nullable=False, default="pending")
    payment_status = db.Column(String(50), default="unpaid")
    stripe_payment_intent_id = db.Column(String(200), nullable=True)
    appeal_letter_path = db.Column(String(500), nullable=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    paid_at = db.Column(DateTime, nullable=True)
    completed_at = db.Column(DateTime, nullable=True)
    price_charged = db.Column(Numeric(10, 2), nullable=False, default=10.00)
    ai_quality_score = db.Column(db.Integer, nullable=True)
    ai_citation_count = db.Column(db.Integer, nullable=True)
    ai_word_count = db.Column(db.Integer, nullable=True)
    ai_model_used = db.Column(String(50), nullable=True)
    ai_generation_method = db.Column(String(50), nullable=True)
    outcome_status = db.Column(String(50), nullable=True)
    outcome_date = db.Column(db.Date, nullable=True)
    outcome_amount_recovered = db.Column(Numeric(10, 2), nullable=True)
    outcome_notes = db.Column(SAText, nullable=True)
    outcome_updated_at = db.Column(DateTime, nullable=True)
    queue_status = db.Column(String(50), nullable=False, default="pending")
    queue_notes = db.Column(SAText, nullable=True)
    generated_letter_text = db.Column(SAText, nullable=True)
    appeal_tracking_status = db.Column(String(50), default="pending")
    tracking_updated_at = db.Column(DateTime, nullable=True)
    payer_fax = db.Column(String(50), nullable=True)
    appeal_generation_kind = db.Column(String(20), default="initial")
    submitted_to_payer_at = db.Column(DateTime, nullable=True)
    prior_submission_date = db.Column(db.Date, nullable=True)
    intelligence_snapshot_json = db.Column(JSONB, nullable=True)
    denial_prediction_score = db.Column(db.Integer, nullable=True)
    fix_status = db.Column(String(32), default="none")
    resubmission_ready = db.Column(db.Boolean, nullable=False, default=False)
    corrected_claim_json = db.Column(JSONB, nullable=True)
    resubmission_package_json = db.Column(JSONB, nullable=True)

    def __repr__(self):
        return f"<Appeal {self.appeal_id}>"
