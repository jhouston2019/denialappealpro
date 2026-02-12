"""Simple database initialization"""
from flask import Flask
from models import db
from config import Config
from credit_manager import initialize_pricing_data

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    print("Creating tables...")
    db.create_all()
    print("OK Tables created")
    
    print("Initializing pricing data...")
    initialize_pricing_data()
    print("OK Pricing data initialized")
    
    from models import SubscriptionPlan, User
    plans = SubscriptionPlan.query.count()
    users = User.query.count()
    
    print(f"\nDatabase ready:")
    print(f"  Subscription Plans: {plans}")
    print(f"  Users: {users}")
