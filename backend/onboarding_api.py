"""
High-conversion onboarding: preview without login, paywall, then account + full PDF.
"""

import os
import traceback
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import stripe
import io

from flask import Blueprint, request, jsonify, current_app, send_file

from appeal_pdf_builder import build_professional_pdf_bytes, build_appeal_pdf_filename
from werkzeug.utils import secure_filename

from models import db, Appeal, User
from credit_manager import CreditManager, PricingManager
from advanced_ai_generator import advanced_ai_generator
from stripe_billing import StripeBilling

onboarding_bp = Blueprint('onboarding', __name__)

PREVIEW_CHARS = 900
ALLOWED_UPLOAD = {'pdf', 'jpg', 'jpeg', 'png'}


def normalize_denial_codes(codes):
    if not codes:
        return []

    valid = []

    for c in codes:
        c = str(c).strip().upper()

        if c.isdigit() and int(c) > 0:
            valid.append(c)

        elif c.startswith('N') and len(c) > 1 and c[1:].isdigit():
            valid.append(c)

    return list(set(valid))


def _defaults_for_onboarding():
    return {
        'patient_id': 'ONBOARDING',
        'provider_name': 'Your practice',
        'provider_npi': '0000000000',
        'date_of_service': date.today(),
        'appeal_level': 'level_1',
    }


