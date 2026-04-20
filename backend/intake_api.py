"""
Authenticated intake: preview + PDF (post-payment users only).
"""

import os
import traceback
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from functools import wraps

import io

from flask import Blueprint, request, jsonify, current_app, send_file, g

from appeal_pdf_builder import build_professional_pdf_bytes, build_appeal_pdf_filename
from werkzeug.utils import secure_filename

from models import db, Appeal, User
from credit_manager import PricingManager
from advanced_ai_generator import advanced_ai_generator
from session_customer import validate_customer_session

intake_bp = Blueprint('intake', __name__)


def _require_intake_auth(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        _, err = validate_customer_session()
        if err is not None:
            resp, code = err
            return resp, code
        u = User.query.get(g.current_user_id)
        if not u:
            return jsonify({'error': 'Unauthorized'}), 401
        if u.is_paid is not True and getattr(u, 'payment_verification_status', None) != 'processing':
            return jsonify({'error': 'Active subscription required'}), 403
        return f(*args, **kwargs)

    return wrapped

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


def register_intake_routes(app, limiter, generator):
    @intake_bp.route('/intake/preview', methods=['POST'])
    @limiter.limit('15 per hour')
    @_require_intake_auth
    def create_preview():
        """Create appeal + AI preview for the authenticated user."""

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
            patient_name = ''
            provider_name_in = ''
            provider_npi_in = ''
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
                patient_name = (
                    request.form.get('patient_name') or request.form.get('patient') or ''
                ).strip()
                provider_name_in = (request.form.get('provider_name') or '').strip()
                provider_npi_in = (request.form.get('provider_npi') or '').strip()
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
                patient_name = (
                    json_data.get('patient_name') or json_data.get('patient') or ''
                ).strip()
                provider_name_in = (str(json_data.get('provider_name') or '')).strip()
                provider_npi_in = (str(json_data.get('provider_npi') or '')).strip()
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
                    request.form.get('diagnosis_code')
                    or request.form.get('icd10_codes')
                    or request.form.get('icd_codes'),
                    200,
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
                    json_data.get('diagnosis_code')
                    or json_data.get('icd10_codes')
                    or json_data.get('icd_codes'),
                    200,
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
            # icd_part from diagnosis_code | icd10_codes | icd_codes (see multipart/json branches above)

            if not patient_name or not provider_name_in or not provider_npi_in:
                return jsonify({'error': 'Patient name, provider name, and NPI are required'}), 400

            # Frictionless intake: defaults when payer or narrative omitted (upload / paste / CSV paths).
            if not denial_reason or not str(denial_reason).strip():
                denial_reason = (
                    'Denial details from uploaded or pasted documentation. '
                    'Review the generated appeal and attach supporting records as needed.'
                )
            if not payer or not str(payer).strip():
                payer = 'Unknown payer'

            provider_name = provider_name_in[:200]
            provider_npi = provider_npi_in[:20]

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
                user_id=g.current_user_id,
                payer=payer[:200],
                payer_name=payer[:200],
                claim_number=claim_number,
                patient_id=patient_name[:100],
                provider_name=provider_name,
                provider_npi=provider_npi,
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

    @intake_bp.route('/intake/appeal/<appeal_id>', methods=['GET'])
    @_require_intake_auth
    def get_intake_appeal(appeal_id):
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
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

    @intake_bp.route('/intake/appeal/<appeal_id>/full-text', methods=['GET'])
    @_require_intake_auth
    def intake_appeal_full_text(appeal_id):
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
        return jsonify({'full_text': a.generated_letter_text or ''}), 200

    @intake_bp.route('/intake/appeal/<appeal_id>/pdf', methods=['GET'])
    @_require_intake_auth
    def intake_appeal_pdf(appeal_id):
        a = Appeal.query.filter_by(appeal_id=appeal_id, user_id=g.current_user_id).first()
        if not a:
            return jsonify({'error': 'Not found'}), 404
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

    app.register_blueprint(intake_bp, url_prefix='/api')
