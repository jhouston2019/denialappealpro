"""
Credit Management System
Handles credit allocation, deduction, and subscription management
PLUS usage-based tracking for SaaS model
"""

from datetime import datetime, date, timedelta
from models import db, User, SubscriptionPlan, CreditPack, Appeal
from typing import Optional, Dict, Union


def _utc_midnight(d: date) -> datetime:
    """Naive UTC midnight for the given calendar date (consistent comparison anchor)."""
    return datetime(d.year, d.month, d.day)


def _as_utc_midnight_datetime(value: Union[date, datetime, None]) -> Optional[datetime]:
    """Normalize DB date/datetime fields to datetime at UTC midnight for comparisons."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return _utc_midnight(value.date())
    if isinstance(value, date):
        return _utc_midnight(value)
    raise TypeError(f"Expected date or datetime, got {type(value)!r}")


class CreditManager:
    """Manage user credits and subscriptions"""

    FREE_TRIAL_LIMIT = 3  # Onboarding offer: free generations without subscription/credits

    @staticmethod
    def get_or_create_user(email: str, stripe_customer_id: Optional[str] = None) -> User:
        """Get existing user or create new one"""
        user = User.query.filter_by(email=email).first()
        
        if not user:
            user = User(
                email=email,
                stripe_customer_id=stripe_customer_id,
                is_paid=False,
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
            print(f"OK Added {credits} bulk credits to user {user_id} (bulk: {user.bulk_credits}, sub: {user.subscription_credits})")
            return True
        except Exception as e:
            print(f"Error adding credits: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def deduct_credit(user_id: int) -> bool:
        """TRUE ATOMIC credit deduction - PostgreSQL row-level lock"""
        try:
            with db.session.begin():
                user = (
                    db.session.query(User)
                    .filter(User.id == user_id)
                    .with_for_update()
                    .one()
                )
                
                if user.subscription_credits > 0:
                    user.subscription_credits -= 1
                elif user.bulk_credits > 0:
                    user.bulk_credits -= 1
                else:
                    raise Exception("No credits available")
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def has_credits(user_id: int) -> bool:
        """Check if user has available credits"""
        user = User.query.get(user_id)
        return user and (user.subscription_credits + user.bulk_credits) > 0

    @staticmethod
    def try_begin_generation(user_id: int) -> tuple:
        """
        Decide if user may generate one appeal (credit deduction, subscription usage, or free trial).
        Returns (allowed: bool, used_subscription_credit: bool, used_free_trial: bool).
        used_subscription_credit True when a pooled credit was deducted; False when using tier usage only.
        used_free_trial True when no credits/subscription path applied and a free trial slot is consumed.
        """
        user = User.query.get(user_id)
        if not user:
            return False, False, False
        CreditManager.reset_usage_counters_if_needed(user_id)
        db.session.refresh(user)
        if user.subscription_credits + user.bulk_credits > 0:
            if CreditManager.deduct_credit(user_id):
                return True, True, False
            return False, False, False
        if user.subscription_tier and (user.billing_status or 'active') == 'active':
            # Soft grace: allow plan_limit + 2 appeals/month before hard block (overage billing still applies after plan_limit)
            soft_grace = 2
            if user.plan_limit > 0 and user.appeals_generated_monthly >= user.plan_limit + soft_grace:
                return False, False, False
            return True, False, False
        has_active_sub = bool(user.subscription_tier and (user.billing_status or 'active') == 'active')
        ft_used = getattr(user, 'free_trial_generations_used', 0) or 0
        if not has_active_sub and ft_used < CreditManager.FREE_TRIAL_LIMIT:
            return True, False, True
        return False, False, False
    
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
            print(f"OK Reset subscription credits for user {user.id} to {plan.included_credits} (bulk: {user.bulk_credits} preserved)")
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
    
    @staticmethod
    def reset_usage_counters_if_needed(user_id: int) -> None:
        """Reset usage counters based on time periods; compares using naive midnight datetime only."""
        user = User.query.with_for_update().filter_by(id=user_id).first()
        if not user:
            return

        # Calendar day for resets (host local date, same as prior date.today() behavior)
        today_d = date.today()
        today_start = _utc_midnight(today_d)

        last_daily = _as_utc_midnight_datetime(user.last_daily_reset)
        if last_daily != today_start:
            user.appeals_generated_today = 0
            user.last_daily_reset = today_d

        week_start_d = today_d - timedelta(days=today_d.weekday())
        week_start = _utc_midnight(week_start_d)
        last_weekly = _as_utc_midnight_datetime(user.last_weekly_reset)
        if last_weekly is None or last_weekly < week_start:
            user.appeals_generated_weekly = 0
            user.last_weekly_reset = today_d

        month_start_d = today_d.replace(day=1)
        month_start = _utc_midnight(month_start_d)
        last_monthly = _as_utc_midnight_datetime(user.last_monthly_reset)
        if last_monthly is None or last_monthly < month_start:
            user.appeals_generated_monthly = 0
            user.overage_count = 0
            user.last_monthly_reset = today_d

        db.session.commit()
    
    @staticmethod
    def increment_usage(user_id: int, used_free_trial: bool = False) -> bool:
        """Increment usage counters after appeal generation."""
        try:
            user = User.query.with_for_update().filter_by(id=user_id).first()
            if not user:
                return False

            CreditManager.reset_usage_counters_if_needed(user_id)

            user.appeals_generated_today += 1
            user.appeals_generated_weekly += 1
            user.appeals_generated_monthly += 1

            if used_free_trial:
                user.free_trial_generations_used = (getattr(user, 'free_trial_generations_used', 0) or 0) + 1

            if user.plan_limit > 0 and user.appeals_generated_monthly > user.plan_limit:
                user.overage_count = user.appeals_generated_monthly - user.plan_limit

            db.session.commit()
            return True
        except Exception as e:
            print(f"Error incrementing usage: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def get_usage_stats(user_id: int) -> Dict:
        """Get detailed usage statistics for display"""
        user = User.query.get(user_id)
        if not user:
            return None
        
        # Reset counters if needed before returning stats
        CreditManager.reset_usage_counters_if_needed(user_id)
        
        # Refresh user object after potential reset
        db.session.refresh(user)
        
        usage_percentage = 0
        if user.plan_limit > 0:
            usage_percentage = min(100, (user.appeals_generated_monthly / user.plan_limit) * 100)
        
        # Determine upgrade trigger status
        upgrade_status = None
        if usage_percentage >= 100:
            upgrade_status = "limit_reached"
        elif usage_percentage >= 90:
            upgrade_status = "approaching_limit"
        elif usage_percentage >= 70:
            upgrade_status = "warning"
        
        soft_grace = 2
        effective_cap = user.plan_limit + soft_grace if user.plan_limit > 0 else None
        grace_remaining = None
        if effective_cap is not None:
            grace_remaining = max(0, effective_cap - user.appeals_generated_monthly)
        
        at_hard_cap = (
            user.plan_limit > 0
            and user.subscription_tier
            and user.appeals_generated_monthly >= user.plan_limit + soft_grace
        )
        has_active_sub = bool(user.subscription_tier and (user.billing_status or 'active') == 'active')
        ft_used = getattr(user, 'free_trial_generations_used', 0) or 0
        ft_rem = max(0, CreditManager.FREE_TRIAL_LIMIT - ft_used)
        has_credits = (user.subscription_credits + user.bulk_credits) > 0
        can_generate = (user.billing_status or 'active') == 'active' and (
            has_credits
            or (has_active_sub and not at_hard_cap)
            or ((not has_active_sub) and ft_rem > 0)
        )

        upgrade_message = None
        if user.subscription_tier and user.plan_limit > 0:
            if at_hard_cap:
                upgrade_message = "Upgrade to continue processing — you've used your plan plus grace appeals."
            elif upgrade_status == "limit_reached" or upgrade_status == "approaching_limit":
                upgrade_message = "Upgrade to continue processing without interruption."
        elif not has_active_sub and ft_used >= CreditManager.FREE_TRIAL_LIMIT and not has_credits:
            upgrade_message = "You've used your 3 free claims. Upgrade to keep generating appeals."

        return {
            "user_id": user.id,
            "email": user.email,
            "subscription_tier": user.subscription_tier,
            "plan_limit": user.plan_limit,
            "appeals_generated_monthly": user.appeals_generated_monthly,
            "appeals_generated_weekly": user.appeals_generated_weekly,
            "appeals_generated_today": user.appeals_generated_today,
            "usage_percentage": round(usage_percentage, 1),
            "overage_count": user.overage_count,
            "billing_status": user.billing_status,
            "upgrade_status": upgrade_status,
            "can_generate": can_generate,
            "soft_grace_remaining": grace_remaining,
            "effective_monthly_cap": effective_cap,
            "at_hard_cap": at_hard_cap,
            "upgrade_message": upgrade_message,
            "plan_usage_label": (
                f"{user.appeals_generated_monthly}/{user.plan_limit}"
                if user.plan_limit > 0
                else None
            ),
            "free_trial_limit": CreditManager.FREE_TRIAL_LIMIT,
            "free_trial_used": ft_used,
            "free_trial_remaining": ft_rem,
            "free_trial_label": f"{ft_used}/{CreditManager.FREE_TRIAL_LIMIT} free claims used",
        }
    
    @staticmethod
    def update_plan_limit(user_id: int) -> bool:
        """Update user's plan limit based on subscription tier"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            if user.subscription_tier:
                tier_info = PricingManager.get_subscription_tier(user.subscription_tier)
                if tier_info:
                    user.plan_limit = tier_info['included_appeals']
            else:
                user.plan_limit = 0
            
            db.session.commit()
            return True
        except Exception as e:
            print(f"Error updating plan limit: {e}")
            db.session.rollback()
            return False

