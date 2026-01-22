import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///appeals.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
    STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
    STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    PRICE_PER_APPEAL = 10.00
    
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    GENERATED_FOLDER = os.path.join(os.path.dirname(__file__), 'generated')
    
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(GENERATED_FOLDER, exist_ok=True)
