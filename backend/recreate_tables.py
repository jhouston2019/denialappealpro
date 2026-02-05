"""
Drop and recreate database tables with updated schema
"""
from app import app, db

def recreate_tables():
    with app.app_context():
        print("Dropping existing tables...")
        db.drop_all()
        print("✅ Tables dropped")
        
        print("\nCreating new tables with updated schema...")
        db.create_all()
        print("✅ Database tables created successfully!")
        print("\nTables created:")
        print("- appeals (with diagnosis_code and billed_amount)")
        print("- payments")
        print("\nYou can now use the application.")

if __name__ == '__main__':
    recreate_tables()
