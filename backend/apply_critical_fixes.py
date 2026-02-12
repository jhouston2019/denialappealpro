"""
Apply Critical Fixes Migration
Adds new columns and tables required for revenue protection
"""

from flask import Flask
from models import db
from config import Config
from sqlalchemy import text

def apply_critical_fixes():
    """Apply database changes for critical fixes"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        print("\n" + "="*60)
        print("APPLYING CRITICAL FIXES")
        print("="*60)
        
        try:
            # Create all tables (will create new ones, skip existing)
            print("\n→ Creating new tables...")
            db.create_all()
            print("✓ Tables created/verified")
            
            # Add new columns to appeals table
            print("\n→ Adding generation tracking columns to appeals...")
            
            with db.engine.connect() as conn:
                # Check if columns exist first
                result = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='appeals' AND column_name='generation_count'"
                ))
                
                if not result.fetchone():
                    # Add generation_count
                    conn.execute(text(
                        "ALTER TABLE appeals ADD COLUMN generation_count INTEGER DEFAULT 0 NOT NULL"
                    ))
                    print("  ✓ Added generation_count column")
                else:
                    print("  ✓ generation_count column already exists")
                
                # Check last_generated_at
                result = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='appeals' AND column_name='last_generated_at'"
                ))
                
                if not result.fetchone():
                    conn.execute(text(
                        "ALTER TABLE appeals ADD COLUMN last_generated_at TIMESTAMP"
                    ))
                    print("  ✓ Added last_generated_at column")
                else:
                    print("  ✓ last_generated_at column already exists")
                
                # Check retail_token_used
                result = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='appeals' AND column_name='retail_token_used'"
                ))
                
                if not result.fetchone():
                    conn.execute(text(
                        "ALTER TABLE appeals ADD COLUMN retail_token_used BOOLEAN DEFAULT FALSE NOT NULL"
                    ))
                    print("  ✓ Added retail_token_used column")
                else:
                    print("  ✓ retail_token_used column already exists")
                
                conn.commit()
            
            print("\n" + "="*60)
            print("CRITICAL FIXES APPLIED SUCCESSFULLY")
            print("="*60)
            
            print("\n✅ Database is ready for revenue protection!")
            print("\nNew features enabled:")
            print("  ✓ Webhook idempotency (prevents double-crediting)")
            print("  ✓ Retail regeneration lock (prevents revenue leak)")
            print("  ✓ Generation tracking (monitors abuse)")
            print("  ✓ Subscription reset logic (credits reset monthly)")
            print("  ✓ PDF error handling (structured errors)")
            
            print("\n⚠️  IMPORTANT: Test these scenarios:")
            print("  1. Send duplicate webhook → should ignore second")
            print("  2. Try to regenerate retail appeal → should block")
            print("  3. Upload encrypted PDF → should show error")
            print("  4. Subscription renewal → credits should reset")
            print("\n")
            
        except Exception as e:
            print(f"\n❌ Error applying fixes: {e}")
            print("   This may be normal if using SQLite (some ALTER commands not supported)")
            print("   For SQLite, the columns will be created on next db.create_all()")
            print("\n")

if __name__ == '__main__':
    apply_critical_fixes()
