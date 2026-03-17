"""
Create Admin User Script
Run this to create your first admin account
"""

import os
import sys
from flask import Flask
from models import db, Admin
from admin_auth import admin_auth
from config import Config

def create_admin_user(username, password, email):
    """Create a new admin user"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Check if admin already exists
        existing = Admin.query.filter_by(username=username).first()
        if existing:
            print(f"❌ Admin '{username}' already exists!")
            return False
        
        # Create admin
        admin = admin_auth.create_admin(username, password, email)
        print(f"✅ Admin user created successfully!")
        print(f"   Username: {admin.username}")
        print(f"   Email: {admin.email}")
        print(f"   ID: {admin.id}")
        return True

if __name__ == '__main__':
    print("\n" + "="*60)
    print("CREATE ADMIN USER")
    print("="*60 + "\n")
    
    # Check if running with arguments
    if len(sys.argv) == 4:
        username = sys.argv[1]
        password = sys.argv[2]
        email = sys.argv[3]
    else:
        # Interactive mode
        print("Create your admin account:\n")
        username = input("Username: ").strip()
        password = input("Password: ").strip()
        email = input("Email: ").strip()
        
        if not username or not password or not email:
            print("❌ All fields are required!")
            sys.exit(1)
    
    # Create admin
    success = create_admin_user(username, password, email)
    
    if success:
        print("\n" + "="*60)
        print("ADMIN LOGIN CREDENTIALS")
        print("="*60)
        print(f"Username: {username}")
        print(f"Password: {password}")
        print(f"Email: {email}")
        print("\nLogin at: https://your-site.com/admin/login")
        print("="*60 + "\n")
        
        print("⚠️  IMPORTANT: Save these credentials securely!")
        print("⚠️  Change the password after first login if needed.\n")
    else:
        sys.exit(1)
