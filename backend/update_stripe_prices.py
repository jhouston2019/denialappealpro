"""
Update Stripe Price IDs in Database
Run this after creating Stripe products and prices
"""

from flask import Flask
from models import db, SubscriptionPlan, CreditPack
from config import Config

def update_stripe_prices():
    """Interactive script to update Stripe price IDs"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    with app.app_context():
        print("\n" + "="*60)
        print("UPDATE STRIPE PRICE IDs")
        print("="*60)
        print("\nThis script will help you update Stripe price IDs in the database.")
        print("You should have already created products and prices in Stripe.")
        print("\nPress Enter to skip any item you want to update later.\n")
        
        # Update Subscription Plans
        print("\n" + "-"*60)
        print("SUBSCRIPTION PLANS")
        print("-"*60)
        
        plans = SubscriptionPlan.query.all()
        for plan in plans:
            print(f"\n{plan.name.upper()} Plan:")
            print(f"  Current Price ID: {plan.stripe_price_id}")
            print(f"  Monthly Price: ${plan.monthly_price}")
            print(f"  Included Credits: {plan.included_credits}")
            
            new_price_id = input(f"  Enter new Stripe Price ID (or press Enter to skip): ").strip()
            if new_price_id:
                plan.stripe_price_id = new_price_id
                print(f"  ✓ Updated to: {new_price_id}")
        
        # Update Credit Packs
        print("\n" + "-"*60)
        print("CREDIT PACKS")
        print("-"*60)
        
        packs = CreditPack.query.all()
        for pack in packs:
            print(f"\n{pack.name}:")
            print(f"  Current Price ID: {pack.stripe_price_id}")
            print(f"  Credits: {pack.credits}")
            print(f"  Price: ${pack.price}")
            
            new_price_id = input(f"  Enter new Stripe Price ID (or press Enter to skip): ").strip()
            if new_price_id:
                pack.stripe_price_id = new_price_id
                print(f"  ✓ Updated to: {new_price_id}")
        
        # Confirm and save
        print("\n" + "="*60)
        confirm = input("\nSave changes to database? (yes/no): ").strip().lower()
        
        if confirm in ['yes', 'y']:
            db.session.commit()
            print("\n✅ All changes saved successfully!")
            
            # Print summary
            print("\n" + "="*60)
            print("SUMMARY")
            print("="*60)
            
            print("\nSubscription Plans:")
            for plan in SubscriptionPlan.query.all():
                print(f"  {plan.name}: {plan.stripe_price_id}")
            
            print("\nCredit Packs:")
            for pack in CreditPack.query.all():
                print(f"  {pack.name}: {pack.stripe_price_id}")
            
            print("\n✅ Configuration complete!")
            print("\nNext steps:")
            print("1. Test subscription checkout")
            print("2. Test credit pack purchase")
            print("3. Verify webhook events are received")
            print("\n")
        else:
            print("\n❌ Changes not saved.")

if __name__ == '__main__':
    update_stripe_prices()
