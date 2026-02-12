"""
Credit Management System
Handles credit allocation, deduction, and subscription management
"""

from datetime import datetime
from models import db, User, SubscriptionPlan, CreditPack, Appeal
from typing import Optional, Dict

class CreditManager:
    """Manage user credits and subscriptions"""
    
    @staticmethod
    def get_or_create_user(email: str, stripe_customer_id: Optional[str] = None) -> User:
        """Get existing user or create new one"""
        user = User.query.filter_by(email=email).first()
        
        if not user:
            user = User(
                email=email,
                stripe_customer_id=stripe_customer_id,
                credit_balance=0
            )
            db.session.add(user)
            db.session.commit()
        elif stripe_customer_id and not user.stripe_customer_id:
            user.stripe_customer_id = stripe_customer_id
            db.session.commit()
        
        return user
    
    @staticmethod
    def add_credits(user_id: int, credits: int, reason: str = "purchase") -> bool:
        """Add credits to user account - goes to BULK pool"""
        try:
            user = User.query.with_for_update().filter_by(id=user_id).first()
            if not user:
                db.session.rollback()
                return False
            
            # Bulk purchases go to bulk_credits (accumulate)
            user.bulk_credits += credits
            db.session.commit()
            print(f"✓ Added {credits} bulk credits to user {user_id} (bulk: {user.bulk_credits}, sub: {user.subscription_credits})")
            return True
        except Exception as e:
            print(f"Error adding credits: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def deduct_credit(user_id: int) -> bool:
        """Deduct one credit - ATOMIC with row lock, subscription first then bulk"""
        try:
            # SELECT FOR UPDATE - locks row until transaction completes
            # Prevents race conditions in parallel requests
            user = User.query.with_for_update().filter_by(id=user_id).first()
            
            if not user:
                db.session.rollback()
                return False
            
            # Check total balance
            total = user.subscription_credits + user.bulk_credits
            if total <= 0:
                db.session.rollback()
                return False
            
            # Deduct from subscription credits first, then bulk
            if user.subscription_credits > 0:
                user.subscription_credits -= 1
                print(f"✓ Deducted subscription credit from user {user_id} (sub: {user.subscription_credits}, bulk: {user.bulk_credits})")
            elif user.bulk_credits > 0:
                user.bulk_credits -= 1
                print(f"✓ Deducted bulk credit from user {user_id} (sub: {user.subscription_credits}, bulk: {user.bulk_credits})")
            else:
                db.session.rollback()
                return False
            
            db.session.commit()
            return True
        except Exception as e:
            print(f"Error deducting credit: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def has_credits(user_id: int) -> bool:
        """Check if user has available credits"""
        user = User.query.get(user_id)
        return user and (user.subscription_credits + user.bulk_credits) > 0
    
    @staticmethod
    def get_credit_balance(user_id: int) -> int:
        """Get user's total credit balance"""
        user = User.query.get(user_id)
        return (user.subscription_credits + user.bulk_credits) if user else 0
    
    @staticmethod
    def set_subscription(user_id: int, tier: str) -> bool:
        """Set user's subscription tier"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            user.subscription_tier = tier
            db.session.commit()
            return True
        except Exception as e:
            print(f"Error setting subscription: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def cancel_subscription(user_id: int) -> bool:
        """Cancel user's subscription"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            user.subscription_tier = None
            db.session.commit()
            return True
        except Exception as e:
            print(f"Error canceling subscription: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def allocate_monthly_credits(user_id: int) -> bool:
        """Allocate monthly credits - RESET subscription pool, preserve bulk pool"""
        try:
            user = User.query.with_for_update().filter_by(id=user_id).first()
            if not user or not user.subscription_tier:
                db.session.rollback()
                return False
            
            plan = SubscriptionPlan.query.filter_by(name=user.subscription_tier).first()
            if not plan:
                db.session.rollback()
                return False
            
            # RESET subscription credits ONLY (bulk_credits untouched)
            user.subscription_credits = plan.included_credits
            # bulk_credits remains unchanged - accumulates forever
            
            db.session.commit()
            print(f"✓ Reset subscription credits for user {user.id} to {plan.included_credits} (bulk: {user.bulk_credits} preserved)")
            return True
        except Exception as e:
            print(f"Error allocating monthly credits: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def get_user_stats(user_id: int) -> Dict:
        """Get user statistics"""
        user = User.query.get(user_id)
        if not user:
            return None
        
        total_appeals = Appeal.query.filter_by(user_id=user_id).count()
        completed_appeals = Appeal.query.filter_by(user_id=user_id, status='completed').count()
        
        return {
            "email": user.email,
            "subscription_tier": user.subscription_tier,
            "subscription_credits": user.subscription_credits,
            "bulk_credits": user.bulk_credits,
            "credit_balance": user.subscription_credits + user.bulk_credits,
            "total_appeals": total_appeals,
            "completed_appeals": completed_appeals,
            "member_since": user.created_at.isoformat()
        }

class PricingManager:
    """Manage pricing tiers and credit packs"""
    
    # Subscription tiers
    SUBSCRIPTION_TIERS = {
        "starter": {
            "name": "Starter",
            "monthly_price": 99.00,
            "included_credits": 20,
            "overage_price": 8.00
        },
        "growth": {
            "name": "Growth",
            "monthly_price": 299.00,
            "included_credits": 75,
            "overage_price": 7.00
        },
        "pro": {
            "name": "Pro",
            "monthly_price": 599.00,
            "included_credits": 200,
            "overage_price": 6.00
        }
    }
    
    # Bulk credit packs
    CREDIT_PACKS = {
        "pack_25": {
            "name": "25 Credits",
            "credits": 25,
            "price": 225.00,
            "per_credit": 9.00
        },
        "pack_50": {
            "name": "50 Credits",
            "credits": 50,
            "price": 425.00,
            "per_credit": 8.50
        },
        "pack_100": {
            "name": "100 Credits",
            "credits": 100,
            "price": 750.00,
            "per_credit": 7.50
        },
        "pack_250": {
            "name": "250 Credits",
            "credits": 250,
            "price": 1750.00,
            "per_credit": 7.00
        },
        "pack_500": {
            "name": "500 Credits",
            "credits": 500,
            "price": 3250.00,
            "per_credit": 6.50
        }
    }
    
    # Retail pricing
    RETAIL_PRICE = 10.00
    
    @staticmethod
    def get_subscription_tier(tier_name: str) -> Optional[Dict]:
        """Get subscription tier details"""
        return PricingManager.SUBSCRIPTION_TIERS.get(tier_name.lower())
    
    @staticmethod
    def get_credit_pack(pack_id: str) -> Optional[Dict]:
        """Get credit pack details"""
        return PricingManager.CREDIT_PACKS.get(pack_id)
    
    @staticmethod
    def get_all_subscription_tiers() -> Dict:
        """Get all subscription tiers"""
        return PricingManager.SUBSCRIPTION_TIERS
    
    @staticmethod
    def get_all_credit_packs() -> Dict:
        """Get all credit packs"""
        return PricingManager.CREDIT_PACKS
    
    @staticmethod
    def calculate_overage_cost(user_id: int, credits_needed: int) -> float:
        """Calculate cost for overage credits"""
        user = User.query.get(user_id)
        if not user or not user.subscription_tier:
            return credits_needed * PricingManager.RETAIL_PRICE
        
        plan = SubscriptionPlan.query.filter_by(name=user.subscription_tier).first()
        if not plan:
            return credits_needed * PricingManager.RETAIL_PRICE
        
        return float(plan.overage_price) * credits_needed

def initialize_pricing_data():
    """Initialize subscription plans and credit packs in database"""
    try:
        # Create subscription plans
        for tier_id, tier_data in PricingManager.SUBSCRIPTION_TIERS.items():
            existing = SubscriptionPlan.query.filter_by(name=tier_id).first()
            if not existing:
                plan = SubscriptionPlan(
                    name=tier_id,
                    monthly_price=tier_data["monthly_price"],
                    included_credits=tier_data["included_credits"],
                    overage_price=tier_data["overage_price"],
                    stripe_price_id=f"price_{tier_id}_placeholder"  # Replace with actual Stripe price IDs
                )
                db.session.add(plan)
        
        # Create credit packs
        for pack_id, pack_data in PricingManager.CREDIT_PACKS.items():
            existing = CreditPack.query.filter_by(name=pack_data["name"]).first()
            if not existing:
                pack = CreditPack(
                    name=pack_data["name"],
                    credits=pack_data["credits"],
                    price=pack_data["price"],
                    stripe_price_id=f"price_{pack_id}_placeholder"  # Replace with actual Stripe price IDs
                )
                db.session.add(pack)
        
        db.session.commit()
        print("✓ Pricing data initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Error initializing pricing data: {e}")
        db.session.rollback()
        return False
