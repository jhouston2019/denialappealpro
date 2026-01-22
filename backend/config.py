"""Application configuration."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///denial_appeal_pro.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Pricing
    PRICE_PER_APPEAL = float(os.getenv('PRICE_PER_APPEAL', '10.00'))
    
    # File storage
    GENERATED_APPEALS_DIR = os.path.join(os.path.dirname(__file__), 'generated_appeals')
    AUDIT_LOGS_DIR = os.path.join(os.path.dirname(__file__), 'audit_logs')
    
    # Ensure directories exist
    os.makedirs(GENERATED_APPEALS_DIR, exist_ok=True)
    os.makedirs(AUDIT_LOGS_DIR, exist_ok=True)


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
