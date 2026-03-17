"""
Admin Authentication Module
Handles admin login, session management, and password hashing
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from models import db, Admin

class AdminAuth:
    """Admin authentication and session management"""
    
    # In-memory session store (use Redis in production for multi-server)
    active_sessions = {}
    SESSION_DURATION = timedelta(hours=8)
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using SHA-256 with salt"""
        salt = "denial_appeal_pro_admin_salt_2026"
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return AdminAuth.hash_password(password) == password_hash
    
    @staticmethod
    def create_session(admin_id: int) -> str:
        """Create new admin session and return token"""
        token = secrets.token_urlsafe(32)
        AdminAuth.active_sessions[token] = {
            'admin_id': admin_id,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + AdminAuth.SESSION_DURATION
        }
        return token
    
    @staticmethod
    def validate_session(token: str) -> dict:
        """Validate session token and return session data"""
        if not token or token not in AdminAuth.active_sessions:
            return None
        
        session = AdminAuth.active_sessions[token]
        if datetime.utcnow() > session['expires_at']:
            del AdminAuth.active_sessions[token]
            return None
        
        return session
    
    @staticmethod
    def destroy_session(token: str):
        """Destroy admin session"""
        if token in AdminAuth.active_sessions:
            del AdminAuth.active_sessions[token]
    
    @staticmethod
    def login(username: str, password: str) -> dict:
        """Authenticate admin and create session"""
        admin = Admin.query.filter_by(username=username, is_active=True).first()
        
        if not admin:
            return {'success': False, 'error': 'Invalid credentials'}
        
        if not AdminAuth.verify_password(password, admin.password_hash):
            return {'success': False, 'error': 'Invalid credentials'}
        
        # Update last login
        admin.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create session
        token = AdminAuth.create_session(admin.id)
        
        return {
            'success': True,
            'token': token,
            'admin': {
                'id': admin.id,
                'username': admin.username,
                'email': admin.email
            }
        }
    
    @staticmethod
    def create_admin(username: str, password: str, email: str) -> Admin:
        """Create new admin user"""
        password_hash = AdminAuth.hash_password(password)
        admin = Admin(
            username=username,
            password_hash=password_hash,
            email=email
        )
        db.session.add(admin)
        db.session.commit()
        return admin

def require_admin(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]
        
        session = AdminAuth.validate_session(token)
        if not session:
            return jsonify({'error': 'Unauthorized - Admin login required'}), 401
        
        # Add admin_id to request context
        request.admin_id = session['admin_id']
        return f(*args, **kwargs)
    
    return decorated_function

admin_auth = AdminAuth()
