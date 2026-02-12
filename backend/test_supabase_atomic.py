"""
Supabase PostgreSQL Atomic Validation
Financial atomicity and concurrency safety
"""

import concurrent.futures
from flask import Flask
from models import db, User, ProcessedWebhookEvent
from config import Config
from credit_manager import CreditManager

def test_parallel_deduction():
    """Test 1: Parallel deduction - 10 credits, 20 threads"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Create user with 10 subscription credits
        user = User.query.filter_by(email='atomic_test_parallel@test.com').first()
        if not user:
            user = User(email='atomic_test_parallel@test.com')
            db.session.add(user)
            db.session.commit()
        
        user.subscription_credits = 10
        user.bulk_credits = 0
        db.session.commit()
        
        # Spawn 20 parallel deductions
        def deduct():
            return CreditManager.deduct_credit(user.id)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(deduct) for _ in range(20)]
            results = [f.result() for f in futures]
        
        success = sum(results)
        fail = len(results) - success
        
        # Get final state
        db.session.expire(user)
        user = User.query.get(user.id)
        
        print("Parallel Deduction Result:")
        print(f"Success: {success}")
        print(f"Fail: {fail}")
        print(f"Final Subscription: {user.subscription_credits}")
        print(f"Final Bulk: {user.bulk_credits}")

def test_credit_isolation():
    """Test 2: Credit pool isolation"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        # Create user with subscription=5, bulk=10
        user = User.query.filter_by(email='atomic_test_isolation@test.com').first()
        if not user:
            user = User(email='atomic_test_isolation@test.com')
            db.session.add(user)
            db.session.commit()
        
        user.subscription_credits = 5
        user.bulk_credits = 10
        db.session.commit()
        
        # Deduct 8 times
        for _ in range(8):
            CreditManager.deduct_credit(user.id)
        
        # Get final state
        db.session.expire(user)
        user = User.query.get(user.id)
        
        print("\nCredit Isolation Result:")
        print(f"Final Subscription: {user.subscription_credits}")
        print(f"Final Bulk: {user.bulk_credits}")

def test_webhook_duplicate():
    """Test 3: Webhook duplicate handling"""
    import time
    
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        event_id = f"atomic_test_{int(time.time())}"
        
        def insert_event():
            try:
                with db.session.begin():
                    db.session.add(ProcessedWebhookEvent(event_id=event_id, event_type='test'))
                    db.session.flush()
                return True
            except Exception:
                return False
        
        # Try to insert same event twice in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(insert_event) for _ in range(2)]
            results = [f.result() for f in futures]
        
        # Check database
        count = ProcessedWebhookEvent.query.filter_by(event_id=event_id).count()
        
        print("\nWebhook Duplicate Result:")
        print(f"Processed Events Count: {count}")

if __name__ == '__main__':
    test_parallel_deduction()
    test_credit_isolation()
    test_webhook_duplicate()