class PricingManager:
    """Manage pricing tiers and credit packs"""
    
    # Subscription tiers - USAGE-BASED MODEL
    SUBSCRIPTION_TIERS = {
        "starter": {
            "name": "Starter",
            "monthly_price": 199.00,
            "included_appeals": 15,
            "overage_price": 15.00
        },
        "core": {
            "name": "Growth",
            "monthly_price": 399.00,
            "included_appeals": 40,
            "overage_price": 12.00
        },
        "scale": {
            "name": "Scale",
            "monthly_price": 799.00,
            "included_appeals": 120,
            "overage_price": 10.00
        }
    }
    
    # Bulk credit packs - DEPRECATED but kept for backward compatibility
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
    RETAIL_PRICE = 79.00
    
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
    def calculate_overage_cost(user_id: int, appeals_count: int) -> float:
        """Calculate cost for overage appeals"""
        user = User.query.get(user_id)
        if not user or not user.subscription_tier:
            return appeals_count * PricingManager.RETAIL_PRICE
        
        tier_info = PricingManager.get_subscription_tier(user.subscription_tier)
        if not tier_info:
            return appeals_count * PricingManager.RETAIL_PRICE
        
        return float(tier_info['overage_price']) * appeals_count
    
    @staticmethod
    def get_next_tier(current_tier: str) -> Optional[Dict]:
        """Get the next tier for upgrade suggestions"""
        tier_order = ["starter", "core", "scale"]
        if not current_tier or current_tier not in tier_order:
            return PricingManager.SUBSCRIPTION_TIERS.get("starter")
        
        current_index = tier_order.index(current_tier)
        if current_index < len(tier_order) - 1:
            next_tier_name = tier_order[current_index + 1]
            return {
                "tier_id": next_tier_name,
                **PricingManager.SUBSCRIPTION_TIERS[next_tier_name]
            }
        return None

def initialize_pricing_data():
    """Initialize subscription plans and credit packs in database"""
    try:
        # Create subscription plans with NEW pricing structure
        for tier_id, tier_data in PricingManager.SUBSCRIPTION_TIERS.items():
            existing = SubscriptionPlan.query.filter_by(name=tier_id).first()
            if existing:
                # Update existing plans with new pricing
                existing.monthly_price = tier_data["monthly_price"]
                existing.included_credits = tier_data["included_appeals"]
                existing.overage_price = tier_data["overage_price"]
            else:
                plan = SubscriptionPlan(
                    name=tier_id,
                    monthly_price=tier_data["monthly_price"],
                    included_credits=tier_data["included_appeals"],
                    overage_price=tier_data["overage_price"],
                    stripe_price_id=f"price_{tier_id}_placeholder"
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
                    stripe_price_id=f"price_{pack_id}_placeholder"
                )
                db.session.add(pack)
        
        db.session.commit()
        print("OK Pricing data initialized successfully")
        return True
    except Exception as e:
        print(f"ERROR Error initializing pricing data: {e}")
        db.session.rollback()
        return False
