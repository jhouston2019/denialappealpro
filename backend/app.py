"""
Internal engine API: denial extraction + appeal generation only.
Auth: Supabase JWT (Authorization: Bearer). No Stripe, sessions, credits, or admin here.
"""
# REMOVED: customer_portal, intake_api, unified_payment, stripe webhook, admin, analytics,
# credit_manager, session_customer, intelligence_api, internal test routes, legacy appeal submit.

from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import httpx
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import Config
from models import db, Appeal, User
from supabase_jwt import (
    bearer_from_request,
    jwt_subject_uuid,
    validate_supabase_jwt,
)
from pdf_parser import parse_denial_pdf, parse_denial_text
from advanced_ai_generator import advanced_ai_generator
from appeal_pdf_builder import build_professional_pdf_bytes, build_appeal_pdf_filename

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
MAX_FILE_SIZE = 10 * 1024 * 1024

CORS_ORIGINS = [
    "https://denial-appeal-pro.netlify.app",
    "https://www.denialappealpro.com",
    "http://localhost:3000",
]


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    CORS(
        app,
        origins=CORS_ORIGINS,
        supports_credentials=False,
        allow_headers=["Authorization", "Content-Type", "Accept"],
        methods=["GET", "POST", "OPTIONS"],
    )

    def _require_jwt() -> Tuple[Optional[Dict[str, Any]], Optional[UUID], Optional[Tuple[Any, int]]]:
        """
        Returns (claims, user_uuid, None) on success, or (None, None, (jsonify(...), code)).
        """
        raw = bearer_from_request()
        if not raw:
            return None, None, (jsonify({"error": "Missing Authorization Bearer token"}), 401)
        try:
            claims = validate_supabase_jwt(raw)
        except ValueError as e:
            return None, None, (jsonify({"error": str(e)}), 401)
        uid = jwt_subject_uuid(claims)
        if not uid:
            return None, None, (jsonify({"error": "Invalid token: no sub"}), 401)
        return claims, uid, None

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"}), 200

    @app.route("/api/extract/text", methods=["POST"])
    def extract_text():
        # No JWT — read-only extraction; no DB writes. Generation routes stay protected.
        body = request.get_json(silent=True) or {}
        text = (body.get("text") or "").strip()
        if not text:
            return jsonify({"success": False, "error": "Empty text"}), 400
        if len(text) > 100_000:
            return jsonify({"success": False, "error": "Text exceeds maximum length"}), 400
        result = parse_denial_text(text)
        return jsonify(result), 200

    @app.route("/api/extract/file", methods=["POST"])
    def extract_file():
        # No JWT — read-only extraction; no DB writes.
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400
        f = request.files["file"]
        if not f.filename:
            return jsonify({"success": False, "error": "No file selected"}), 400
        ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
        if ext != "pdf":
            return jsonify(
                {
                    "success": False,
                    "error": "Only PDF files are supported for extraction",
                    "message": "Upload a text-based PDF denial or EOB.",
                }
            ), 400
        fn = secure_filename(f.filename)
        temp_path = os.path.join(app.config["UPLOAD_FOLDER"], f"temp_{uuid.uuid4()}_{fn}")
        f.save(temp_path)
        try:
            result = parse_denial_pdf(temp_path)
            if isinstance(result, dict) and result.get("success") is False:
                return jsonify(result), 400
            return jsonify(result), 200
        except ValueError as e:
            return jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "message": "Could not extract information from PDF.",
                    "allow_manual": True,
                }
            ), 400
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    def _merge_user_provider(data: Dict[str, Any], user: Optional[User]) -> None:
        if not user:
            return
        if not (data.get("provider_name") or "").strip() and user.provider_name:
            data["provider_name"] = user.provider_name
        if not (data.get("provider_npi") or "").strip() and user.provider_npi:
            data["provider_npi"] = user.provider_npi
        if not (data.get("provider_address") or "").strip() and getattr(
            user, "provider_address", None
        ):
            data["provider_address"] = user.provider_address

    def _parse_date(s: Any) -> Optional[date]:
        if s is None:
            return None
        raw = str(s).strip()[:10]
        if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
            return datetime.strptime(raw, "%Y-%m-%d").date()
        return None

    def _decimal(v: Any) -> Decimal:
        if v is None or v == "":
            return Decimal("0")
        try:
            return Decimal(str(v))
        except (InvalidOperation, ValueError, TypeError):
            return Decimal("0")

    def _join_codes(val: Any, max_len: int = 200) -> Optional[str]:
        if val is None:
            return None
        if isinstance(val, list):
            s = ",".join(str(x).strip() for x in val if x is not None and str(x).strip())
        else:
            s = str(val).strip()
        if not s:
            return None
        return s[:max_len]

    @app.route("/api/generate/appeal", methods=["POST"])
    def generate_appeal():
        _, uid, err = _require_jwt()
        if err:
            return err
        if not uid:
            return jsonify({"error": "Unauthorized"}), 401

        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify({"error": "JSON body required"}), 400

        user = db.session.get(User, uid)
        if not user:
            return jsonify({"error": "User profile not found in database"}), 404

        _merge_user_provider(body, user)

        payer = (body.get("payer") or body.get("payer_name") or "").strip()
        patient = (body.get("patient_name") or body.get("patient_id") or "").strip()
        prov = (body.get("provider_name") or "").strip()
        npi = (body.get("provider_npi") or "").strip()
        denial_reason = (body.get("denial_reason") or "").strip()
        claim_number = (body.get("claim_number") or "").strip()[:100]

        if not patient or not prov or not npi:
            return jsonify(
                {"error": "patient_name (or patient_id), provider_name, and provider_npi are required"}
            ), 400

        if not payer:
            payer = "Unknown payer"
        if not denial_reason:
            denial_reason = (
                "Denial details from documentation. "
                "Review the generated appeal and attach supporting records as needed."
            )

        dos = _parse_date(body.get("date_of_service")) or date.today()
        denial_codes_in: List[str] = []
        dc = body.get("denial_codes")
        if isinstance(dc, list):
            denial_codes_in = [str(x).strip() for x in dc if str(x).strip()]
        elif isinstance(dc, str) and dc.strip():
            denial_codes_in = [p.strip() for p in re.split(r"[,;\s]+", dc) if p.strip()]
        d1 = body.get("denial_code")
        if d1:
            for p in str(d1).replace(";", ",").split(","):
                if p.strip():
                    denial_codes_in.append(p.strip())
        denial_code_stored = " / ".join(denial_codes_in)[:50] if denial_codes_in else None

        app_date = datetime.utcnow().strftime("%Y%m%d")
        aid = f"APP-GEN-{app_date}-{uuid.uuid4().hex[:8].upper()}"
        if not claim_number:
            claim_number = (
                f"GEN-{datetime.utcnow().strftime('%H%M%S')}-"
                f"{uuid.uuid4().hex[:6].upper()}"
            )

        npi10 = (re.sub(r"\D", "", npi) + "0000000000")[:10]
        billed = _decimal(body.get("billed_amount") or body.get("amount"))

        appeal = Appeal(
            appeal_id=aid,
            user_id=uid,
            payer=payer[:200],
            payer_name=payer[:200],
            claim_number=claim_number,
            patient_id=patient[:100],
            provider_name=prov[:200],
            provider_npi=npi10,
            date_of_service=dos,
            denial_reason=denial_reason[:12000],
            denial_code=denial_code_stored,
            diagnosis_code=_join_codes(
                body.get("diagnosis_code") or body.get("icd10_codes") or body.get("icd_codes")
            ),
            cpt_codes=_join_codes(body.get("cpt_codes")),
            billed_amount=billed,
            status="pending",
            payment_status="unpaid",
            price_charged=Decimal(str(Config.PRICE_PER_APPEAL)),
            credit_used=False,
            queue_status="pending",
        )
        db.session.add(appeal)
        db.session.flush()

        try:
            letter = advanced_ai_generator.generate_appeal_content(appeal)
        except Exception as e:
            logger.exception("generate_appeal_content failed: %s", e)
            db.session.rollback()
            return jsonify({"error": f"Generation failed: {e}"}), 500

        appeal.generated_letter_text = letter
        appeal.status = "completed"
        appeal.queue_status = "generated"
        appeal.completed_at = datetime.utcnow()
        appeal.last_generated_at = datetime.utcnow()
        appeal.generation_count = (appeal.generation_count or 0) + 1
        appeal.appeal_tracking_status = "generated"
        appeal.tracking_updated_at = datetime.utcnow()

        db.session.commit()

        _fire_record_usage(str(uid), aid, raw_jwt=bearer_from_request())

        pdf_path = f"/api/generate/appeal/{aid}/pdf"
        return (
            jsonify(
                {
                    "appeal_id": aid,
                    "letter_text": letter,
                    "pdf_url": pdf_path,
                }
            ),
            200,
        )

    def _fire_record_usage(user_id: str, appeal_id: str, raw_jwt: Optional[str]):
        base = (os.getenv("NEXT_INTERNAL_API_URL") or "").strip().rstrip("/")
        if not base:
            logger.warning("NEXT_INTERNAL_API_URL not set; skipping record-usage")
            return
        url = f"{base}/api/internal/record-usage"
        payload = {
            "user_id": user_id,
            "appeal_id": appeal_id,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
        headers = {"Content-Type": "application/json"}
        if raw_jwt:
            headers["Authorization"] = f"Bearer {raw_jwt}"
        try:
            with httpx.Client(timeout=10.0) as client:
                r = client.post(url, json=payload, headers=headers)
            if r.status_code >= 400:
                logger.error("record-usage failed: %s %s", r.status_code, r.text[:500])
        except Exception as e:
            logger.error("record-usage request error: %s", e)

    @app.route("/api/generate/appeal/<appeal_id>/pdf", methods=["GET"])
    def get_appeal_pdf(appeal_id: str):
        _, uid, err = _require_jwt()
        if err:
            return err
        a = (
            Appeal.query.filter_by(appeal_id=appeal_id, user_id=uid).first()
            if uid
            else None
        )
        if not a:
            return jsonify({"error": "Not found"}), 404
        if not (a.generated_letter_text or "").strip():
            return jsonify({"error": "No appeal text yet"}), 400
        pdf_bytes = build_professional_pdf_bytes(a)
        fn = build_appeal_pdf_filename(a)
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{fn}"'},
        )

    @app.route("/api/generate/appeal/<appeal_id>/text", methods=["GET"])
    def get_appeal_text(appeal_id: str):
        _, uid, err = _require_jwt()
        if err:
            return err
        a = (
            Appeal.query.filter_by(appeal_id=appeal_id, user_id=uid).first()
            if uid
            else None
        )
        if not a:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"full_text": a.generated_letter_text or ""}), 200

    return app


app = create_app()
