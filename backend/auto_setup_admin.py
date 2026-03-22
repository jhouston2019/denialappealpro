"""
Auto-Setup Admin System
Automatically creates admin table and default admin user on startup
"""

import os
import logging
from models import db, Admin
from admin_auth import admin_auth

logger = logging.getLogger(__name__)

def auto_setup_admin():
    """
    Automatically set up admin system on backend startup
    - Creates admin table if it doesn't exist
    - Creates default admin user if none exists
    """
    try:
        # Check if admin table exists by trying to query it
        try:
            admin_count = Admin.query.count()
            logger.info(f"Admin table exists with {admin_count} admin(s)")
        except Exception:
            # Table doesn't exist, create it
            logger.info("Creating admin table...")
            db.create_all()
            logger.info("✅ Admin table created successfully")
            admin_count = 0
        
        # Create default admin if none exists
        if admin_count == 0:
            logger.info("No admin users found. Creating default admin...")
            
            # Get credentials from environment or use defaults
            default_username = os.getenv('ADMIN_USERNAME', 'admin')
            default_password = os.getenv('ADMIN_PASSWORD', 'DenialAppeal2026!')
            default_email = os.getenv('ADMIN_EMAIL', 'admin@denialappealpro.com')
            
            admin = admin_auth.create_admin(
                username=default_username,
                password=default_password,
                email=default_email
            )
            
            logger.info("="*60)
            logger.info("✅ DEFAULT ADMIN ACCOUNT CREATED")
            logger.info("="*60)
            logger.info(f"Username: {default_username}")
            logger.info(f"Password: {default_password}")
            logger.info(f"Email: {default_email}")
            logger.info(f"Login at: /admin/login")
            logger.info("="*60)
            logger.info("⚠️  IMPORTANT: Change password after first login!")
            logger.info("="*60)
            
            return True
        else:
            logger.info(f"✅ Admin system ready ({admin_count} admin user(s) exist)")
            return True
            
    except Exception as e:
        logger.error(f"❌ Failed to auto-setup admin: {e}")
        return False
