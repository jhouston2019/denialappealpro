"""
Customer auth + denial queue API (login persistence, batch intake, status workflow).
"""

import csv
import io
import json
import uuid
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename

from sqlalchemy import func

from models import db, User, Appeal, ClaimStatusEvent, ReferralPartner
from user_auth import register_user, login_user, verify_user_token
from credit_manager import CreditManager
from stripe_billing import StripeBilling
from retention_service import dashboard_metrics as retention_dashboard_metrics

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
    }


def _appeal_detail(a: Appeal):
    events = (
        ClaimStatusEvent.query.filter_by(appeal_db_id=a.id)
        .order_by(ClaimStatusEvent.created_at.asc())
        .all()
    )
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


def init_customer_portal(app, limiter, generator):
    app.extensions['appeal_generator'] = generator

    limit = limiter.limit

    @customer_bp.route('/auth/register', methods=['POST'])
    @limit('20 per day')
    def auth_register():
        data = request.json or {}
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
        data = request.json or {}
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
        rows = (
            Appeal.query.filter_by(user_id=g.current_user_id)
            .order_by(Appeal.created_at.desc())
            .limit(500)
            .all()
        )
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
                _append_event(a.id, g.current_user_id, 'status_change', f'{old} → {new_s}')
        if 'payment_status' in data:
            ps = (data.get('payment_status') or '').lower()
            allowed_ps = {'pending', 'unpaid', 'submitted', 'paid'}
            if ps in allowed_ps:
                a.payment_status = ps
                _append_event(a.id, g.current_user_id, 'payment_status', ps)
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
            db.session.commit()
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
            )
            db.session.add(appeal)
            db.session.flush()
            _append_event(appeal.id, uid, 'created', 'Added to denial queue')
            created.append(appeal_id)

        db.session.commit()
        return jsonify({'created': created, 'errors': errors, 'created_count': len(created)}), 201

    app.register_blueprint(customer_bp, url_prefix='/api')
