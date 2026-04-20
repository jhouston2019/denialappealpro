"""
HTTP-only Flask session helpers: bind, validate, light fingerprint (User-Agent + soft IP).
"""
from __future__ import annotations

import hashlib
import logging
from typing import Any, Optional, Tuple

from flask import g, jsonify, request, session

logger = logging.getLogger(__name__)


def _ua_hash() -> str:
    ua = request.headers.get('User-Agent') or ''
    return hashlib.sha256(ua.encode('utf-8', errors='replace')).hexdigest()[:32]


def _client_ip() -> str:
    xff = (request.headers.get('X-Forwarded-For') or '').strip()
    if xff:
        return xff.split(',')[0].strip()[:45]
    return (request.remote_addr or '')[:45]


def bind_customer_session(user, log: Optional[logging.Logger] = None) -> None:
    """Rotate session and bind to user (call after login / Stripe session creation)."""
    lg = log or logger
    session.clear()
    session.permanent = True
    session['uid'] = user.id
    session['email'] = user.email or ''
    session['ua_hash'] = _ua_hash()
    session['ip'] = _client_ip()
    session.modified = True
    lg.info('customer session bound user_id=%s', user.id)


def validate_customer_session() -> Tuple[Optional[int], Optional[Tuple[Any, int]]]:
    """
    Ensure session matches current UA (and soft IP). Sets g.current_user_id / g.current_user_email.
    Returns (uid, None) on success, or (None, (response, status_code)).
    """
    uid = session.get('uid')
    if uid is None:
        return None, (jsonify({'error': 'Unauthorized'}), 401)
    try:
        uid_int = int(uid)
    except (TypeError, ValueError):
        session.clear()
        return None, (jsonify({'error': 'Unauthorized'}), 401)

    stored_ua = session.get('ua_hash')
    cur_ua = _ua_hash()
    if not stored_ua or stored_ua != cur_ua:
        logger.warning('session invalidated: ua mismatch uid=%s', uid_int)
        session.clear()
        return None, (jsonify({'error': 'Unauthorized'}), 401)

    stored_ip = session.get('ip') or ''
    cur_ip = _client_ip()
    if stored_ip and cur_ip and stored_ip != cur_ip:
        logger.warning('session invalidated: ip mismatch uid=%s', uid_int)
        session.clear()
        return None, (jsonify({'error': 'Unauthorized'}), 401)

    g.current_user_id = uid_int
    g.current_user_email = session.get('email')
    return uid_int, None
