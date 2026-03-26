"""
API for coding validation, modifier suggestions, and denial risk (intake + pre-generation).
"""
import json

from flask import Blueprint, request, jsonify, current_app

from coding_intelligence import (
    detectDenialRisk,
    run_intelligence_analysis,
    suggestModifiers,
    validateCoding,
)
from models import db, Appeal, CodingIntelligenceLog

intelligence_bp = Blueprint('intelligence', __name__)


def _optional_uid():
    try:
        from user_auth import verify_user_token

        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return None
        data = verify_user_token(current_app.config['SECRET_KEY'], auth[7:].strip())
        return data['uid'] if data else None
    except Exception:
        return None


def _build_snapshot(result: dict, payload: dict) -> dict:
    coding = result.get('coding') or {}
    mods = result.get('modifiers') or {}
    risk = result.get('risk') or {}
    return {
        'codingIssues': coding.get('issues') or [],
        'modifiersSuggested': mods.get('recommendedModifiers') or [],
        'riskLevel': risk.get('riskLevel'),
        'payer': (payload.get('payer') or '')[:200],
        'outcome': None,
    }


def _persist_log(payload: dict, result: dict, uid, appeal_id=None):
    try:
        coding = result.get('coding') or {}
        risk = result.get('risk') or {}
        issues = coding.get('issues') or []
        snapshot = _build_snapshot(result, payload)
        enriched = {**payload, 'intelligence_snapshot': snapshot}
        log = CodingIntelligenceLog(
            user_id=uid,
            appeal_id=appeal_id,
            event_type='analyze',
            payload_json=json.dumps(enriched, default=str)[:12000],
            risk_level=risk.get('riskLevel'),
            coding_issue_count=len(issues),
        )
        db.session.add(log)
        if appeal_id:
            appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
            if appeal:
                appeal.intelligence_snapshot_json = json.dumps(snapshot, default=str)[:8000]
        db.session.commit()
    except Exception:
        db.session.rollback()


def register_intelligence_routes(app, limiter):
    @intelligence_bp.route('/intelligence/analyze', methods=['POST'])
    @limiter.limit('120 per hour')
    def intelligence_analyze():
        data = request.get_json(silent=True) or {}
        result = run_intelligence_analysis(data)
        uid = _optional_uid()
        if data.get('record_feedback', True):
            _persist_log(data, result, uid, data.get('appeal_id'))
        return jsonify(result), 200

    @intelligence_bp.route('/intelligence/validate-coding', methods=['POST'])
    @limiter.limit('120 per hour')
    def intelligence_validate_coding():
        data = request.get_json(silent=True) or {}
        if data.get('cptCodes') is not None or data.get('icdCodes') is not None:
            return jsonify(validateCoding(data)), 200
        cpt = data.get('cpt_codes') or data.get('cptCodes') or ''
        icd = data.get('icd_codes') or data.get('icdCodes') or ''
        return jsonify(validateCoding(cpt, icd)), 200

    @intelligence_bp.route('/intelligence/suggest-modifiers', methods=['POST'])
    @limiter.limit('120 per hour')
    def intelligence_suggest_modifiers():
        data = request.get_json(silent=True) or {}
        if data.get('carcCodes') is not None or data.get('carc_codes') is not None:
            return jsonify(
                suggestModifiers(
                    {
                        'cptCodes': data.get('cpt_codes') or data.get('cptCodes'),
                        'carcCodes': data.get('carc_codes') or data.get('carcCodes'),
                        'context': data.get('context') or {},
                    },
                    data.get('denial_codes') or data.get('denial_code') or '',
                    None,
                )
            ), 200
        cpt = data.get('cpt_codes') or data.get('cptCodes') or ''
        denial = data.get('denial_codes') or data.get('denial_code') or ''
        ctx = data.get('context') or {}
        return jsonify(suggestModifiers(cpt, denial, ctx)), 200

    @intelligence_bp.route('/intelligence/denial-risk', methods=['POST'])
    @limiter.limit('120 per hour')
    def intelligence_denial_risk():
        data = request.get_json(silent=True) or {}
        return jsonify(detectDenialRisk(data)), 200

    app.register_blueprint(intelligence_bp, url_prefix='/api')
