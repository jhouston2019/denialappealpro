import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Database configuration with PostgreSQL support
    database_url = os.getenv('DATABASE_URL', 'sqlite:///appeals.db')
    
    # Fix for Heroku/Railway postgres:// vs postgresql:// issue
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    SUPABASE_STORAGE_BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'appeals')
    
    # Use Supabase Storage if configured, otherwise use local filesystem
    USE_SUPABASE_STORAGE = bool(SUPABASE_URL and SUPABASE_KEY)
    
    # Stripe Configuration
    STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
    STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
    STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    PRICE_PER_APPEAL = float(os.getenv('PRICE_PER_APPEAL', '10.00'))
    
    # Local folders (used for development or if Supabase not configured)
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    GENERATED_FOLDER = os.path.join(os.path.dirname(__file__), 'generated')
    
    # Create local folders only if not using Supabase Storage
    if not USE_SUPABASE_STORAGE:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(GENERATED_FOLDER, exist_ok=True)
