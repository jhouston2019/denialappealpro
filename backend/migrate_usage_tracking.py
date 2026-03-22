"""
Database migration to add usage tracking fields to User model
Run this script to update existing database schema
"""

from app import app, db
from models import User
from sqlalchemy import text

def migrate_usage_tracking():
    """Add usage tracking fields to users table"""
    with app.app_context():
        try:
            # Check if columns already exist
            inspector = db.inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('users')]
            
            migrations = []
            
            # Add new columns if they don't exist
            if 'appeals_generated_monthly' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN appeals_generated_monthly INTEGER DEFAULT 0 NOT NULL")
            
            if 'appeals_generated_weekly' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN appeals_generated_weekly INTEGER DEFAULT 0 NOT NULL")
            
            if 'appeals_generated_today' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN appeals_generated_today INTEGER DEFAULT 0 NOT NULL")
            
            if 'last_monthly_reset' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN last_monthly_reset DATE")
            
            if 'last_weekly_reset' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN last_weekly_reset DATE")
            
            if 'last_daily_reset' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN last_daily_reset DATE")
            
            if 'plan_limit' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN plan_limit INTEGER DEFAULT 0 NOT NULL")
            
            if 'overage_count' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN overage_count INTEGER DEFAULT 0 NOT NULL")
            
            if 'billing_status' not in existing_columns:
                migrations.append("ALTER TABLE users ADD COLUMN billing_status VARCHAR(50) DEFAULT 'active'")
            
            # Execute migrations
            if migrations:
                print(f"\n{'='*60}")
                print("RUNNING USAGE TRACKING MIGRATION")
                print(f"{'='*60}\n")
                
                for migration in migrations:
                    print(f"Executing: {migration}")
                    db.session.execute(text(migration))
                
                db.session.commit()
                print(f"\n✓ Successfully added {len(migrations)} new columns")
                
                # Update plan limits for existing users with subscriptions
                print("\nUpdating plan limits for existing users...")
                users_with_subs = User.query.filter(User.subscription_tier.isnot(None)).all()
                
                tier_limits = {
                    'starter': 50,
                    'core': 300,
                    'scale': 1000
                }
                
                for user in users_with_subs:
                    if user.subscription_tier in tier_limits:
                        user.plan_limit = tier_limits[user.subscription_tier]
                        print(f"  - User {user.email}: {user.subscription_tier} -> {user.plan_limit} appeals/month")
                
                db.session.commit()
                print(f"\n✓ Updated {len(users_with_subs)} users with plan limits")
                
            else:
                print("\n✓ All usage tracking columns already exist - no migration needed")
            
            print(f"\n{'='*60}")
            print("MIGRATION COMPLETE")
            print(f"{'='*60}\n")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    migrate_usage_tracking()
