"""
Stripe Billing Integration
Handles subscriptions, metered billing, and customer portal
"""

import stripe
from datetime import datetime
from typing import Optional, Dict
from models import db, User
from config import Config

# Initialize Stripe
stripe.api_key = Config.STRIPE_SECRET_KEY

class StripeBilling:
    """Complete Stripe billing integration"""
    
    # Plan mapping
    PLAN_PRICE_IDS = {
        'starter': Config.STRIPE_STARTER_PRICE_ID,
        'core': Config.STRIPE_CORE_PRICE_ID,
        'scale': Config.STRIPE_SCALE_PRICE_ID
    }
    
    PLAN_LIMITS = {
        'starter': 50,
        'core': 300,
        'scale': 1000
    }
    
    OVERAGE_PRICE_ID = Config.STRIPE_OVERAGE_PRICE_ID
    OVERAGE_RATE = 0.50
    
    @staticmethod
    def create_checkout_session(user_id: int, plan: str, success_url: str, cancel_url: str) -> Dict:
        """
        Create Stripe checkout session for subscription
        
        Args:
            user_id: User ID
            plan: Plan name (starter, core, scale)
            success_url: URL to redirect after success
            cancel_url: URL to redirect after cancel
            
        Returns:
            Dict with session_id and url
        """
        try:
            user = User.query.get(user_id)
            if not user:
                raise ValueError("User not found")
            
            price_id = StripeBilling.PLAN_PRICE_IDS.get(plan.lower())
            if not price_id:
                raise ValueError(f"Invalid plan: {plan}")
            
            # Create or get Stripe customer
            if not user.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=user.email,
                    metadata={'user_id': user.id}
                )
                user.stripe_customer_id = customer.id
                db.session.commit()
            
            # Create checkout session with metered overage item
            line_items = [
                {
                    'price': price_id,
                    'quantity': 1,
                }
            ]
            
            # Add metered overage price if available
            if StripeBilling.OVERAGE_PRICE_ID and not StripeBilling.OVERAGE_PRICE_ID.endswith('placeholder'):
                line_items.append({
                    'price': StripeBilling.OVERAGE_PRICE_ID,
                })
            
            session = stripe.checkout.Session.create(
                customer=user.stripe_customer_id,
                mode='subscription',
                payment_method_types=['card'],
                line_items=line_items,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'user_id': user.id,
                    'plan': plan,
                    'type': 'subscription'
                },
                subscription_data={
                    'metadata': {
                        'user_id': user.id,
                        'plan': plan
                    }
                }
            )
            
            return {
                'session_id': session.id,
                'url': session.url
            }
            
        except Exception as e:
            print(f"❌ Error creating checkout session: {e}")
            raise
    
    @staticmethod
    def create_portal_session(user_id: int, return_url: str) -> Dict:
        """
        Create Stripe customer portal session for self-service billing management
        
        Args:
            user_id: User ID
            return_url: URL to return to after portal
            
        Returns:
            Dict with url
        """
        try:
            user = User.query.get(user_id)
            if not user or not user.stripe_customer_id:
                raise ValueError("User not found or no Stripe customer")
            
            session = stripe.billing_portal.Session.create(
                customer=user.stripe_customer_id,
                return_url=return_url
            )
            
            return {'url': session.url}
            
        except Exception as e:
            print(f"❌ Error creating portal session: {e}")
            raise
    
    @staticmethod
    def report_overage_usage(user_id: int, quantity: int = 1) -> bool:
        """
        Report metered usage to Stripe for overage billing
        
        Args:
            user_id: User ID
            quantity: Number of appeals to report (default 1)
            
        Returns:
            True if successful
        """
        try:
            user = User.query.get(user_id)
            if not user or not user.stripe_subscription_id:
                print(f"⚠️  User {user_id} has no active subscription")
                return False
            
            # Get subscription to find metered item
            subscription = stripe.Subscription.retrieve(user.stripe_subscription_id)
            
            # Find the metered overage item
            overage_item = None
            for item in subscription['items']['data']:
                if item['price']['id'] == StripeBilling.OVERAGE_PRICE_ID:
                    overage_item = item
                    break
            
            if not overage_item:
                print(f"⚠️  No metered overage item found for user {user_id}")
                return False
            
            # Report usage
            stripe.SubscriptionItem.create_usage_record(
                overage_item['id'],
                quantity=quantity,
                timestamp=int(datetime.utcnow().timestamp()),
                action='increment'
            )
            
            print(f"✓ Reported {quantity} overage usage for user {user_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error reporting overage usage: {e}")
            return False
    
    @staticmethod
    def handle_checkout_completed(session: Dict) -> bool:
        """
        Handle checkout.session.completed webhook event
        
        Args:
            session: Stripe session object
            
        Returns:
            True if successful
        """
        try:
            metadata = session.get('metadata', {})
            user_id = metadata.get('user_id')
            plan = metadata.get('plan')
            
            if not user_id or not plan:
                print("⚠️  Missing metadata in checkout session")
                return False
            
            user = User.query.get(user_id)
            if not user:
                print(f"❌ User {user_id} not found")
                return False
            
            # Get subscription ID from session
            subscription_id = session.get('subscription')
            
            # Update user subscription
            user.stripe_subscription_id = subscription_id
            user.subscription_tier = plan.lower()
            user.plan_limit = StripeBilling.PLAN_LIMITS.get(plan.lower(), 0)
            user.billing_status = 'active'
            
            db.session.commit()
            
            print(f"✓ Subscription activated: user {user_id}, plan {plan}")
            return True
            
        except Exception as e:
            print(f"❌ Error handling checkout completed: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def handle_invoice_paid(invoice: Dict) -> bool:
        """
        Handle invoice.paid webhook event
        Reset monthly usage counters
        
        Args:
            invoice: Stripe invoice object
            
        Returns:
            True if successful
        """
        try:
            customer_id = invoice.get('customer')
            subscription_id = invoice.get('subscription')
            
            if not customer_id:
                return False
            
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            if not user:
                print(f"⚠️  User not found for customer {customer_id}")
                return False
            
            # Reset monthly usage counters on successful payment
            from datetime import date
            user.appeals_generated_monthly = 0
            user.overage_count = 0
            user.last_monthly_reset = date.today()
            user.billing_status = 'active'
            
            db.session.commit()
            
            print(f"✓ Invoice paid: user {user.id}, monthly usage reset")
            return True
            
        except Exception as e:
            print(f"❌ Error handling invoice paid: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def handle_subscription_updated(subscription: Dict) -> bool:
        """
        Handle customer.subscription.updated webhook event
        Handle plan upgrades/downgrades
        
        Args:
            subscription: Stripe subscription object
            
        Returns:
            True if successful
        """
        try:
            customer_id = subscription.get('customer')
            subscription_id = subscription.get('id')
            status = subscription.get('status')
            
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            if not user:
                print(f"⚠️  User not found for customer {customer_id}")
                return False
            
            # Update subscription status
            user.stripe_subscription_id = subscription_id
            
            if status == 'active':
                user.billing_status = 'active'
                
                # Detect plan change
                items = subscription.get('items', {}).get('data', [])
                for item in items:
                    price_id = item['price']['id']
                    
                    # Map price ID back to plan
                    for plan_name, plan_price_id in StripeBilling.PLAN_PRICE_IDS.items():
                        if price_id == plan_price_id:
                            old_plan = user.subscription_tier
                            user.subscription_tier = plan_name
                            user.plan_limit = StripeBilling.PLAN_LIMITS[plan_name]
                            
                            if old_plan != plan_name:
                                print(f"✓ Plan changed: user {user.id}, {old_plan} → {plan_name}")
                            break
            
            elif status in ['canceled', 'unpaid', 'past_due']:
                user.billing_status = status
            
            db.session.commit()
            return True
            
        except Exception as e:
            print(f"❌ Error handling subscription updated: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def handle_subscription_deleted(subscription: Dict) -> bool:
        """
        Handle customer.subscription.deleted webhook event
        
        Args:
            subscription: Stripe subscription object
            
        Returns:
            True if successful
        """
        try:
            customer_id = subscription.get('customer')
            
            user = User.query.filter_by(stripe_customer_id=customer_id).first()
            if not user:
                return False
            
            # Cancel subscription
            user.subscription_tier = None
            user.stripe_subscription_id = None
            user.plan_limit = 0
            user.billing_status = 'cancelled'
            
            db.session.commit()
            
            print(f"✓ Subscription cancelled: user {user.id}")
            return True
            
        except Exception as e:
            print(f"❌ Error handling subscription deleted: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def upgrade_subscription(user_id: int, new_plan: str) -> bool:
        """
        Upgrade user subscription to a higher tier
        
        Args:
            user_id: User ID
            new_plan: New plan name (core, scale)
            
        Returns:
            True if successful
        """
        try:
            user = User.query.get(user_id)
            if not user or not user.stripe_subscription_id:
                raise ValueError("User has no active subscription")
            
            new_price_id = StripeBilling.PLAN_PRICE_IDS.get(new_plan.lower())
            if not new_price_id:
                raise ValueError(f"Invalid plan: {new_plan}")
            
            # Get current subscription
            subscription = stripe.Subscription.retrieve(user.stripe_subscription_id)
            
            # Find the base plan item (not metered)
            base_item = None
            for item in subscription['items']['data']:
                if item['price']['id'] in StripeBilling.PLAN_PRICE_IDS.values():
                    base_item = item
                    break
            
            if not base_item:
                raise ValueError("No base plan item found")
            
            # Update subscription with new price
            stripe.Subscription.modify(
                user.stripe_subscription_id,
                items=[{
                    'id': base_item['id'],
                    'price': new_price_id,
                }],
                proration_behavior='always_invoice'
            )
            
            # Update user record
            user.subscription_tier = new_plan.lower()
            user.plan_limit = StripeBilling.PLAN_LIMITS[new_plan.lower()]
            db.session.commit()
            
            print(f"✓ Subscription upgraded: user {user_id} → {new_plan}")
            return True
            
        except Exception as e:
            print(f"❌ Error upgrading subscription: {e}")
            db.session.rollback()
            raise
    
    @staticmethod
    def get_subscription_info(user_id: int) -> Optional[Dict]:
        """
        Get detailed subscription information from Stripe
        
        Args:
            user_id: User ID
            
        Returns:
            Dict with subscription details or None
        """
        try:
            user = User.query.get(user_id)
            if not user or not user.stripe_subscription_id:
                return None
            
            subscription = stripe.Subscription.retrieve(user.stripe_subscription_id)
            
            return {
                'id': subscription['id'],
                'status': subscription['status'],
                'current_period_start': subscription['current_period_start'],
                'current_period_end': subscription['current_period_end'],
                'cancel_at_period_end': subscription['cancel_at_period_end'],
                'plan': user.subscription_tier,
                'plan_limit': user.plan_limit
            }
            
        except Exception as e:
            print(f"❌ Error getting subscription info: {e}")
            return None
    
    @staticmethod
    def verify_webhook_signature(payload: bytes, sig_header: str) -> Optional[Dict]:
        """
        Verify Stripe webhook signature
        
        Args:
            payload: Request body bytes
            sig_header: Stripe-Signature header
            
        Returns:
            Event dict if valid, None if invalid
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, Config.STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError as e:
            print(f"❌ Invalid payload: {e}")
            return None
        except stripe.error.SignatureVerificationError as e:
            print(f"❌ Invalid signature: {e}")
            return None
