"""
Atomic Operations Test Suite
Tests for race conditions and credit separation
"""

import concurrent.futures
import time
from flask import Flask
from models import db, User, SubscriptionPlan
from config import Config
from credit_manager import CreditManager

def test_parallel_credit_deduction():
    """Test: 20 parallel credit deductions should not over-deduct"""
    print("\n" + "="*60)
    print("TEST: Parallel Credit Deduction (Race Condition)")
    print("="*60)
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Create test user with 10 credits
        test_user = User.query.filter_by(email='test_parallel@test.com').first()
        if not test_user:
            test_user = User(
                email='test_parallel@test.com',
                subscription_credits=5,
                bulk_credits=5
            )
            db.session.add(test_user)
            db.session.commit()
        else:
            test_user.subscription_credits = 5
            test_user.bulk_credits = 5
            db.session.commit()
        
        print(f"Initial credits: {test_user.subscription_credits + test_user.bulk_credits}")
        
        # Try to deduct 20 credits in parallel (should only succeed 10 times)
        def deduct():
            with app.app_context():
                return CreditManager.deduct_credit(test_user.id)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(deduct) for _ in range(20)]
            results = [f.result() for f in futures]
        
        successes = sum(results)
        
        # Refresh user
        db.session.expire(test_user)
        final_credits = test_user.subscription_credits + test_user.bulk_credits
        
        print(f"Attempted deductions: 20")
        print(f"Successful deductions: {successes}")
        print(f"Final credits: {final_credits}")
        print(f"Expected: 0 (10 initial - 10 successful)")
        
        if final_credits == 0 and successes == 10:
            print("✅ PASS: No race condition, atomic operations working")
            return True
        else:
            print(f"❌ FAIL: Race condition detected!")
            print(f"   Expected 10 successes, got {successes}")
            print(f"   Expected 0 final credits, got {final_credits}")
            return False

def test_subscription_preserves_bulk():
    """Test: Subscription renewal preserves bulk credits"""
    print("\n" + "="*60)
    print("TEST: Subscription Renewal Preserves Bulk Credits")
    print("="*60)
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Create test user
        test_user = User.query.filter_by(email='test_renewal@test.com').first()
        if not test_user:
            test_user = User(
                email='test_renewal@test.com',
                subscription_tier='starter',
                subscription_credits=5,
                bulk_credits=50
            )
            db.session.add(test_user)
            db.session.commit()
        else:
            test_user.subscription_tier = 'starter'
            test_user.subscription_credits = 5
            test_user.bulk_credits = 50
            db.session.commit()
        
        print(f"Before renewal:")
        print(f"  Subscription credits: {test_user.subscription_credits}")
        print(f"  Bulk credits: {test_user.bulk_credits}")
        print(f"  Total: {test_user.subscription_credits + test_user.bulk_credits}")
        
        # Simulate renewal
        CreditManager.allocate_monthly_credits(test_user.id)
        
        # Refresh
        db.session.expire(test_user)
        
        print(f"\nAfter renewal:")
        print(f"  Subscription credits: {test_user.subscription_credits}")
        print(f"  Bulk credits: {test_user.bulk_credits}")
        print(f"  Total: {test_user.subscription_credits + test_user.bulk_credits}")
        
        # Starter plan has 20 included credits
        if test_user.subscription_credits == 20 and test_user.bulk_credits == 50:
            print("✅ PASS: Bulk credits preserved, subscription reset to 20")
            return True
        else:
            print(f"❌ FAIL: Expected sub=20, bulk=50")
            print(f"   Got sub={test_user.subscription_credits}, bulk={test_user.bulk_credits}")
            return False

def test_credit_deduction_order():
    """Test: Credits deducted from subscription first, then bulk"""
    print("\n" + "="*60)
    print("TEST: Credit Deduction Order (Subscription First)")
    print("="*60)
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Create test user
        test_user = User.query.filter_by(email='test_order@test.com').first()
        if not test_user:
            test_user = User(
                email='test_order@test.com',
                subscription_credits=3,
                bulk_credits=10
            )
            db.session.add(test_user)
            db.session.commit()
        else:
            test_user.subscription_credits = 3
            test_user.bulk_credits = 10
            db.session.commit()
        
        print(f"Initial: sub={test_user.subscription_credits}, bulk={test_user.bulk_credits}")
        
        # Deduct 5 credits
        for i in range(5):
            CreditManager.deduct_credit(test_user.id)
            db.session.expire(test_user)
            print(f"After deduction {i+1}: sub={test_user.subscription_credits}, bulk={test_user.bulk_credits}")
        
        # Should have used all 3 subscription + 2 bulk
        if test_user.subscription_credits == 0 and test_user.bulk_credits == 8:
            print("✅ PASS: Subscription credits used first, then bulk")
            return True
        else:
            print(f"❌ FAIL: Expected sub=0, bulk=8")
            print(f"   Got sub={test_user.subscription_credits}, bulk={test_user.bulk_credits}")
            return False

def test_bulk_credit_accumulation():
    """Test: Bulk credits accumulate correctly"""
    print("\n" + "="*60)
    print("TEST: Bulk Credit Accumulation")
    print("="*60)
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Create test user
        test_user = User.query.filter_by(email='test_bulk@test.com').first()
        if not test_user:
            test_user = User(
                email='test_bulk@test.com',
                subscription_credits=0,
                bulk_credits=50
            )
            db.session.add(test_user)
            db.session.commit()
        else:
            test_user.subscription_credits = 0
            test_user.bulk_credits = 50
            db.session.commit()
        
        print(f"Initial bulk: {test_user.bulk_credits}")
        
        # Add 100 credits
        CreditManager.add_credits(test_user.id, 100)
        db.session.expire(test_user)
        print(f"After adding 100: {test_user.bulk_credits}")
        
        # Add 250 more
        CreditManager.add_credits(test_user.id, 250)
        db.session.expire(test_user)
        print(f"After adding 250: {test_user.bulk_credits}")
        
        if test_user.bulk_credits == 400:  # 50 + 100 + 250
            print("✅ PASS: Bulk credits accumulate correctly")
            return True
        else:
            print(f"❌ FAIL: Expected 400, got {test_user.bulk_credits}")
            return False

def run_all_tests():
    """Run all atomic operation tests"""
    print("\n" + "="*60)
    print("ATOMIC OPERATIONS TEST SUITE")
    print("="*60)
    print("\nTesting revenue protection mechanisms...\n")
    
    results = []
    
    results.append(("Parallel Deduction", test_parallel_credit_deduction()))
    results.append(("Subscription Preserves Bulk", test_subscription_preserves_bulk()))
    results.append(("Deduction Order", test_credit_deduction_order()))
    results.append(("Bulk Accumulation", test_bulk_credit_accumulation()))
    
    print("\n" + "="*60)
    print("TEST RESULTS")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ ALL TESTS PASSED - ATOMIC OPERATIONS VERIFIED")
        print("="*60)
        print("\nRevenue protection is working correctly:")
        print("  ✓ No race conditions in parallel operations")
        print("  ✓ Subscription renewals preserve bulk credits")
        print("  ✓ Credit deduction order is correct")
        print("  ✓ Bulk credits accumulate properly")
        print("\n🚀 System ready for production deployment")
    else:
        print("❌ SOME TESTS FAILED - DO NOT DEPLOY")
        print("="*60)
        print("\nFix failing tests before production deployment")
    
    print("\n")
    return all_passed

if __name__ == '__main__':
    run_all_tests()
