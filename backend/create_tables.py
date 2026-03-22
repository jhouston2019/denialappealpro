"""
Create database tables for Medical Denial Appeal Pro
Run this script to initialize the database
"""
from app import app, db

def create_tables():
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("✅ Database tables created successfully!")
        print("\nTables created:")
        print("- appeals")
        print("- payments")
        print("\nYou can now use the application.")

if __name__ == '__main__':
    create_tables()
