"""
Environment variable validation for Denial Appeal Pro
Validates required configuration on startup
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

class EnvironmentValidator:
    """Validates environment configuration on startup"""
    
    # Required environment variables
    REQUIRED_VARS = {
        'SECRET_KEY': 'Flask secret key for session security',
        'DATABASE_URL': 'Database connection string',
        'STRIPE_SECRET_KEY': 'Stripe secret key for payment processing',
        'STRIPE_PUBLISHABLE_KEY': 'Stripe publishable key',
        'STRIPE_WEBHOOK_SECRET': 'Stripe webhook secret for verification',
    }
    
    # Optional but recommended
    RECOMMENDED_VARS = {
        'OPENAI_API_KEY': 'OpenAI API key for AI-powered appeal generation (will use templates without this)',
        'ALLOWED_ORIGINS': 'CORS allowed origins',
    }
    
    # Warning thresholds
    WEAK_SECRET_KEY = ['dev-secret-key', 'change-me', 'your-secret-key']
    TEST_STRIPE_KEYS = ['sk_test_', 'pk_test_']
    
    @classmethod
    def validate(cls, strict=False):
        """
        Validate environment configuration
        
        Args:
            strict: If True, exit on any missing required variable
                   If False, warn but continue
        
        Returns:
            tuple: (is_valid, warnings, errors)
        """
        errors = []
        warnings = []
        
        print("\n" + "="*60)
        print("VALIDATING ENVIRONMENT CONFIGURATION")
        print("="*60 + "\n")
        
        # Check required variables
        for var, description in cls.REQUIRED_VARS.items():
            value = os.getenv(var)
            if not value or value.strip() == '':
                errors.append(f"[X] MISSING: {var} - {description}")
            elif 'your_' in value.lower() or 'here' in value.lower():
                errors.append(f"[X] NOT CONFIGURED: {var} - Still has placeholder value")
            else:
                print(f"[OK] {var}: Configured")
                
                # Check for weak/test configurations
                if var == 'SECRET_KEY' and any(weak in value for weak in cls.WEAK_SECRET_KEY):
                    warnings.append(f"[WARNING] {var} appears to be a development key. Use a strong random key in production!")
                
                if 'STRIPE' in var and any(test in value for test in cls.TEST_STRIPE_KEYS):
                    warnings.append(f"[INFO] Using Stripe TEST mode for {var}")
        
        # Check recommended variables
        print("\nOptional Configuration:")
        for var, description in cls.RECOMMENDED_VARS.items():
            value = os.getenv(var)
            if not value or value.strip() == '':
                warnings.append(f"[OPTIONAL] {var} not set - {description}")
                print(f"[OPTIONAL] {var}: Not configured (optional)")
            else:
                print(f"[OK] {var}: Configured")
        
        # Print summary
        print("\n" + "="*60)
        if errors:
            print(f"[FAILED] VALIDATION FAILED: {len(errors)} error(s) found")
            print("="*60 + "\n")
            for error in errors:
                print(error)
            print("\n[TIP] Fix these issues in your .env file and restart the application.")
            print("      See .env.example for reference.\n")
            
            if strict:
                sys.exit(1)
            return False, warnings, errors
        
        print("[OK] VALIDATION PASSED: All required variables configured")
        print("="*60 + "\n")
        
        if warnings:
            print("Warnings:")
            for warning in warnings:
                print(warning)
            print()
        
        return True, warnings, errors
    
    @classmethod
    def check_database_connection(cls):
        """Test database connectivity"""
        try:
            from sqlalchemy import create_engine, text
            database_url = os.getenv('DATABASE_URL', '')
            
            if not database_url:
                return False, "DATABASE_URL not configured"
            
            # Fix postgres:// to postgresql://
            if database_url.startswith('postgres://'):
                database_url = database_url.replace('postgres://', 'postgresql://', 1)
            
            engine = create_engine(database_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            print("[OK] Database connection: OK")
            return True, None
        except Exception as e:
            error_msg = f"Database connection failed: {str(e)}"
            print(f"[ERROR] {error_msg}")
            return False, error_msg
    
    @classmethod
    def check_stripe_connection(cls):
        """Test Stripe API connectivity"""
        try:
            import stripe
            stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
            
            # Try to retrieve account info
            stripe.Account.retrieve()
            print("[OK] Stripe connection: OK")
            return True, None
        except stripe.error.AuthenticationError:
            error_msg = "Stripe authentication failed - check your STRIPE_SECRET_KEY"
            print(f"[ERROR] {error_msg}")
            return False, error_msg
        except Exception as e:
            error_msg = f"Stripe connection failed: {str(e)}"
            print(f"[WARNING] {error_msg}")
            return False, error_msg
    
    @classmethod
    def check_openai_connection(cls):
        """Test OpenAI API connectivity"""
        api_key = os.getenv('OPENAI_API_KEY')
        
        if not api_key or api_key.strip() == '':
            print("[INFO] OpenAI API: Not configured (will use template appeals)")
            return True, "Using template mode"
        
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            
            # Test with a minimal request
            client.models.list()
            print("[OK] OpenAI API: Connected (AI-powered appeals enabled)")
            return True, None
        except Exception as e:
            error_msg = f"OpenAI connection failed: {str(e)}"
            print(f"[WARNING] {error_msg}")
            print("          Will fall back to template appeals")
            return True, error_msg  # Non-critical, return True
    
    @classmethod
    def run_all_checks(cls, strict=False):
        """Run all validation checks"""
        print("\n" + "STARTING DENIAL APPEAL PRO" + "\n")
        
        # Validate environment variables
        is_valid, warnings, errors = cls.validate(strict=strict)
        
        if not is_valid:
            return False
        
        # Test connections
        print("\n" + "="*60)
        print("TESTING CONNECTIONS")
        print("="*60 + "\n")
        
        cls.check_database_connection()
        cls.check_stripe_connection()
        cls.check_openai_connection()
        
        print("\n" + "="*60)
        print("[OK] STARTUP CHECKS COMPLETE")
        print("="*60 + "\n")
        
        return True

def validate_environment(strict=False):
    """Convenience function for validation"""
    return EnvironmentValidator.run_all_checks(strict=strict)

if __name__ == '__main__':
    # Run validation when executed directly
    validate_environment(strict=True)
