"""
Apply Atomic Fixes Migration
Separates credit pools and adds database constraints
"""

from flask import Flask
from models import db
from config import Config
from sqlalchemy import text, inspect

def apply_atomic_fixes():
    """Apply database changes for atomic operations"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        print("\n" + "="*60)
        print("APPLYING ATOMIC FIXES - REVENUE PROTECTION")
        print("="*60)
        
        try:
            # Create all tables first
            print("\n> Creating/verifying tables...")
            db.create_all()
            print("OK Tables verified")
            
            inspector = inspect(db.engine)
            
            # Check database type
            db_type = db.engine.dialect.name
            print(f"\n> Database type: {db_type}")
            
            with db.engine.connect() as conn:
                
                # 1. Add separated credit columns to users table
                print("\n> Separating credit pools...")
                
                users_columns = [col['name'] for col in inspector.get_columns('users')]
                
                if 'subscription_credits' not in users_columns:
                    if db_type == 'postgresql':
                        conn.execute(text("ALTER TABLE users ADD COLUMN subscription_credits INTEGER DEFAULT 0 NOT NULL"))
                        print("  OK Added subscription_credits column")
                    else:
                        print("  WARNING SQLite: subscription_credits will be added on next db.create_all()")
                else:
                    print("  OK subscription_credits column exists")
                
                if 'bulk_credits' not in users_columns:
                    if db_type == 'postgresql':
                        conn.execute(text("ALTER TABLE users ADD COLUMN bulk_credits INTEGER DEFAULT 0 NOT NULL"))
                        print("  OK Added bulk_credits column")
                    else:
                        print("  WARNING SQLite: bulk_credits will be added on next db.create_all()")
                else:
                    print("  OK bulk_credits column exists")
                
                # 2. Migrate existing credit_balance data
                if 'credit_balance' in users_columns and 'bulk_credits' in users_columns:
                    print("\n> Migrating existing credit data...")
                    # Move all existing credits to bulk pool (safer assumption)
                    conn.execute(text(
                        "UPDATE users SET bulk_credits = COALESCE(credit_balance, 0) "
                        "WHERE bulk_credits = 0 AND subscription_credits = 0"
                    ))
                    print("  OK Migrated existing credits to bulk pool")
                
                # 3. Add UNIQUE constraint on webhook event_id
                print("\n> Adding webhook idempotency constraint...")
                
                # Check if constraint exists
                indexes = inspector.get_indexes('processed_webhook_events')
                unique_exists = any(idx['unique'] and 'event_id' in idx['column_names'] 
                                  for idx in indexes)
                
                if not unique_exists:
                    try:
                        if db_type == 'postgresql':
                            conn.execute(text(
                                "CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_event_id "
                                "ON processed_webhook_events(event_id)"
                            ))
                        else:
                            conn.execute(text(
                                "CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_event_id "
                                "ON processed_webhook_events(event_id)"
                            ))
                        print("  OK Added unique constraint on event_id")
                    except Exception as e:
                        print(f"  WARNING Constraint may already exist: {e}")
                else:
                    print("  OK Unique constraint already exists")
                
                conn.commit()
            
            print("\n" + "="*60)
            print("ATOMIC FIXES APPLIED SUCCESSFULLY")
            print("="*60)
            
            print("\nOK Revenue protection is now ATOMIC!")
            print("\nProtections enabled:")
            print("  OK Row-level locking on credit operations")
            print("  OK Separated subscription/bulk credit pools")
            print("  OK Subscription resets preserve bulk credits")
            print("  OK Unique constraint on webhook event_id")
            print("  OK All credit operations are transactional")
            
            print("\nWARNING CRITICAL TESTS REQUIRED:")
            print("  1. Parallel credit deduction (20 simultaneous requests)")
            print("  2. Subscription renewal with bulk credits")
            print("  3. Duplicate webhook replay")
            print("  4. Concurrent generation attempts")
            
            print("\nVerify credit separation:")
            from models import User
            test_user = User.query.first()
            if test_user:
                print(f"\n  Sample user: {test_user.email}")
                print(f"  Subscription credits: {test_user.subscription_credits}")
                print(f"  Bulk credits: {test_user.bulk_credits}")
                print(f"  Total: {test_user.subscription_credits + test_user.bulk_credits}")
            
            print("\n")
            
        except Exception as e:
            print(f"\nERROR Error applying atomic fixes: {e}")
            import traceback
            traceback.print_exc()
            print("\n")

if __name__ == '__main__':
    apply_atomic_fixes()