def register_onboarding_routes(app, limiter, generator):
    stripe.api_key = app.config['STRIPE_SECRET_KEY']

    @onboarding_bp.route('/onboarding/preview', methods=['POST'])
    @limiter.limit('15 per hour')
    def create_preview():
        """Create anonymous appeal + AI preview text (no PDF, no login). Always returns JSON."""

        def _normalize_code_field(val, max_join_len=200):
            if val is None:
                return ''
            if isinstance(val, list):
                parts = [str(c).strip() for c in val if str(c).strip()]
                return ','.join(parts)[:max_join_len]
            s = str(val).strip()
            if not s:
                return ''
            parts = [c.strip() for c in s.replace(';', ',').split(',') if c.strip()]
            return ','.join(parts)[:max_join_len]

        try:
            denial_reason = ''
            payer = ''
            billed_amount = Decimal('0')
            cpt_part = ''
            icd_part = ''
            denial_letter_path = None
            intake_mode = 'paste'
            is_multipart = bool(request.content_type and 'multipart/form-data' in request.content_type)
            json_data = {}

            if is_multipart:
                intake_mode = request.form.get('intake_mode') or 'paste'
                payer = (request.form.get('payer') or request.form.get('payer_name') or '').strip()
                denial_reason = (request.form.get('denial_reason') or '').strip()
                raw_amt = request.form.get('billed_amount') or request.form.get('amount')
                cpt_icd = (request.form.get('cpt_icd') or '').strip()
                if cpt_icd:
                    parts = [p.strip() for p in cpt_icd.replace(';', ',').split(',') if p.strip()]
                    if parts:
                        cpt_part = parts[0][:200]
                        if len(parts) > 1:
                            icd_part = ','.join(parts[1:])[:100]
                try:
                    billed_amount = Decimal(str(raw_amt)) if raw_amt not in (None, '') else Decimal('0')
                except (InvalidOperation, TypeError):
                    billed_amount = Decimal('0')
                paste_extra = (request.form.get('paste_details') or '').strip()
                if paste_extra:
                    denial_reason = (denial_reason + '\n\n' + paste_extra).strip() if denial_reason else paste_extra
                f = request.files.get('denial_file')
                if f and f.filename:
                    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
                    if ext not in ALLOWED_UPLOAD:
                        return jsonify({'error': 'Invalid file type'}), 400
                    uid = uuid.uuid4().hex
                    path = os.path.join(current_app.config['UPLOAD_FOLDER'], f'{uid}_{secure_filename(f.filename)}')
                    f.save(path)
                    denial_letter_path = path
            else:
                json_data = request.get_json(silent=True)
                if json_data is None:
                    ct = (request.content_type or '').lower()
                    if 'application/json' in ct:
                        return jsonify({'error': 'Missing or invalid JSON body'}), 400
                    json_data = {}
                if not isinstance(json_data, dict):
                    return jsonify({'error': 'Request body must be a JSON object'}), 400

                intake_mode = json_data.get('intake_mode') or 'paste'
                payer = (json_data.get('payer') or json_data.get('payer_name') or '').strip()
                denial_reason = (json_data.get('denial_reason') or '').strip()
                raw_amt = json_data.get('billed_amount') or json_data.get('amount')
                cpt_icd = (json_data.get('cpt_icd') or '').strip()
                if cpt_icd:
                    parts = [p.strip() for p in cpt_icd.replace(';', ',').split(',') if p.strip()]
                    if parts:
                        cpt_part = parts[0][:200]
                        if len(parts) > 1:
                            icd_part = ','.join(parts[1:])[:100]
                try:
                    billed_amount = Decimal(str(raw_amt)) if raw_amt not in (None, '') else Decimal('0')
                except (InvalidOperation, TypeError):
                    billed_amount = Decimal('0')
                paste_extra = (json_data.get('paste_details') or '').strip()
                if paste_extra:
                    denial_reason = (denial_reason + '\n\n' + paste_extra).strip() if denial_reason else paste_extra

                if not payer:
                    return jsonify({'error': 'Missing payer'}), 400

            # Structured intake: claim #, DOS, CPT/ICD columns, primary denial code
            claim_number_in = ''
            date_of_service_raw = None
            cpt_direct = ''
            icd_direct = ''
            raw_denial_codes = []
            if is_multipart:
                claim_number_in = (request.form.get('claim_number') or '').strip()[:100]
                date_of_service_raw = request.form.get('date_of_service')
                cpt_direct = _normalize_code_field(request.form.get('cpt_codes'), 200)
                icd_direct = _normalize_code_field(
                    request.form.get('diagnosis_code') or request.form.get('icd_codes'), 200
                )
                dc_str = (request.form.get('denial_code') or '').strip()
                if dc_str:
                    for part in dc_str.replace(';', ',').split(','):
                        p = part.strip()
                        if p:
                            raw_denial_codes.append(p)
                raw_denial_codes.extend(request.form.getlist('denial_codes'))
            else:
                claim_number_in = (str(json_data.get('claim_number') or '') or '').strip()[:100]
                date_of_service_raw = json_data.get('date_of_service')
                cpt_direct = _normalize_code_field(json_data.get('cpt_codes'), 200)
                icd_direct = _normalize_code_field(
                    json_data.get('diagnosis_code') or json_data.get('icd_codes'), 200
                )
                denial_codes_payload = json_data.get('denial_codes', [])
                if isinstance(denial_codes_payload, list):
                    raw_denial_codes.extend(denial_codes_payload)
                elif isinstance(denial_codes_payload, str) and denial_codes_payload.strip():
                    for part in denial_codes_payload.replace(';', ',').split(','):
                        p = part.strip()
                        if p:
                            raw_denial_codes.append(p)
                dc_str = str(json_data.get('denial_code') or '').strip()
                if dc_str:
                    for part in dc_str.replace(';', ',').split(','):
                        p = part.strip()
                        if p:
                            raw_denial_codes.append(p)

            denial_codes = normalize_denial_codes(raw_denial_codes)
            if not denial_codes:
                denial_codes = ['97']
            denial_code_stored = ' / '.join(denial_codes)[:50]

            if cpt_direct:
                cpt_part = cpt_direct
            if icd_direct:
                icd_part = icd_direct

            # Frictionless intake: defaults when payer or narrative omitted (upload / paste / CSV paths).
            if not denial_reason or not str(denial_reason).strip():
                denial_reason = (
                    'Denial details from uploaded or pasted documentation. '
                    'Review the generated appeal and attach supporting records as needed.'
                )
            if not payer or not str(payer).strip():
                payer = 'Unknown payer'

            d = _defaults_for_onboarding()
            appeal_id = f"APP-ONB-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
            claim_number = claim_number_in or f"ONB-{datetime.utcnow().strftime('%H%M%S')}-{str(uuid.uuid4())[:6].upper()}"

            dos = d['date_of_service']
            if date_of_service_raw:
                try:
                    ds = str(date_of_service_raw)[:10]
                    dos = datetime.strptime(ds, '%Y-%m-%d').date()
                except ValueError:
                    pass

            appeal = Appeal(
                appeal_id=appeal_id,
                user_id=None,
                payer=payer[:200],
                payer_name=payer[:200],
                claim_number=claim_number,
                patient_id=d['patient_id'],
                provider_name=d['provider_name'],
                provider_npi=d['provider_npi'],
                date_of_service=dos,
                denial_reason=denial_reason,
                denial_code=denial_code_stored or None,
                billed_amount=billed_amount,
                cpt_codes=cpt_part or None,
                diagnosis_code=icd_part or None,
                denial_letter_path=denial_letter_path,
                status='pending',
                payment_status='unpaid',
                price_charged=Decimal(str(PricingManager.RETAIL_PRICE)),
                credit_used=False,
                queue_status='pending',
            )
            db.session.add(appeal)
            db.session.flush()

            # TESTING: payment disabled — create_preview has no payment/credit checks before generation (anonymous preview is intentionally pre-pay).
            try:
                if not getattr(advanced_ai_generator, 'enabled', True):
                    text = (
                        f"Basis for appeal (preview)\n\n"
                        f"Payer: {payer}\nClaim: {claim_number}\nAmount: ${billed_amount}\n\n"
                        f"{denial_reason[:2000]}"
                    )
                else:
                    try:
                        text = advanced_ai_generator.generate_appeal_content(appeal)
                    except Exception as gen_exc:
                        print('GENERATOR ERROR:', gen_exc)
                        text = 'Unable to generate full appeal. Please review inputs.'
                appeal.generated_letter_text = text
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(
                    "Preview generation failed | type=%s | details=%s\nFull traceback:\n%s",
                    type(e).__name__,
                    str(e),
                    traceback.format_exc(),
                )
                return jsonify(
                    {
                        'error': 'Preview generation failed',
                        'details': str(e),
                        'type': type(e).__name__,
                    }
                ), 500

            text = appeal.generated_letter_text or ''
            excerpt = text[:PREVIEW_CHARS]
            total_len = len(text)
            return jsonify(
                {
                    'appeal_id': appeal_id,
                    'revenue_at_risk': float(billed_amount),
                    'revenue_message': f"This claim represents ${float(billed_amount):,.2f} in denied revenue",
                    'preview_excerpt': excerpt,
                    'preview_total_length': total_len,
                    'preview_truncated': total_len > PREVIEW_CHARS,
                    'intake_mode': intake_mode,
                }
            ), 201

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(
                "Preview generation failed | type=%s | details=%s\nFull traceback:\n%s",
                type(e).__name__,
                str(e),
                traceback.format_exc(),
            )
            return jsonify(
                {
                    'error': 'Preview generation failed',
                    'details': str(e),
                    'type': type(e).__name__,
                }
            ), 500

    @onboarding_bp.route('/onboarding/appeal/<appeal_id>', methods=['GET'])
    def get_onboarding_appeal(appeal_id):
        a = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not a or a.user_id is not None:
            return jsonify({'error': 'Not found'}), 404
        text = a.generated_letter_text or ''
        excerpt = text[:PREVIEW_CHARS]
        return jsonify(
            {
                'appeal_id': a.appeal_id,
                'payer': a.payer,
                'claim_number': a.claim_number,
                'billed_amount': float(a.billed_amount or 0),
                'revenue_message': f"This claim represents ${float(a.billed_amount or 0):,.2f} in denied revenue",
                'preview_excerpt': excerpt,
                'preview_total_length': len(text),
                'preview_truncated': len(text) > PREVIEW_CHARS,
                'payment_status': a.payment_status,
                'status': a.status,
                'account_linked': a.user_id is not None,
            }
        ), 200

    @onboarding_bp.route('/onboarding/appeal/<appeal_id>/full-text', methods=['GET'])
    def onboarding_appeal_full_text(appeal_id):
        """Full appeal body for Copy — only after account is linked (paid flow)."""
        a = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        if not str(a.appeal_id or '').startswith('APP-ONB-'):
            return jsonify({'error': 'Not found'}), 404
        if a.user_id is None:
            return jsonify({'error': 'Unlock full appeal after checkout'}), 402
        return jsonify({'full_text': a.generated_letter_text or ''}), 200

    @onboarding_bp.route('/onboarding/appeal/<appeal_id>/pdf', methods=['GET'])
    def onboarding_appeal_pdf(appeal_id):
        """Download carrier-ready PDF after account is linked."""
        a = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        if not str(a.appeal_id or '').startswith('APP-ONB-'):
            return jsonify({'error': 'Not found'}), 404
        if a.user_id is None:
            return jsonify({'error': 'Unlock full appeal after checkout'}), 402
        if not (a.generated_letter_text or '').strip():
            return jsonify({'error': 'No appeal text yet'}), 400
        pdf_bytes = build_professional_pdf_bytes(a)
        fn = build_appeal_pdf_filename(a)
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=fn,
        )

    @onboarding_bp.route('/onboarding/checkout-retail', methods=['POST'])
    @limiter.limit('20 per hour')
    def checkout_retail():
        data = request.json or {}
        appeal_id = data.get('appeal_id')
        if not appeal_id:
            return jsonify({'error': 'appeal_id required'}), 400
        a = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not a or a.user_id is not None:
            return jsonify({'error': 'Invalid appeal'}), 400
        if a.payment_status == 'paid':
            return jsonify({'error': 'Already paid'}), 400
        origin = request.headers.get('Origin', current_app.config.get('DOMAIN', 'http://localhost:3000'))
        cents = int(round(float(PricingManager.RETAIL_PRICE) * 100))
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {'name': f'Denial Appeal — Claim {a.claim_number}'},
                        'unit_amount': cents,
                    },
                    'quantity': 1,
                }
            ],
            mode='payment',
            success_url=f"{origin}/onboarding/account?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/start/preview/{appeal_id}",
            metadata={
                'appeal_id': appeal_id,
                'type': 'onboarding_retail',
            },
        )
        return jsonify({'session_id': session.id}), 200

    @onboarding_bp.route('/onboarding/checkout-plan', methods=['POST'])
    @limiter.limit('20 per hour')
    def checkout_plan():
        data = request.json or {}
        appeal_id = data.get('appeal_id')
        plan = (data.get('plan') or '').lower()
        email = (data.get('email') or '').strip().lower()
        if not appeal_id or plan not in ('starter', 'core'):
            return jsonify({'error': 'appeal_id and plan (starter or core) required'}), 400
        if not email:
            return jsonify({'error': 'Email required for subscription'}), 400
        a = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not a or a.user_id is not None:
            return jsonify({'error': 'Invalid appeal'}), 400

        user = CreditManager.get_or_create_user(email)
        origin = request.headers.get('Origin', current_app.config.get('DOMAIN', 'http://localhost:3000'))
        success_url = f"{origin}/onboarding/account?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/start/preview/{appeal_id}"

        result = StripeBilling.create_checkout_session(
            user_id=user.id,
            plan=plan,
            success_url=success_url,
            cancel_url=cancel_url,
            extra_metadata={'appeal_id': appeal_id},
        )
        return jsonify({'session_id': result['session_id'], 'url': result.get('url'), 'user_id': user.id}), 200

    @onboarding_bp.route('/onboarding/verify-session', methods=['POST'])
    def verify_session():
        data = request.json or {}
        session_id = data.get('session_id')
        if not session_id:
            return jsonify({'error': 'session_id required'}), 400
        try:
            s = stripe.checkout.Session.retrieve(session_id)
        except Exception as e:
            return jsonify({'error': str(e)}), 400
        meta = s.get('metadata') or {}
        paid = s.get('payment_status') == 'paid' or s.get('status') == 'complete'
        out = {
            'paid': paid,
            'mode': s.get('mode'),
            'customer_email': (s.get('customer_details') or {}).get('email') or s.get('customer_email'),
            'metadata': dict(meta),
        }
        return jsonify(out), 200

    @onboarding_bp.route('/onboarding/finalize', methods=['POST'])
    @limiter.limit('30 per hour')
    def finalize_account():
        """After $79 payment: create password, attach appeal, generate PDF."""
        from user_auth import register_user, login_user

        data = request.json or {}
        session_id = data.get('session_id')
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        if not session_id or not email or len(password) < 8:
            return jsonify({'error': 'session_id, email, and password (8+ chars) required'}), 400
        try:
            s = stripe.checkout.Session.retrieve(session_id)
        except Exception as e:
            return jsonify({'error': str(e)}), 400
        if s.get('payment_status') != 'paid' and s.get('status') != 'complete':
            return jsonify({'error': 'Payment not completed'}), 402
        meta = s.get('metadata') or {}
        if meta.get('type') != 'onboarding_retail':
            return jsonify({'error': 'Invalid session type'}), 400
        appeal_id = meta.get('appeal_id')
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first() if appeal_id else None
        if not appeal:
            return jsonify({'error': 'Appeal not found'}), 404

        secret = current_app.config['SECRET_KEY']
        payload, err = register_user(secret, email, password)
        if err:
            if 'already exists' in err.lower():
                login_payload, lerr = login_user(secret, email, password)
                if lerr:
                    return jsonify({'error': lerr}), 401
                payload = login_payload
            else:
                return jsonify({'error': err}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Could not create user'}), 500

        appeal.user_id = user.id
        if appeal.payment_status == 'paid' and appeal.status == 'awaiting_account':
            try:
                pdf_path = generator.generate_appeal(appeal)
                appeal.appeal_letter_path = pdf_path
                appeal.status = 'completed'
                appeal.completed_at = datetime.utcnow()
                appeal.last_generated_at = datetime.utcnow()
                appeal.queue_status = 'generated'
                appeal.retail_token_used = True
                db.session.commit()
                CreditManager.increment_usage(user.id)
            except Exception as e:
                appeal.status = 'failed'
                db.session.commit()
                return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500

        token = payload['token']

        return jsonify(
            {
                'success': True,
                'token': token,
                'user': {'id': user.id, 'email': user.email},
                'appeal_id': appeal.appeal_id,
            }
        ), 200

    @onboarding_bp.route('/onboarding/complete-subscription', methods=['POST'])
    @limiter.limit('30 per hour')
    def complete_subscription():
        """After subscription checkout: set password and finalize PDF for onboarding appeal."""
        from user_auth import create_user_token
        from werkzeug.security import generate_password_hash

        data = request.json or {}
        session_id = data.get('session_id')
        password = data.get('password') or ''
        if not session_id or len(password) < 8:
            return jsonify({'error': 'session_id and password (8+ chars) required'}), 400
        try:
            s = stripe.checkout.Session.retrieve(session_id)
        except Exception as e:
            return jsonify({'error': str(e)}), 400
        if s.get('status') != 'complete':
            return jsonify({'error': 'Checkout not complete'}), 400
        meta = s.get('metadata') or {}
        if meta.get('type') != 'subscription':
            return jsonify({'error': 'Not a subscription session'}), 400
        uid = int(meta.get('user_id'))
        user = User.query.get(uid)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if user.password_hash:
            return jsonify({'error': 'Password already set — log in'}), 400
        user.password_hash = generate_password_hash(password)
        db.session.commit()

        appeal_id = meta.get('appeal_id')
        if appeal_id:
            appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
            if appeal and appeal.user_id == user.id and appeal.status != 'completed':
                try:
                    pdf_path = generator.generate_appeal(appeal)
                    appeal.appeal_letter_path = pdf_path
                    appeal.status = 'completed'
                    appeal.completed_at = datetime.utcnow()
                    appeal.last_generated_at = datetime.utcnow()
                    appeal.queue_status = 'generated'
                    appeal.payment_status = 'paid'
                    appeal.retail_token_used = True
                    db.session.commit()
                    CreditManager.increment_usage(user.id)
                except Exception as e:
                    appeal.status = 'failed'
                    db.session.commit()
                    return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500

        token = create_user_token(current_app.config['SECRET_KEY'], user.id, user.email)
        return jsonify({'success': True, 'token': token, 'user': {'id': user.id, 'email': user.email}}), 200

    app.register_blueprint(onboarding_bp, url_prefix='/api')
