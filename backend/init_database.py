"""
Database initialization script for Denial Appeal Pro
Creates all required database tables
"""
import sys
from app import app, db
from models import Appeal

def init_database():
    """Initialize the database and create all tables"""
    
    print("\n" + "="*60)
    print("DATABASE INITIALIZATION")
    print("="*60 + "\n")
    
    try:
        with app.app_context():
            # Check if tables already exist
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            if existing_tables:
                print(f"[INFO] Found {len(existing_tables)} existing table(s): {', '.join(existing_tables)}")
                
                response = input("\n[WARNING] Tables already exist. Do you want to recreate them? (yes/no): ")
                if response.lower() not in ['yes', 'y']:
                    print("\n[OK] Keeping existing tables. Database initialization cancelled.")
                    return True
                
                print("\n[WARNING] Dropping all existing tables...")
                db.drop_all()
                print("[OK] Tables dropped")
            
            # Create all tables
            print("\n[INFO] Creating database tables...")
            db.create_all()
            
            # Verify tables were created
            inspector = inspect(db.engine)
            created_tables = inspector.get_table_names()
            
            print("\n" + "="*60)
            print("[OK] DATABASE INITIALIZATION COMPLETE")
            print("="*60)
            print(f"\nCreated {len(created_tables)} table(s):")
            for table in created_tables:
                columns = inspector.get_columns(table)
                print(f"  - {table} ({len(columns)} columns)")
            
            print("\n" + "="*60 + "\n")
            return True
            
    except Exception as e:
        print("\n" + "="*60)
        print("[FAILED] DATABASE INITIALIZATION FAILED")
        print("="*60)
        print(f"\nError: {e}")
        print("\nPlease check:")
        print("  1. DATABASE_URL is correctly configured in .env")
        print("  2. Database server is running and accessible")
        print("  3. Database user has permission to create tables")
        print("\n" + "="*60 + "\n")
        return False

if __name__ == '__main__':
    success = init_database()
    sys.exit(0 if success else 1)
