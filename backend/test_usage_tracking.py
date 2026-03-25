"""
Test script for usage-based pricing system
Verifies usage tracking, counter resets, and upgrade triggers
"""

from app import app, db
from models import User
from credit_manager import CreditManager, PricingManager
from datetime import date, timedelta

def test_usage_tracking():
    """Test complete usage tracking system"""
    with app.app_context():
        print("\n" + "="*60)
        print("TESTING USAGE-BASED PRICING SYSTEM")
        print("="*60 + "\n")
        
        # Create test user
        test_email = f"test_usage_{int(date.today().timestamp())}@example.com"
        user = CreditManager.get_or_create_user(test_email)
        print(f"✓ Created test user: {user.email} (ID: {user.id})")
        
        # Set subscription tier
        user.subscription_tier = 'starter'
        CreditManager.update_plan_limit(user.id)
        db.session.commit()
        starter_limit = PricingManager.get_subscription_tier('starter')['included_appeals']
        print(f"✓ Set to Starter plan (limit: {starter_limit} appeals/month)")
        
        # Test 1: Initial usage
        print("\n--- Test 1: Initial Usage ---")
        stats = CreditManager.get_usage_stats(user.id)
        print(f"Initial usage: {stats['appeals_generated_monthly']}/{stats['plan_limit']}")
        assert stats['appeals_generated_monthly'] == 0, "Initial usage should be 0"
        print("✓ Initial state correct")
        
        # Test 2: Increment usage (warning ~70% at 11/15)
        print("\n--- Test 2: Increment Usage ---")
        for i in range(11):
            CreditManager.increment_usage(user.id)
        
        stats = CreditManager.get_usage_stats(user.id)
        print(f"After 11 appeals: {stats['appeals_generated_monthly']}/{stats['plan_limit']}")
        print(f"Usage percentage: {stats['usage_percentage']}%")
        print(f"Upgrade status: {stats['upgrade_status']}")
        assert stats['appeals_generated_monthly'] == 11, "Should have 11 appeals"
        assert stats['upgrade_status'] == 'warning', "Should show warning at 70%"
        print("✓ Warning threshold triggered correctly")
        
        # Test 3: Approach limit (~90% at 14/15)
        print("\n--- Test 3: Approaching Limit ---")
        for i in range(3):
            CreditManager.increment_usage(user.id)
        
        stats = CreditManager.get_usage_stats(user.id)
        print(f"After 14 appeals: {stats['appeals_generated_monthly']}/{stats['plan_limit']}")
        print(f"Usage percentage: {stats['usage_percentage']}%")
        print(f"Upgrade status: {stats['upgrade_status']}")
        assert stats['upgrade_status'] == 'approaching_limit', "Should show approaching limit at 90%"
        print("✓ Approaching limit threshold triggered correctly")
        
        # Test 4: Reach limit
        print("\n--- Test 4: Reach Limit ---")
        CreditManager.increment_usage(user.id)
        
        stats = CreditManager.get_usage_stats(user.id)
        print(f"After 15 appeals: {stats['appeals_generated_monthly']}/{stats['plan_limit']}")
        print(f"Usage percentage: {stats['usage_percentage']}%")
        print(f"Upgrade status: {stats['upgrade_status']}")
        assert stats['upgrade_status'] == 'limit_reached', "Should show limit reached at 100%"
        print("✓ Limit reached threshold triggered correctly")
        
        # Test 5: Overage tracking
        print("\n--- Test 5: Overage Tracking ---")
        for i in range(15):
            CreditManager.increment_usage(user.id)
        
        stats = CreditManager.get_usage_stats(user.id)
        print(f"After 30 appeals: {stats['appeals_generated_monthly']}/{stats['plan_limit']}")
        print(f"Overage count: {stats['overage_count']}")
        starter_overage = float(PricingManager.get_subscription_tier('starter')['overage_price'])
        print(f"Overage cost: ${stats['overage_count'] * starter_overage:.2f}")
        assert stats['overage_count'] == 15, "Should have 15 overages"
        print("✓ Overage tracking working correctly")
        
        # Test 6: Next tier suggestion
        print("\n--- Test 6: Upgrade Suggestions ---")
        next_tier = PricingManager.get_next_tier('starter')
        st = PricingManager.get_subscription_tier('starter')
        print(f"Current tier: Starter (${st['monthly_price']}, {st['included_appeals']} appeals)")
        print(f"Suggested upgrade: {next_tier['name']} (${next_tier['monthly_price']}, {next_tier['included_appeals']} appeals)")
        assert next_tier['tier_id'] == 'core', "Next tier should be core (Growth)"
        print("✓ Upgrade suggestion correct")
        
        # Test 7: Counter resets
        print("\n--- Test 7: Counter Reset Logic ---")
        user = User.query.get(user.id)
        user.last_monthly_reset = date.today() - timedelta(days=35)
        db.session.commit()
        
        CreditManager.reset_usage_counters_if_needed(user.id)
        stats = CreditManager.get_usage_stats(user.id)
        print(f"After monthly reset: {stats['appeals_generated_monthly']}/{stats['plan_limit']}")
        assert stats['appeals_generated_monthly'] == 0, "Monthly counter should reset"
        assert stats['overage_count'] == 0, "Overage should reset"
        print("✓ Monthly reset working correctly")
        
        # Test 8: Upgrade to next tier
        print("\n--- Test 8: Tier Upgrade ---")
        user.subscription_tier = 'core'
        CreditManager.update_plan_limit(user.id)
        db.session.commit()
        
        core_limit = PricingManager.get_subscription_tier('core')['included_appeals']
        stats = CreditManager.get_usage_stats(user.id)
        print(f"After upgrade to Growth: limit = {stats['plan_limit']}")
        assert stats['plan_limit'] == core_limit, "Growth plan should match configured appeals"
        print("✓ Plan limit updated correctly")
        
        # Cleanup
        print("\n--- Cleanup ---")
        db.session.delete(user)
        db.session.commit()
        print(f"✓ Deleted test user")
        
        print("\n" + "="*60)
        print("ALL TESTS PASSED ✓")
        print("="*60 + "\n")

if __name__ == '__main__':
    test_usage_tracking()
