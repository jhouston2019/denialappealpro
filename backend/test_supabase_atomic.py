"""
Supabase PostgreSQL Atomic Operations Validation
Tests financial atomicity and concurrency safety
"""

import requests
import time
from flask import Flask
from models import db, User
from config import Config
from credit_manager import CreditManager

BASE_URL = "http://localhost:5000"

def test_parallel_deduction():
    """Test 1: Parallel deduction with 10 credits, 20 requests"""
    print("\n" + "="*60)
    print("TEST 1: PARALLEL DEDUCTION (10 credits, 20 requests)")
    print("="*60)
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Create test user with 10 credits
        user = User.query.filter_by(email='test_parallel@atomic.test').first()
        if not user:
            user = User(email='test_parallel@atomic.test')
            db.session.add(user)
            db.session.commit()
        
        user.subscription_credits = 10
        user.bulk_credits = 0
        db.session.commit()
        
        print(f"Initial state: sub={user.subscription_credits}, bulk={user.bulk_credits}")
        
        # Call internal test endpoint
        response = requests.post(f"{BASE_URL}/internal/test-parallel-deduction", json={
            'user_id': user.id,
            'threads': 20
        })
        
        if response.status_code == 200:
            result = response.json()
            print(f"\nParallel Deduction Result:")
            print(f"Success: {result['success']}")
            print(f"Fail: {result['fail']}")
            print(f"Final Subscription: {result['final_subscription_credits']}")
            print(f"Final Bulk: {result['final_bulk_credits']}")
            print(f"Final Total: {result['final_total']}")
            
            # Validation
            expected_success = 10
            expected_final = 0
            
            if result['success'] == expected_success and result['final_total'] == expected_final:
                print("\nRESULT: PASS")
                return True
            else:
                print(f"\nRESULT: FAIL")
                print(f"Expected {expected_success} successes, got {result['success']}")
                print(f"Expected {expected_final} final credits, got {result['final_total']}")
                return False
        else:
            print(f"ERROR: {response.status_code} - {response.text}")
            return False

def test_credit_isolation():
    """Test 2: Credit isolation (subscription + bulk)"""
    print("\n" + "="*60)
    print("TEST 2: CREDIT ISOLATION (subscription + bulk)")
    print("="*60)
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Create test user
        user = User.query.filter_by(email='test_isolation@atomic.test').first()
        if not user:
            user = User(email='test_isolation@atomic.test', subscription_tier='starter')
            db.session.add(user)
            db.session.commit()
        
        user.subscription_credits = 5
        user.bulk_credits = 10
        user.subscription_tier = 'starter'
        db.session.commit()
        
        print(f"Initial: sub={user.subscription_credits}, bulk={user.bulk_credits}")
        
        # Deduct 8 credits
        for i in range(8):
            CreditManager.deduct_credit(user.id)
        
        db.session.expire(user)
        user = User.query.get(user.id)
        
        print(f"After 8 deductions: sub={user.subscription_credits}, bulk={user.bulk_credits}")
        
        # Validate: should use all 5 subscription + 3 bulk
        if user.subscription_credits == 0 and user.bulk_credits == 7:
            print("\nRESULT: PASS")
            return True
        else:
            print(f"\nRESULT: FAIL")
            print(f"Expected sub=0, bulk=7")
            print(f"Got sub={user.subscription_credits}, bulk={user.bulk_credits}")
            return False

def test_webhook_duplicate():
    """Test 3: Webhook duplicate handling"""
    print("\n" + "="*60)
    print("TEST 3: WEBHOOK DUPLICATE HANDLING")
    print("="*60)
    
    event_id = f"test_atomic_{int(time.time())}"
    
    response = requests.post(f"{BASE_URL}/internal/test-webhook-duplicate", json={
        'event_id': event_id
    })
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nWebhook Duplicate Test:")
        print(f"Processed Events Count: {result['events_in_database']}")
        print(f"Unique Constraint Working: {result['unique_constraint_working']}")
        
        if result['events_in_database'] == 1 and result['unique_constraint_working']:
            print("\nRESULT: PASS")
            return True
        else:
            print("\nRESULT: FAIL")
            print(f"Expected 1 event in database, got {result['events_in_database']}")
            return False
    else:
        print(f"ERROR: {response.status_code} - {response.text}")
        return False

def run_all_tests():
    """Run all atomic validation tests"""
    print("\n" + "="*60)
    print("SUPABASE POSTGRESQL ATOMIC VALIDATION")
    print("="*60)
    print("\nStarting Flask server test at http://localhost:5000")
    print("Ensure backend is running before executing tests\n")
    
    time.sleep(1)
    
    results = []
    
    try:
        results.append(("Parallel Deduction", test_parallel_deduction()))
    except Exception as e:
        print(f"ERROR in parallel deduction test: {e}")
        results.append(("Parallel Deduction", False))
    
    try:
        results.append(("Credit Isolation", test_credit_isolation()))
    except Exception as e:
        print(f"ERROR in credit isolation test: {e}")
        results.append(("Credit Isolation", False))
    
    try:
        results.append(("Webhook Duplicate", test_webhook_duplicate()))
    except Exception as e:
        print(f"ERROR in webhook duplicate test: {e}")
        results.append(("Webhook Duplicate", False))
    
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    
    for test_name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("ALL TESTS PASSED - ATOMIC OPERATIONS VERIFIED")
    else:
        print("SOME TESTS FAILED - REVIEW RESULTS ABOVE")
    print("="*60)
    print("\n")
    
    return all_passed

if __name__ == '__main__':
    run_all_tests()
