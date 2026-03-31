"""
Customer auth + denial queue API (login persistence, batch intake, status workflow).
"""

import csv
import io
import json
import os
import re
import shutil
import tempfile
import uuid
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import Blueprint, request, jsonify, g, current_app, send_file
from werkzeug.utils import secure_filename

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, OperationalError

from models import db, User, Appeal, ClaimStatusEvent, ReferralPartner
from user_auth import register_user, login_user, verify_user_token
from credit_manager import CreditManager
from stripe_billing import StripeBilling
from retention_service import dashboard_metrics as retention_dashboard_metrics
from batch_appeals_worker import (
    start_batch_job,
    start_batch_job_from_rows,
    start_pdf_batch_job,
    get_job,
    MAX_BATCH_ROWS,
    MAX_PDF_BATCH_FILES,
)
from denial_analytics import compute_recovery_dashboard
from follow_up_appeal import generate_follow_up_letter_text, should_generate_follow_up
from appeal_automation import AppealAutomationHooks
from appeal_bundle import (
    build_export_zip_bytes,
    get_appeal_pdf_bytes_from_model,
    merge_fax_then_appeal,
)
from appeal_pdf_builder import build_appeal_pdf_filename
from fax_cover_sheet import build_fax_cover_filename, generate_fax_cover_pdf_bytes
from claim_recovery import apply_pipeline_to_appeal, autoFixClaim, prepareResubmission, predictDenialScore

TRACKING_STATUSES = frozenset({'generated', 'submitted', 'pending', 'approved', 'denied'})

customer_bp = Blueprint('customer', __name__)


def _generator():
    return current_app.extensions.get('appeal_generator')


def _append_event(appeal_db_id: int, user_id: int, event_type: str, message: str = None):
    ev = ClaimStatusEvent(
        appeal_db_id=appeal_db_id,
        user_id=user_id,
        event_type=event_type,
        message=message,
    )
    db.session.add(ev)


def _appeal_to_queue_row(a: Appeal):
    amt = float(a.billed_amount) if a.billed_amount is not None else 0.0
    reason = (a.denial_reason or '')[:120]
    if len(a.denial_reason or '') > 120:
        reason += '…'
    fu_ok, _fu_reason = should_generate_follow_up(a)
    return {
        'id': a.id,
        'appeal_id': a.appeal_id,
        'claim_id': a.claim_number,
        'payer': getattr(a, 'payer', None) or getattr(a, 'payer_name', ''),
        'amount': amt,
        'denial_reason': a.denial_reason or '',
        'denial_reason_preview': reason,
        'queue_status': a.queue_status or 'pending',
        'payment_status': (a.payment_status or 'unpaid').lower(),
        'status': a.status,
        'created_at': a.created_at.isoformat() if a.created_at else None,
        'has_letter': bool(a.appeal_letter_path),
        'appeal_date': a.last_generated_at.isoformat() if a.last_generated_at else None,
        'date_of_service': a.date_of_service.isoformat() if a.date_of_service else None,
        'appeal_tracking_status': getattr(a, 'appeal_tracking_status', None) or 'pending',
        'tracking_updated_at': a.tracking_updated_at.isoformat() if getattr(a, 'tracking_updated_at', None) else None,
        'payer_fax': getattr(a, 'payer_fax', None),
        'appeal_generation_kind': getattr(a, 'appeal_generation_kind', None) or 'initial',
        'submitted_to_payer_at': a.submitted_to_payer_at.isoformat()
        if getattr(a, 'submitted_to_payer_at', None)
        else None,
        'denial_prediction_score': getattr(a, 'denial_prediction_score', None),
        'fix_status': getattr(a, 'fix_status', None) or 'none',
        'resubmission_ready': bool(getattr(a, 'resubmission_ready', False)),
        'follow_up_eligible': fu_ok,
    }


