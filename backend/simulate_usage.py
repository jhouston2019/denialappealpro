"""
Usage Simulation Script
Simulates appeal generation to test usage tracking and upgrade triggers
"""

from app import app, db
from models import User
from credit_manager import CreditManager
import time

def simulate_usage(email, num_appeals, delay=0.1):
    """
    Simulate generating multiple appeals for a user
    
    Args:
        email: User email address
        num_appeals: Number of appeals to simulate
        delay: Delay between appeals in seconds (default 0.1)
    """
    with app.app_context():
        print("\n" + "="*60)
        print("USAGE SIMULATION")
        print("="*60 + "\n")
        
        # Get or create user
        user = CreditManager.get_or_create_user(email)
        print(f"User: {user.email} (ID: {user.id})")
        
        # Check if user has a subscription
        if not user.subscription_tier:
            print("\n⚠️  User has no subscription. Setting to Starter for testing...")
            user.subscription_tier = 'starter'
            CreditManager.update_plan_limit(user.id)
            db.session.commit()
        
        # Get initial stats
        stats = CreditManager.get_usage_stats(user.id)
        print(f"\nInitial State:")
        print(f"  Plan: {stats['subscription_tier']} ({stats['plan_limit']} appeals/month)")
        print(f"  Current usage: {stats['appeals_generated_monthly']}/{stats['plan_limit']}")
        print(f"  Usage %: {stats['usage_percentage']:.1f}%")
        print(f"  Status: {stats['upgrade_status'] or 'normal'}")
        
        print(f"\nSimulating {num_appeals} appeal generations...")
        print("-" * 60)
        
        # Simulate appeals
        for i in range(num_appeals):
            CreditManager.increment_usage(user.id)
            
            # Get updated stats
            stats = CreditManager.get_usage_stats(user.id)
            
            # Show progress every 10 appeals or at thresholds
            show_update = (
                (i + 1) % 10 == 0 or
                stats['upgrade_status'] in ['warning', 'approaching_limit', 'limit_reached']
            )
            
            if show_update:
                status_emoji = {
                    'warning': '⚠️ ',
                    'approaching_limit': '🟠',
                    'limit_reached': '🔴'
                }.get(stats['upgrade_status'], '✓')
                
                print(f"{status_emoji} Appeal #{i+1}: {stats['appeals_generated_monthly']}/{stats['plan_limit']} " +
                      f"({stats['usage_percentage']:.1f}%) - {stats['upgrade_status'] or 'normal'}")
                
                # Show overage info
                if stats['overage_count'] > 0:
                    overage_cost = stats['overage_count'] * 0.50
                    print(f"   💰 Overage: {stats['overage_count']} appeals (${overage_cost:.2f})")
            
            time.sleep(delay)
        
        # Final stats
        print("-" * 60)
        stats = CreditManager.get_usage_stats(user.id)
        print(f"\nFinal State:")
        print(f"  Total appeals: {stats['appeals_generated_monthly']}/{stats['plan_limit']}")
        print(f"  Usage %: {stats['usage_percentage']:.1f}%")
        print(f"  Upgrade status: {stats['upgrade_status'] or 'normal'}")
        print(f"  Overage count: {stats['overage_count']}")
        
        if stats['overage_count'] > 0:
            overage_cost = stats['overage_count'] * 0.50
            print(f"  Overage cost: ${overage_cost:.2f}")
        
        print(f"\n  Today: {stats['appeals_generated_today']}")
        print(f"  This week: {stats['appeals_generated_weekly']}")
        
        print("\n" + "="*60)
        print("SIMULATION COMPLETE")
        print("="*60 + "\n")

def reset_user_usage(email):
    """Reset usage counters for a user (for testing)"""
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"❌ User not found: {email}")
            return
        
        user.appeals_generated_monthly = 0
        user.appeals_generated_weekly = 0
        user.appeals_generated_today = 0
        user.overage_count = 0
        db.session.commit()
        
        print(f"✓ Reset usage counters for {email}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python simulate_usage.py <email> [num_appeals]")
        print("  python simulate_usage.py reset <email>")
        print("\nExamples:")
        print("  python simulate_usage.py test@example.com 35")
        print("  python simulate_usage.py test@example.com 65")
        print("  python simulate_usage.py reset test@example.com")
        sys.exit(1)
    
    if sys.argv[1] == 'reset':
        if len(sys.argv) < 3:
            print("❌ Email required for reset")
            sys.exit(1)
        reset_user_usage(sys.argv[2])
    else:
        email = sys.argv[1]
        num_appeals = int(sys.argv[2]) if len(sys.argv) > 2 else 35
        simulate_usage(email, num_appeals)
