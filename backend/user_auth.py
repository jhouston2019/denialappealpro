"""
End-user authentication for denial queue (email + password, signed tokens).
"""

from functools import wraps
from datetime import timedelta
from flask import request, jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User, ReferralPartner


TOKEN_MAX_AGE_SEC = 60 * 60 * 24 * 14  # 14 days


def _serializer(secret_key: str) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(secret_key, salt='dap-user-auth')


def create_user_token(secret_key: str, user_id: int, email: str) -> str:
    return _serializer(secret_key).dumps({'uid': user_id, 'email': email})


def verify_user_token(secret_key: str, token: str, max_age: int = TOKEN_MAX_AGE_SEC):
    try:
        return _serializer(secret_key).loads(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None


def register_user(secret_key: str, email: str, password: str, referral_code: str = None):
    email = (email or '').strip().lower()
    if not email or not password:
        return None, 'Email and password are required'
    if len(password) < 8:
        return None, 'Password must be at least 8 characters'
    partner_id = None
    if referral_code:
        rc = referral_code.strip().lower()
        partner = ReferralPartner.query.filter_by(code=rc, is_active=True).first()
        if partner:
            partner_id = partner.id
    existing = User.query.filter_by(email=email).first()
    if existing:
        if existing.password_hash:
            return None, 'An account with this email already exists'
        existing.password_hash = generate_password_hash(password)
        if partner_id and not existing.referred_by_id:
            existing.referred_by_id = partner_id
        db.session.commit()
        user = existing
    else:
        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            referred_by_id=partner_id,
        )
        db.session.add(user)
        db.session.commit()
    token = create_user_token(secret_key, user.id, user.email)
    return {'user': _user_public(user), 'token': token}, None


def login_user(secret_key: str, email: str, password: str):
    email = (email or '').strip().lower()
    if not email or not password:
        return None, 'Email and password are required'
    user = User.query.filter_by(email=email).first()
    if not user or not user.password_hash:
        return None, 'Invalid email or password'
    if not check_password_hash(user.password_hash, password):
        return None, 'Invalid email or password'
    token = create_user_token(secret_key, user.id, user.email)
    return {'user': _user_public(user), 'token': token}, None


def _user_public(user: User):
    return {
        'id': user.id,
        'email': user.email,
        'last_queue_visit_at': user.last_queue_visit_at.isoformat() if user.last_queue_visit_at else None,
    }


def require_user(secret_key: str):
    """Flask route decorator: sets g.current_user_id and g.current_user_email from Bearer token."""

    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            from flask import g
            auth = request.headers.get('Authorization', '')
            if not auth.startswith('Bearer '):
                return jsonify({'error': 'Unauthorized'}), 401
            token = auth[7:].strip()
            data = verify_user_token(secret_key, token)
            if not data:
                return jsonify({'error': 'Invalid or expired session'}), 401
            g.current_user_id = data['uid']
            g.current_user_email = data['email']
            return f(*args, **kwargs)

        return wrapped

    return decorator