def _appeal_detail(a: Appeal):
    events = (
        ClaimStatusEvent.query.filter_by(appeal_db_id=a.id)
        .order_by(ClaimStatusEvent.created_at.asc())
        .all()
    )
    fu_ok, fu_reason = should_generate_follow_up(a)
    return {
        **_appeal_to_queue_row(a),
        'patient_id': a.patient_id,
        'provider_name': a.provider_name,
        'provider_npi': a.provider_npi,
        'date_of_service': a.date_of_service.isoformat() if a.date_of_service else None,
        'denial_code': a.denial_code,
        'diagnosis_code': a.diagnosis_code,
        'cpt_codes': a.cpt_codes,
        'timely_filing_deadline': a.timely_filing_deadline.isoformat() if a.timely_filing_deadline else None,
        'appeal_level': a.appeal_level,
        'generated_letter_text': a.generated_letter_text,
        'queue_notes': a.queue_notes,
        'outcome_status': a.outcome_status,
        'outcome_amount_recovered': float(a.outcome_amount_recovered) if a.outcome_amount_recovered else None,
        'outcome_notes': a.outcome_notes,
        'prior_submission_date': a.prior_submission_date.isoformat()
        if getattr(a, 'prior_submission_date', None)
        else None,
        'follow_up_eligible': fu_ok,
        'follow_up_reason': fu_reason,
        'denial_prediction_score': getattr(a, 'denial_prediction_score', None),
        'fix_status': getattr(a, 'fix_status', None) or 'none',
        'resubmission_ready': bool(getattr(a, 'resubmission_ready', False)),
        'history': [
            {
                'id': e.id,
                'event_type': e.event_type,
                'message': e.message,
                'created_at': e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
    }


def require_customer_auth(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        secret = current_app.config['SECRET_KEY']
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        token = auth[7:].strip()
        data = verify_user_token(secret, token)
        if not data:
            return jsonify({'error': 'Invalid or expired session'}), 401
        g.current_user_id = data['uid']
        g.current_user_email = data['email']
        _touch_activity(g.current_user_id)
        return f(*args, **kwargs)

    return wrapped


def _touch_activity(user_id: int) -> None:
    try:
        u = User.query.get(user_id)
        if u:
            u.last_active_at = datetime.utcnow()
            db.session.commit()
    except Exception:
        db.session.rollback()


def _new_denials_since_visit(user: User):
    """Count and $ sum of claims created after last queue visit (or all if never visited)."""
    if user.last_queue_visit_at:
        q = Appeal.query.filter(
            Appeal.user_id == user.id,
            Appeal.created_at > user.last_queue_visit_at,
        )
    else:
        q = Appeal.query.filter_by(user_id=user.id)
    rows = q.all()
    total = sum(float(r.billed_amount or 0) for r in rows)
    return len(rows), round(total, 2)


def _post_generation_payload(appeal: Appeal, usage_stats: dict) -> dict:
    amt = float(appeal.billed_amount or 0)
    recovery = round(amt * 0.35, 2)
    return {
        'claim_amount': amt,
        'recovery_potential_estimate': recovery,
        'free_trial_used': usage_stats.get('free_trial_used'),
        'free_trial_remaining': usage_stats.get('free_trial_remaining'),
    }


def _parse_ingest_date(dos_raw, defaults):
    if dos_raw:
        try:
            return datetime.strptime(str(dos_raw)[:10], '%Y-%m-%d').date()
        except ValueError:
            try:
                return datetime.strptime(str(dos_raw)[:10], '%m/%d/%Y').date()
            except ValueError:
                pass
    d = defaults.get('date_of_service') if isinstance(defaults, dict) else None
    if d:
        try:
            return datetime.strptime(str(d)[:10], '%Y-%m-%d').date()
        except ValueError:
            pass
    return date.today()


def _parse_denial_codes_list(raw):
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip()]
    s = str(raw).strip()
    if not s:
        return []
    return [p.strip() for p in re.split(r'[,;\s]+', s) if p.strip()]


def _build_pipeline_payload_from_ingest(data, defaults):
    cpt = str(data.get('cpt_codes') or data.get('cptCodes') or '').strip()
    icd = str(data.get('icd_codes') or data.get('icdCodes') or '').strip()
    mods = str(data.get('modifiers') or '').strip()
    denial_codes = data.get('denial_codes') or data.get('denial_code') or ''
    carc = _parse_denial_codes_list(denial_codes)
    payer = str(data.get('payer') or '').strip()
    dr = str(data.get('denial_reason') or (defaults or {}).get('denial_reason') or '').strip()
    if not dr:
        dr = f"Imported denial: {denial_codes}" if denial_codes else 'API ingest — review denial codes'
    return {
        'cpt_codes': cpt,
        'cptCodes': cpt,
        'icd_codes': icd,
        'icdCodes': icd,
        'diagnosis_code': icd,
        'modifiers': mods,
        'denial_codes': str(denial_codes),
        'denial_code': str(data.get('denial_code') or (carc[0] if carc else '') or '')[:50],
        'denial_reason': dr,
        'carcCodes': carc,
        'payer': payer,
        'planType': str(data.get('plan_type') or data.get('planType') or (defaults or {}).get('plan_type') or ''),
    }


def _appeal_to_pipeline_dict(a: Appeal):
    carc = _parse_denial_codes_list(f"{a.denial_code or ''} {a.denial_reason or ''}")
    return {
        'cpt_codes': a.cpt_codes or '',
        'icd_codes': a.diagnosis_code or '',
        'diagnosis_code': a.diagnosis_code or '',
        'modifiers': '',
        'denial_codes': a.denial_code or '',
        'denial_code': a.denial_code or '',
        'denial_reason': a.denial_reason or '',
        'carcCodes': carc,
        'payer': a.payer or '',
    }


def init_customer_portal(app, limiter, generator):
    app.extensions['appeal_generator'] = generator

    limit = limiter.limit

    @customer_bp.route('/auth/register', methods=['POST'])
    @limit('20 per day')
    def auth_register():
        try:
            data = request.get_json(silent=True) or {}
            ref = (data.get('referral_code') or data.get('ref') or '').strip() or None
            payload, err = register_user(
                app.config['SECRET_KEY'],
                data.get('email'),
                data.get('password'),
                referral_code=ref,
            )
            if err:
                return jsonify({'error': err}), 400
            return jsonify(payload), 201
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'An account with this email already exists'}), 400
        except OperationalError:
            db.session.rollback()
            current_app.logger.exception('auth_register database unavailable')
            return jsonify({'error': 'Service temporarily unavailable. Please try again in a few minutes.'}), 503
        except Exception:
            current_app.logger.exception('auth_register failed')
            return jsonify({'error': 'Registration failed. Please try again.'}), 500

    @customer_bp.route('/referral/validate', methods=['GET'])
    @limit('60 per hour')
    def referral_validate():
        code = (request.args.get('code') or '').strip().lower()
        if not code:
            return jsonify({'valid': False}), 400
        p = ReferralPartner.query.filter_by(code=code, is_active=True).first()
        if not p:
            return jsonify({'valid': False, 'code': code}), 200
        return jsonify({'valid': True, 'code': p.code, 'name': p.name}), 200

    @customer_bp.route('/referral/stats/<code>', methods=['GET'])
    @limit('30 per hour')
    def referral_stats(code):
        """Public partner metrics: signups and appeals from referred users."""
        code = (code or '').strip().lower()
        p = ReferralPartner.query.filter_by(code=code, is_active=True).first()
        if not p:
            return jsonify({'error': 'Unknown partner code'}), 404
        signup_count = User.query.filter_by(referred_by_id=p.id).count()
        appeal_count = (
            db.session.query(func.count(Appeal.id))
            .join(User, Appeal.user_id == User.id)
            .filter(User.referred_by_id == p.id)
            .scalar()
        ) or 0
        appeals_completed = (
            db.session.query(func.count(Appeal.id))
            .join(User, Appeal.user_id == User.id)
            .filter(User.referred_by_id == p.id, Appeal.status == 'completed')
            .scalar()
        ) or 0
        return jsonify(
            {
                'partner_code': p.code,
                'partner_name': p.name,
                'signups': signup_count,
                'appeals_created': appeal_count,
                'appeals_completed': appeals_completed,
            }
        ), 200

    @customer_bp.route('/auth/login', methods=['POST'])
    @limit('30 per hour')
    def auth_login():
        data = request.get_json(silent=True) or {}
        payload, err = login_user(app.config['SECRET_KEY'], data.get('email'), data.get('password'))
        if err:
            return jsonify({'error': err}), 401
        user = User.query.get(payload['user']['id'])
        if user:
            user.last_active_at = datetime.utcnow()
            db.session.commit()
        new_count, new_value = _new_denials_since_visit(user) if user else (0, 0.0)
        payload['new_denials_since_visit'] = new_count
        payload['new_denials_dollar_value'] = new_value
        return jsonify(payload), 200

    @customer_bp.route('/auth/me', methods=['GET'])
    @require_customer_auth
    def auth_me():
        user = User.query.get(g.current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        new_count, new_value = _new_denials_since_visit(user)
        return jsonify(
            {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'last_queue_visit_at': user.last_queue_visit_at.isoformat() if user.last_queue_visit_at else None,
                },
                'new_denials_since_visit': new_count,
                'new_denials_dollar_value': new_value,
            }
        ), 200

    @customer_bp.route('/auth/queue-viewed', methods=['POST'])
    @require_customer_auth
    def auth_queue_viewed():
        user = User.query.get(g.current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user.last_queue_visit_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True}), 200

    @customer_bp.route('/queue', methods=['GET'])
    @require_customer_auth
    def queue_list():
        q = Appeal.query.filter_by(user_id=g.current_user_id)
        search_q = (request.args.get('q') or '').strip()
        if search_q:
            q = q.filter(Appeal.claim_number.ilike(f'%{search_q}%'))
        payer_f = (request.args.get('payer') or '').strip()
        if payer_f:
            q = q.filter(Appeal.payer.ilike(f'%{payer_f}%'))
        status_f = (request.args.get('status') or '').strip().lower()
        if status_f:
            q = q.filter(Appeal.appeal_tracking_status == status_f)
        rows = q.order_by(Appeal.created_at.desc()).limit(500).all()
        return jsonify({'claims': [_appeal_to_queue_row(a) for a in rows]}), 200

    @customer_bp.route('/queue/metrics', methods=['GET'])
    @require_customer_auth
    def queue_metrics():
        uid = g.current_user_id
        today = date.today()
        claims = Appeal.query.filter_by(user_id=uid).all()
        total = len(claims)
        at_risk = sum(float(c.billed_amount or 0) for c in claims)
        processed_today = sum(
            1
            for c in claims
            if c.last_generated_at and c.last_generated_at.date() == today
        )
        added_today = sum(1 for c in claims if c.created_at and c.created_at.date() == today)
        recovered = sum(
            float(c.outcome_amount_recovered)
            for c in claims
            if c.outcome_amount_recovered is not None
        )
        estimated_recovered = sum(
            float(c.billed_amount or 0) * 0.35
            for c in claims
            if (c.queue_status in ('generated', 'submitted'))
            and (not c.outcome_amount_recovered or float(c.outcome_amount_recovered or 0) == 0)
        )
        display_recovered = round(recovered, 2) if recovered > 0 else round(estimated_recovered, 2)
        dash = retention_dashboard_metrics(uid)
        usage = CreditManager.get_usage_stats(uid)
        return jsonify(
            {
                'total_in_queue': total,
                'processed_today': processed_today,
                'added_today': added_today,
                'dollar_value_at_risk': round(at_risk, 2),
                'total_recovered': round(recovered, 2),
                'total_recovered_estimated': round(estimated_recovered, 2),
                'total_recovered_display': display_recovered,
                'revenue_at_risk': dash['revenue_at_risk'],
                'revenue_recovered': dash['revenue_recovered'],
                'appeals_processed': dash['appeals_processed'],
                'success_rate': dash['success_rate'],
                'usage': usage,
            }
        ), 200

    @customer_bp.route('/queue/<appeal_id>', methods=['GET'])
    @require_customer_auth
    def queue_detail(appeal_id):
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        return jsonify({'claim': _appeal_detail(a)}), 200

    @customer_bp.route('/queue/<appeal_id>', methods=['PATCH'])
    @require_customer_auth
    def queue_patch(appeal_id):
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        data = request.json or {}
        if 'queue_notes' in data:
            a.queue_notes = data.get('queue_notes') or ''
            _append_event(a.id, g.current_user_id, 'note_updated', 'Notes saved')
        if 'generated_letter_text' in data:
            a.generated_letter_text = data.get('generated_letter_text')
            _append_event(a.id, g.current_user_id, 'draft_edited', 'Appeal text updated')
        if 'queue_status' in data:
            new_s = (data.get('queue_status') or '').lower()
            allowed = {'pending', 'in_progress', 'generated', 'submitted'}
            if new_s in allowed:
                old = a.queue_status
                a.queue_status = new_s
                if new_s == 'submitted' and not getattr(a, 'submitted_to_payer_at', None):
                    a.submitted_to_payer_at = datetime.utcnow()
                _append_event(a.id, g.current_user_id, 'status_change', f'{old} → {new_s}')
        if 'payment_status' in data:
            ps = (data.get('payment_status') or '').lower()
            allowed_ps = {'pending', 'unpaid', 'submitted', 'paid'}
            if ps in allowed_ps:
                a.payment_status = ps
                _append_event(a.id, g.current_user_id, 'payment_status', ps)
        if 'payer_fax' in data:
            raw_f = (data.get('payer_fax') or '').strip()
            a.payer_fax = raw_f[:50] if raw_f else None
            _append_event(a.id, g.current_user_id, 'payer_fax_updated', 'Fax number saved')
        if 'appeal_tracking_status' in data:
            new_t = (data.get('appeal_tracking_status') or '').lower().strip()
            if new_t in TRACKING_STATUSES:
                old_t = getattr(a, 'appeal_tracking_status', None)
                a.appeal_tracking_status = new_t
                a.tracking_updated_at = datetime.utcnow()
                if new_t == 'submitted' and not getattr(a, 'submitted_to_payer_at', None):
                    a.submitted_to_payer_at = datetime.utcnow()
                _append_event(
                    a.id,
                    g.current_user_id,
                    'tracking_status',
                    f'{old_t} → {new_t}',
                )
                AppealAutomationHooks.on_tracking_status_change(a, old_t, new_t)
        db.session.commit()
        return jsonify({'claim': _appeal_detail(a)}), 200

    @customer_bp.route('/queue/<appeal_id>/generate', methods=['POST'])
    @limit('30 per hour')
    @require_customer_auth
    def queue_generate(appeal_id):
        generator = _generator()
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        if a.retail_token_used and a.status == 'completed':
            return jsonify({'error': 'Already generated'}), 400
        if a.status == 'completed':
            return jsonify({'error': 'Appeal already completed'}), 400

        user = User.query.get(g.current_user_id)
        allowed, _used_credit, used_free_trial = CreditManager.try_begin_generation(user.id)
        if not allowed:
            usage = CreditManager.get_usage_stats(user.id)
            return jsonify(
                {
                    'error': 'No credits, subscription, or free claims remaining',
                    'requires_payment': True,
                    'usage': usage,
                }
            ), 402

        a.queue_status = 'in_progress'
        a.generation_count = (a.generation_count or 0) + 1
        a.credit_used = True
        a.payment_status = 'free_trial' if used_free_trial else 'paid'
        a.status = 'paid'
        _append_event(a.id, g.current_user_id, 'generation_started', None)
        db.session.commit()

        try:
            pdf_path = generator.generate_appeal(a)
            a.appeal_letter_path = pdf_path
            a.status = 'completed'
            a.completed_at = datetime.utcnow()
            a.last_generated_at = datetime.utcnow()
            a.queue_status = 'generated'
            if not getattr(a, 'appeal_generation_kind', None):
                a.appeal_generation_kind = 'initial'
            a.appeal_tracking_status = 'generated'
            a.tracking_updated_at = datetime.utcnow()
            db.session.commit()
            AppealAutomationHooks.on_appeal_generated(a)
            CreditManager.increment_usage(user.id, used_free_trial=used_free_trial)
            usage_stats = CreditManager.get_usage_stats(user.id)
            sub_id = getattr(user, 'stripe_subscription_id', None)
            if (
                usage_stats.get('overage_count', 0) > 0
                and sub_id
                and not used_free_trial
            ):
                try:
                    StripeBilling.report_overage_usage(user.id, quantity=1)
                except Exception:
                    pass
            _append_event(a.id, g.current_user_id, 'generated', 'Appeal PDF generated')
            db.session.commit()
            return jsonify(
                {
                    'success': True,
                    'appeal_id': a.appeal_id,
                    'queue_status': a.queue_status,
                    'claim': _appeal_detail(a),
                    'usage_stats': usage_stats,
                    'post_generation': _post_generation_payload(a, usage_stats),
                }
            ), 200
        except Exception as e:
            a.status = 'failed'
            a.queue_status = 'pending'
            db.session.commit()
            _append_event(a.id, g.current_user_id, 'generation_failed', str(e))
            db.session.commit()
            return jsonify({'error': str(e)}), 500

    @customer_bp.route('/queue/<appeal_id>/rebuild-pdf', methods=['POST'])
    @limit('60 per hour')
    @require_customer_auth
    def queue_rebuild_pdf(appeal_id):
        generator = _generator()
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        if not (a.generated_letter_text or '').strip():
            return jsonify({'error': 'No draft text to render'}), 400
        try:
            pdf_path = generator.generate_appeal(a)
            a.appeal_letter_path = pdf_path
            a.last_generated_at = datetime.utcnow()
            db.session.commit()
            _append_event(a.id, g.current_user_id, 'pdf_rebuilt', 'PDF updated from draft')
            db.session.commit()
            return jsonify({'success': True, 'claim': _appeal_detail(a)}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @customer_bp.route('/analytics/recovery', methods=['GET'])
    @limit('120 per hour')
    @require_customer_auth
    def analytics_recovery():
        """Denial Insights + Payer Intelligence in one payload (fast single round-trip)."""
        uid = g.current_user_id
        q = Appeal.query.filter_by(user_id=uid)
        payload = compute_recovery_dashboard(uid, q)
        return jsonify(payload), 200

    @customer_bp.route('/queue/<appeal_id>/follow-up', methods=['POST'])
    @limit('20 per hour')
    @require_customer_auth
    def queue_follow_up(appeal_id):
        """Generate second-level (Level 2) appeal — uses one generation credit."""
        generator = _generator()
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        if not (a.generated_letter_text or '').strip():
            return jsonify({'error': 'Generate an initial appeal before creating a follow-up'}), 400
        data = request.get_json(silent=True) or {}
        days = int(data.get('days_no_response', 30) or 30)
        ok, msg = should_generate_follow_up(a, days_no_response=days)
        if not ok:
            return jsonify({'error': msg, 'follow_up_reason': msg}), 400

        user = User.query.get(g.current_user_id)
        allowed, _used_credit, used_free_trial = CreditManager.try_begin_generation(user.id)
        if not allowed:
            usage = CreditManager.get_usage_stats(user.id)
            return jsonify(
                {
                    'error': 'No credits, subscription, or free claims remaining',
                    'requires_payment': True,
                    'usage': usage,
                }
            ), 402

        if a.last_generated_at:
            a.prior_submission_date = a.last_generated_at.date()
        elif getattr(a, 'submitted_to_payer_at', None):
            a.prior_submission_date = a.submitted_to_payer_at.date()
        else:
            a.prior_submission_date = date.today()

        a.generated_letter_text = generate_follow_up_letter_text(a, a.appeal_tracking_status)
        a.appeal_level = 'level_2'
        a.appeal_generation_kind = 'follow_up'
        a.generation_count = (a.generation_count or 0) + 1
        a.queue_status = 'in_progress'
        _append_event(a.id, g.current_user_id, 'follow_up_started', 'Level 2 appeal draft created')
        db.session.commit()

        try:
            pdf_path = generator.generate_appeal(a)
            a.appeal_letter_path = pdf_path
            a.status = 'completed'
            a.completed_at = datetime.utcnow()
            a.last_generated_at = datetime.utcnow()
            a.queue_status = 'generated'
            a.tracking_updated_at = datetime.utcnow()
            db.session.commit()
            CreditManager.increment_usage(user.id, used_free_trial=used_free_trial)
            _append_event(a.id, g.current_user_id, 'follow_up_generated', 'Second-Level Appeal PDF generated')
            db.session.commit()
            AppealAutomationHooks.on_follow_up_generated(a)
            usage_stats = CreditManager.get_usage_stats(user.id)
            return jsonify(
                {
                    'success': True,
                    'claim': _appeal_detail(a),
                    'usage_stats': usage_stats,
                }
            ), 200
        except Exception as e:
            a.queue_status = 'generated'
            db.session.commit()
            return jsonify({'error': str(e)}), 500

    @customer_bp.route('/queue/batch', methods=['POST'])
    @limit('20 per hour')
    @require_customer_auth
    def queue_batch():
        uid = g.current_user_id
        defaults = {}
        rows = []

        if request.content_type and 'multipart/form-data' in request.content_type:
            defaults_raw = request.form.get('defaults')
            if defaults_raw:
                defaults = json.loads(defaults_raw)
            f = request.files.get('file')
            if not f:
                return jsonify({'error': 'Missing file'}), 400
            raw = f.read().decode('utf-8', errors='replace')
            reader = csv.DictReader(io.StringIO(raw))
            rows = list(reader)
        else:
            data = request.json or {}
            defaults = data.get('defaults') or {}
            rows = data.get('rows') or []

        if not rows:
            return jsonify({'error': 'No rows'}), 400

        def gval(row, key, alt_keys=()):
            if key in row and row[key] not in (None, ''):
                return row[key]
            for k in alt_keys:
                if k in row and row[k] not in (None, ''):
                    return row[k]
            return defaults.get(key)

        created = []
        errors = []

        for i, row in enumerate(rows):
            claim_number = str(gval(row, 'claim_number', ('claim_id', 'Claim ID', 'claim')) or '').strip()
            payer = str(gval(row, 'payer', ('Payer', 'insurance')) or '').strip()
            denial_reason = str(gval(row, 'denial_reason', ('Denial Reason', 'reason')) or '').strip()
            if not claim_number or not payer or not denial_reason:
                errors.append({'row': i + 1, 'error': 'claim_number, payer, denial_reason required'})
                continue

            patient_id = str(gval(row, 'patient_id', ('Patient ID',)) or defaults.get('patient_id') or 'TBD').strip()
            provider_name = str(gval(row, 'provider_name', ('Provider',)) or defaults.get('provider_name') or 'TBD').strip()
            provider_npi = str(gval(row, 'provider_npi', ('NPI',)) or defaults.get('provider_npi') or '0000000000').strip()
            dos_raw = gval(row, 'date_of_service', ('Date of Service', 'dos', 'service_date'))
            if dos_raw:
                try:
                    dos = datetime.strptime(str(dos_raw)[:10], '%Y-%m-%d').date()
                except ValueError:
                    try:
                        dos = datetime.strptime(str(dos_raw)[:10], '%m/%d/%Y').date()
                    except ValueError:
                        errors.append({'row': i + 1, 'error': 'Invalid date_of_service'})
                        continue
            else:
                dos = defaults.get('date_of_service')
                if dos:
                    dos = datetime.strptime(str(dos)[:10], '%Y-%m-%d').date()
                else:
                    dos = date.today()

            amt_raw = gval(row, 'billed_amount', ('Amount', 'amount', 'Billed Amount'))
            try:
                billed = Decimal(str(amt_raw)) if amt_raw not in (None, '') else Decimal('0')
            except (InvalidOperation, TypeError):
                billed = Decimal('0')

            paid_raw = gval(row, 'paid_amount', ('Paid', 'paid', 'Paid Amount'))
            paid_note = ''
            if paid_raw not in (None, ''):
                paid_note = f'Paid amount (import): {paid_raw}'

            dup = Appeal.query.filter_by(
                user_id=uid,
                claim_number=claim_number,
                payer=payer,
            ).filter(Appeal.status.in_(['pending', 'paid', 'completed'])).first()
            if dup:
                errors.append({'row': i + 1, 'error': f'Duplicate claim {claim_number} for payer'})
                continue

            appeal_id = f"APP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
            appeal = Appeal(
                appeal_id=appeal_id,
                user_id=uid,
                payer=payer,
                claim_number=claim_number,
                patient_id=patient_id,
                provider_name=provider_name,
                provider_npi=provider_npi,
                date_of_service=dos,
                denial_reason=denial_reason,
                denial_code=(str(gval(row, 'denial_code', ('Denial Code',)) or '')[:50] or None),
                diagnosis_code=(str(gval(row, 'diagnosis_code', ('ICD', 'diagnosis')) or '')[:100] or None),
                cpt_codes=(str(gval(row, 'cpt_codes', ('CPT',)) or '')[:200] or None),
                billed_amount=billed,
                appeal_level=str(defaults.get('appeal_level') or gval(row, 'appeal_level') or 'level_1'),
                status='pending',
                payment_status='unpaid',
                price_charged=current_app.config.get('PRICE_PER_APPEAL', 79),
                credit_used=False,
                queue_status='pending',
                queue_notes=paid_note or None,
            )
            db.session.add(appeal)
            db.session.flush()
            _append_event(appeal.id, uid, 'created', 'Added to denial queue')
            created.append(appeal_id)

        db.session.commit()
        return jsonify({'created': created, 'errors': errors, 'created_count': len(created)}), 201

    @customer_bp.route('/queue/<appeal_id>/export', methods=['GET'])
    @limit('120 per hour')
    @require_customer_auth
    def queue_export(appeal_id):
        """Download appeal PDF, merged appeal+fax, or ZIP (appeal + fax). mode=appeal|merged|zip"""
        mode = (request.args.get('mode') or 'appeal').lower()
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        if not (a.generated_letter_text or '').strip():
            return jsonify({'error': 'No appeal text to export'}), 400
        appeal_bytes = get_appeal_pdf_bytes_from_model(a)
        fax_bytes = generate_fax_cover_pdf_bytes(a)
        claim = a.claim_number or 'export'
        if mode == 'appeal':
            return send_file(
                io.BytesIO(appeal_bytes),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=build_appeal_pdf_filename(a),
            )
        if mode == 'merged':
            merged = merge_fax_then_appeal(fax_bytes, appeal_bytes)
            return send_file(
                io.BytesIO(merged),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'appeal_with_fax_{claim}.pdf',
            )
        if mode == 'zip':
            zbytes = build_export_zip_bytes(a, appeal_bytes, fax_bytes)
            return send_file(
                io.BytesIO(zbytes),
                mimetype='application/zip',
                as_attachment=True,
                download_name=f'appeal_export_{claim}.zip',
            )
        return jsonify({'error': 'Invalid mode; use appeal, merged, or zip'}), 400

    @customer_bp.route('/queue/batch-appeals', methods=['POST'])
    @limit('8 per hour')
    @require_customer_auth
    def queue_batch_appeals_start():
        """CSV batch: generate appeal text + PDF per row; poll job then download ZIP.
        Accepts JSON { rows, defaults? } or multipart file field \"file\" (.csv)."""
        uid = g.current_user_id
        app_obj = current_app._get_current_object()

        if request.is_json:
            data = request.get_json(silent=True) or {}
            defaults = data.get('defaults') or {}
            rows = data.get('rows')
            if not isinstance(rows, list) or not rows:
                return jsonify({'error': 'JSON body must include non-empty "rows" array'}), 400
            if len(rows) > MAX_BATCH_ROWS:
                return jsonify({'error': f'Maximum {MAX_BATCH_ROWS} rows per batch'}), 400
            try:
                job_id = start_batch_job_from_rows(app_obj, uid, rows, defaults)
            except Exception as e:
                return jsonify({'error': str(e)}), 500
            return jsonify({'job_id': job_id, 'max_rows': MAX_BATCH_ROWS, 'job_kind': 'csv'}), 202

        if not (request.content_type and 'multipart/form-data' in request.content_type):
            return jsonify({'error': 'Send JSON { rows } or multipart with CSV file field "file"'}), 400
        defaults = {}
        dr = request.form.get('defaults')
        if dr:
            try:
                defaults = json.loads(dr)
            except json.JSONDecodeError:
                defaults = {}
        f = request.files.get('file')
        if not f or not f.filename:
            return jsonify({'error': 'CSV file required (field name: file)'}), 400
        ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
        if ext not in ('csv', 'txt'):
            return jsonify({'error': 'Upload a .csv file'}), 400
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
        tmp.close()
        try:
            f.save(tmp.name)
            job_id = start_batch_job(app_obj, uid, tmp.name, defaults)
        except Exception as e:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass
            return jsonify({'error': str(e)}), 500
        return jsonify({'job_id': job_id, 'max_rows': MAX_BATCH_ROWS, 'job_kind': 'csv'}), 202

    @customer_bp.route('/queue/batch-appeals-pdfs', methods=['POST'])
    @limit('8 per hour')
    @require_customer_auth
    def queue_batch_appeals_pdfs_start():
        """Multi-PDF batch: extract each letter, generate appeal + PDF; poll then download ZIP."""
        if not (request.content_type and 'multipart/form-data' in request.content_type):
            return jsonify({'error': 'multipart/form-data with field "files" required'}), 400
        uid = g.current_user_id
        defaults = {}
        dr = request.form.get('defaults')
        if dr:
            try:
                defaults = json.loads(dr)
            except json.JSONDecodeError:
                defaults = {}
        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': 'No files uploaded (use input name=\"files\" multiple)'}), 400
        pdfs = [f for f in files if f.filename and f.filename.lower().endswith('.pdf')]
        if not pdfs:
            return jsonify({'error': 'Upload one or more .pdf files'}), 400
        if len(pdfs) > MAX_PDF_BATCH_FILES:
            return jsonify({'error': f'Maximum {MAX_PDF_BATCH_FILES} PDFs per batch'}), 400

        tmp_dir = tempfile.mkdtemp(prefix='dap_pdf_batch_')
        pdf_items = []
        try:
            for f in pdfs:
                safe = secure_filename(f.filename) or 'denial.pdf'
                path = os.path.join(tmp_dir, f'{uuid.uuid4().hex}_{safe}')
                f.save(path)
                pdf_items.append({'path': path, 'name': f.filename})
            job_id = start_pdf_batch_job(
                current_app._get_current_object(),
                uid,
                pdf_items,
                defaults,
                pdf_temp_dir=tmp_dir,
            )
        except Exception as e:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return jsonify({'error': str(e)}), 500
        return jsonify(
            {'job_id': job_id, 'max_files': MAX_PDF_BATCH_FILES, 'job_kind': 'pdf', 'file_count': len(pdf_items)}
        ), 202

    @customer_bp.route('/queue/batch-appeals/<job_id>', methods=['GET'])
    @require_customer_auth
    def queue_batch_appeals_status(job_id):
        j = get_job(job_id)
        if not j or j.get('user_id') != g.current_user_id:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(
            {
                'status': j.get('status'),
                'job_kind': j.get('job_kind', 'csv'),
                'total': j.get('total', 0),
                'current': j.get('current', 0),
                'ok_count': j.get('ok_count'),
                'error': j.get('error'),
            }
        ), 200

    @customer_bp.route('/queue/batch-appeals/<job_id>/zip', methods=['GET'])
    @require_customer_auth
    def queue_batch_appeals_zip(job_id):
        j = get_job(job_id)
        if not j or j.get('user_id') != g.current_user_id:
            return jsonify({'error': 'Not found'}), 404
        if j.get('status') != 'done' or not j.get('zip_path'):
            return jsonify({'error': 'Batch not ready yet', 'status': j.get('status')}), 400
        path = j['zip_path']
        if not os.path.isfile(path):
            return jsonify({'error': 'ZIP no longer available — start a new batch'}), 410
        return send_file(path, as_attachment=True, download_name=j.get('zip_name') or 'appeals_batch.zip')

    @customer_bp.route('/claims/ingest', methods=['POST'])
    @limit('120 per hour')
    @require_customer_auth
    def claims_ingest():
        """Billing/EHR-style single claim ingest: validate, score, persist."""
        uid = g.current_user_id
        data = request.json or {}
        defaults = data.get('defaults') or {}
        claim_number = str(data.get('claim_number') or '').strip()
        payer = str(data.get('payer') or '').strip()
        if not claim_number or not payer:
            return jsonify({'error': 'claim_number and payer are required'}), 400

        dos = _parse_ingest_date(data.get('date_of_service'), defaults)
        patient_id = str(data.get('patient_id') or defaults.get('patient_id') or 'INGEST').strip()
        provider_name = str(data.get('provider_name') or defaults.get('provider_name') or 'Practice').strip()
        provider_npi = str(data.get('provider_npi') or defaults.get('provider_npi') or '0000000000').strip()

        paid_raw = data.get('paid_amount')
        paid_note = ''
        if paid_raw not in (None, ''):
            paid_note = f'Paid amount (ingest): {paid_raw}'

        try:
            billed = Decimal(str(data.get('billed_amount'))) if data.get('billed_amount') not in (None, '') else Decimal('0')
        except (InvalidOperation, TypeError):
            billed = Decimal('0')

        dup = Appeal.query.filter_by(user_id=uid, claim_number=claim_number, payer=payer).filter(
            Appeal.status.in_(['pending', 'paid', 'completed'])
        ).first()
        if dup:
            return jsonify({'error': 'Duplicate claim for this payer'}), 409

        pipeline_payload = _build_pipeline_payload_from_ingest(data, defaults)
        denial_reason = pipeline_payload['denial_reason']

        appeal_id = f"APP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        appeal = Appeal(
            appeal_id=appeal_id,
            user_id=uid,
            payer=payer,
            claim_number=claim_number,
            patient_id=patient_id,
            provider_name=provider_name,
            provider_npi=provider_npi,
            date_of_service=dos,
            denial_reason=denial_reason,
            denial_code=pipeline_payload.get('denial_code'),
            diagnosis_code=(pipeline_payload.get('icd_codes') or '')[:100] or None,
            cpt_codes=(pipeline_payload.get('cpt_codes') or '')[:200] or None,
            billed_amount=billed,
            appeal_level='level_1',
            status='pending',
            payment_status='unpaid',
            price_charged=current_app.config.get('PRICE_PER_APPEAL', 79),
            credit_used=False,
            queue_status='pending',
            queue_notes=paid_note or None,
        )
        db.session.add(appeal)
        db.session.flush()
        pipe = apply_pipeline_to_appeal(appeal, pipeline_payload)
        _append_event(appeal.id, uid, 'ingested', 'API claims ingest')
        db.session.commit()
        pred = pipe['prediction']
        return jsonify(
            {
                'status': 'processed',
                'claimId': appeal_id,
                'riskLevel': pred['riskLevel'],
                'score': pred['score'],
            }
        ), 201

    @customer_bp.route('/claims/ingest/batch', methods=['POST'])
    @limit('60 per hour')
    @require_customer_auth
    def claims_ingest_batch():
        """Batch ingest (max 100 rows) for clearinghouse / PM exports."""
        uid = g.current_user_id
        body = request.json or {}
        claims = body.get('claims') or []
        defaults = body.get('defaults') or {}
        if not isinstance(claims, list) or not claims:
            return jsonify({'error': 'claims must be a non-empty array'}), 400
        if len(claims) > 100:
            return jsonify({'error': 'Maximum 100 claims per batch'}), 400

        results = []
        errors = []
        for i, row in enumerate(claims):
            if not isinstance(row, dict):
                errors.append({'index': i, 'error': 'Row must be an object'})
                continue
            data = {**defaults, **row}
            claim_number = str(data.get('claim_number') or '').strip()
            payer = str(data.get('payer') or '').strip()
            if not claim_number or not payer:
                errors.append({'index': i, 'error': 'claim_number and payer required'})
                continue
            dup = Appeal.query.filter_by(user_id=uid, claim_number=claim_number, payer=payer).filter(
                Appeal.status.in_(['pending', 'paid', 'completed'])
            ).first()
            if dup:
                errors.append({'index': i, 'error': f'Duplicate {claim_number}'})
                continue
            try:
                dos = _parse_ingest_date(data.get('date_of_service'), defaults)
                patient_id = str(data.get('patient_id') or defaults.get('patient_id') or 'INGEST').strip()
                provider_name = str(data.get('provider_name') or defaults.get('provider_name') or 'Practice').strip()
                provider_npi = str(data.get('provider_npi') or defaults.get('provider_npi') or '0000000000').strip()
                try:
                    billed = Decimal(str(data.get('billed_amount'))) if data.get('billed_amount') not in (None, '') else Decimal('0')
                except (InvalidOperation, TypeError):
                    billed = Decimal('0')
                paid_raw = data.get('paid_amount')
                paid_note = f'Paid amount (batch): {paid_raw}' if paid_raw not in (None, '') else ''

                pipeline_payload = _build_pipeline_payload_from_ingest(data, defaults)
                denial_reason = pipeline_payload['denial_reason']
                appeal_id = f"APP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
                appeal = Appeal(
                    appeal_id=appeal_id,
                    user_id=uid,
                    payer=payer,
                    claim_number=claim_number,
                    patient_id=patient_id,
                    provider_name=provider_name,
                    provider_npi=provider_npi,
                    date_of_service=dos,
                    denial_reason=denial_reason,
                    denial_code=pipeline_payload.get('denial_code'),
                    diagnosis_code=(pipeline_payload.get('icd_codes') or '')[:100] or None,
                    cpt_codes=(pipeline_payload.get('cpt_codes') or '')[:200] or None,
                    billed_amount=billed,
                    appeal_level='level_1',
                    status='pending',
                    payment_status='unpaid',
                    price_charged=current_app.config.get('PRICE_PER_APPEAL', 79),
                    credit_used=False,
                    queue_status='pending',
                    queue_notes=paid_note or None,
                )
                db.session.add(appeal)
                db.session.flush()
                pipe = apply_pipeline_to_appeal(appeal, pipeline_payload)
                _append_event(appeal.id, uid, 'ingested', 'Batch API ingest')
                pred = pipe['prediction']
                db.session.commit()
                results.append(
                    {
                        'claimId': appeal_id,
                        'claim_number': claim_number,
                        'riskLevel': pred['riskLevel'],
                        'score': pred['score'],
                    }
                )
            except Exception as ex:
                db.session.rollback()
                errors.append({'index': i, 'error': str(ex)})

        return jsonify({'status': 'processed', 'processed': len(results), 'results': results, 'errors': errors}), 201

    @customer_bp.route('/queue/<appeal_id>/apply-fix-resubmit', methods=['POST'])
    @limit('30 per hour')
    @require_customer_auth
    def queue_apply_fix_resubmit(appeal_id):
        """Auto-fix claim + build resubmission package (minimal user input)."""
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        claim_dict = _appeal_to_pipeline_dict(a)
        pkg = prepareResubmission(claim_dict, appeal_id)
        a.corrected_claim_json = json.dumps(pkg['updatedClaim'], default=str)[:12000]
        a.resubmission_package_json = json.dumps(pkg['resubmissionPackage'], default=str)[:12000]
        a.fix_status = 'applied'
        a.resubmission_ready = True
        note_line = 'Auto-fix + resubmission package prepared.'
        if pkg.get('changesApplied'):
            note_line += ' Changes: ' + '; '.join(pkg['changesApplied'][:6])
        a.queue_notes = (a.queue_notes or '') + ('\n' if a.queue_notes else '') + note_line
        pred = predictDenialScore(pkg['updatedClaim'])
        a.denial_prediction_score = pred['score']
        _append_event(a.id, g.current_user_id, 'auto_fix_resubmit', note_line[:180])
        db.session.commit()
        return jsonify(
            {
                'correctedClaim': pkg['updatedClaim'],
                'changesApplied': pkg['changesApplied'],
                'updatedClaim': pkg['updatedClaim'],
                'resubmissionPackage': pkg['resubmissionPackage'],
                'appealDocument': pkg['appealDocument'],
                'denialPrediction': pred,
            }
        ), 200

    app.register_blueprint(customer_bp, url_prefix='/api')
