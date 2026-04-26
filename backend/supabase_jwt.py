"""
Supabase Auth JWT validation (HS256, project JWT secret).
No Flask sessions — used by the internal engine API.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional
from uuid import UUID

import jwt
from flask import request

# REMOVED: Flask-Login, password_hash, cookie sessions (Next.js/Supabase own auth)

SUPABASE_JWT_SECRET = (os.getenv("SUPABASE_JWT_SECRET") or "").strip()


def validate_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decode and verify a Supabase-issued access token.
    Returns decoded claims. Raises ValueError on missing/invalid token.
    """
    if not token or not str(token).strip():
        raise ValueError("Missing token")
    if not SUPABASE_JWT_SECRET:
        raise ValueError("SUPABASE_JWT_SECRET is not configured")
    t = str(token).strip()
    try:
        return jwt.decode(
            t,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except jwt.exceptions.PyJWTError as e:
        raise ValueError(f"Invalid token: {e}") from e


def jwt_subject_uuid(claims: Dict[str, Any]) -> Optional[UUID]:
    """User id in public.users and auth.users: JWT `sub` (UUID)."""
    sub = claims.get("sub")
    if not sub:
        return None
    try:
        return UUID(str(sub))
    except (ValueError, TypeError, AttributeError):
        return None


def jwt_email(claims: Dict[str, Any]) -> str:
    um = claims.get("user_metadata")
    um_email = ""
    if isinstance(um, dict):
        um_email = (um.get("email") or "").strip()
    return (claims.get("email") or um_email or "").strip() or ""


def bearer_from_request() -> Optional[str]:
    h = (request.headers.get("Authorization") or "").strip()
    if h.lower().startswith("bearer "):
        return h[7:].strip() or None
    return None
