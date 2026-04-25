"""
Create or update an admin user (password hash) in the database.

Run locally with backend/.env or on Fly (DATABASE_URL is already set):
  cd backend
  python reset_admin_password.py <username> <new_password> <email>

Example (Fly one-off):
  fly ssh console -a denial-appeal-pro -C "python /app/reset_admin_password.py jhouston66 YourPassword you@email.com"
"""

import sys

from flask import Flask

from admin_auth import admin_auth
from config import Config
from models import Admin, db


def main():
    if len(sys.argv) != 4:
        print(
            "Usage: python reset_admin_password.py <username> <new_password> <email>",
            file=sys.stderr,
        )
        sys.exit(1)

    username = sys.argv[1].strip()
    password = sys.argv[2]
    email = sys.argv[3].strip()
    if not username or not password or not email:
        print("Username, password, and email are required.", file=sys.stderr)
        sys.exit(1)

    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        admin = Admin.query.filter_by(username=username).first()
        if admin:
            admin.password_hash = admin_auth.hash_password(password)
            admin.email = email
            admin.is_active = True
            db.session.commit()
            print(f"Updated password and email for admin user '{username}'.")
        else:
            admin_auth.create_admin(username=username, password=password, email=email)
            print(f"Created admin user '{username}'.")


if __name__ == "__main__":
    main()
