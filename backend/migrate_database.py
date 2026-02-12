"""
Database Migration Script
Migrates existing database to new schema with User, SubscriptionPlan, CreditPack models
"""

from flask import Flask
from models import db, User, SubscriptionPlan, CreditPack, Appeal
from config import Config
from credit_manager import initialize_pricing_data
from sqlalchemy import inspect

def migrate_database():
    """Run database migration"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        print("\n" + "="*60)
        print("DATABASE MIGRATION")
        print("="*60)
        
        # Get inspector to check existing tables
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print(f"\n✓ Found {len(existing_tables)} existing tables")
        
        # Create all tables (will only create missing ones)
        print("\n→ Creating new tables...")
        db.create_all()
        print("✓ Database schema updated")
        
        # Check if we need to migrate existing appeals
        if 'appeals' in existing_tables:
            # Check if payer column exists (new schema)
            columns = [col['name'] for col in inspector.get_columns('appeals')]
            
            if 'payer_name' in columns and 'payer' not in columns:
                print("\n→ Migrating appeals table...")
                print("   Adding 'payer' column and migrating data...")
                
                # Add new columns using raw SQL
                try:
                    with db.engine.connect() as conn:
                        # Add payer column
                        conn.execute(db.text("ALTER TABLE appeals ADD COLUMN payer VARCHAR(200)"))
                        # Copy data from payer_name to payer
                        conn.execute(db.text("UPDATE appeals SET payer = payer_name WHERE payer IS NULL"))
                        # Add other new columns
                        conn.execute(db.text("ALTER TABLE appeals ADD COLUMN appeal_level VARCHAR(50) DEFAULT 'level_1'"))
                        conn.execute(db.text("ALTER TABLE appeals ADD COLUMN credit_used BOOLEAN DEFAULT FALSE"))
                        conn.execute(db.text("ALTER TABLE appeals ADD COLUMN user_id INTEGER"))
                        conn.commit()
                        print("✓ Appeals table migrated successfully")
                except Exception as e:
                    print(f"⚠️  Migration note: {e}")
                    print("   This is normal if columns already exist")
        
        # Initialize pricing data
        print("\n→ Initializing pricing data...")
        initialize_pricing_data()
        
        # Print summary
        print("\n" + "="*60)
        print("MIGRATION COMPLETE")
        print("="*60)
        
        # Count records
        user_count = User.query.count()
        plan_count = SubscriptionPlan.query.count()
        pack_count = CreditPack.query.count()
        appeal_count = Appeal.query.count()
        
        print(f"\n📊 Database Summary:")
        print(f"   Users: {user_count}")
        print(f"   Subscription Plans: {plan_count}")
        print(f"   Credit Packs: {pack_count}")
        print(f"   Appeals: {appeal_count}")
        
        print("\n✅ Database is ready!")
        print("\nNext steps:")
        print("1. Update Stripe price IDs in the database")
        print("2. Test the new pricing endpoints")
        print("3. Test appeal generation with credits")
        print("\n")

if __name__ == '__main__':
    migrate_database()
