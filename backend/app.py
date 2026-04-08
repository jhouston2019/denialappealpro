from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.errors import RateLimitExceeded
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta
import stripe
import os
import uuid
import io
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename

from config import Config
from models import db, Appeal, User, SubscriptionPlan, CreditPack, ProcessedWebhookEvent, Admin, ClaimStatusEvent
from appeal_generator import AppealGenerator
from validator import validate_timely_filing, check_duplicate
from supabase_storage import storage
from env_validator import validate_environment
from credit_manager import CreditManager, PricingManager, initialize_pricing_data
from pdf_parser import parse_denial_pdf, parse_denial_text
from timely_filing import calculate_timely_filing
from denial_rules import get_denial_rule
from admin_auth import admin_auth, require_admin
from auto_setup_admin import auto_setup_admin
from stripe_billing import StripeBilling
from customer_portal import init_customer_portal
from onboarding_api import register_onboarding_routes
from intelligence_api import register_intelligence_routes

# Validate environment configuration on startup
print("\n" + "="*60)
print("DENIAL APPEAL PRO - BACKEND SERVER")
print("="*60)
validate_environment(strict=False)

app = Flask(__name__)


@app.errorhandler(500)
def internal_error(e):
    import traceback

    app.logger.error("Unhandled 500: %s\n%s", e, traceback.format_exc())
    return jsonify(
        {
            "error": "Internal server error",
            "details": str(e),
            "type": type(e).__name__,
        }
    ), 500


@app.errorhandler(Exception)
def unhandled_exception(e):
    if isinstance(e, HTTPException):
        return jsonify(
            {
                "error": e.name,
                "details": e.description,
                "type": type(e).__name__,
            }
        ), e.code
    import traceback

    app.logger.error("Unhandled exception: %s\n%s", e, traceback.format_exc())
    return jsonify(
        {
            "error": "Internal server error",
            "details": str(e),
            "type": type(e).__name__,
        }
    ), 500


app.config.from_object(Config)

# CORS: production https://denialappealpro.com (+ www), Netlify hostnames for builds/previews, local dev
_default_origins = (
    'http://localhost:3000,'
    'http://127.0.0.1:3000,'
    'https://denialappealpro.com,'
    'https://www.denialappealpro.com,'
    'https://denialappealpro.netlify.app,'
    'https://denial-appeal-pro.netlify.app'
)
allowed_origins = [
    o.strip()
    for o in os.getenv('ALLOWED_ORIGINS', _default_origins).split(',')
    if o.strip()
]
CORS(
    app,
    origins=allowed_origins,
    allow_headers=['Content-Type', 'Authorization'],
    methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
)

# Configure rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)


@app.errorhandler(RateLimitExceeded)
def _rate_limit_exceeded(e):
    """Return JSON with `error` so SPA login/batch UIs show a message (not opaque failures)."""
    msg = getattr(e, 'description', None) or str(e) or 'Rate limit exceeded'
    return jsonify({'error': msg}), 429


db.init_app(app)

# Configure Stripe
stripe_key = app.config['STRIPE_SECRET_KEY']
if not stripe_key:
    print("⚠️  WARNING: STRIPE_SECRET_KEY is not set!")
else:
    print(f"✓ Stripe API key configured (starts with: {stripe_key[:15]}...)")
stripe.api_key = stripe_key

generator = AppealGenerator(app.config['GENERATED_FOLDER'])
init_customer_portal(app, limiter, generator)
register_onboarding_routes(app, limiter, generator)
register_intelligence_routes(app, limiter)

with app.app_context():
    try:
        from migrate_tracking_columns import ensure_tracking_columns

        ensure_tracking_columns(db)
    except Exception:
        pass
    try:
        from migrate_coding_intelligence import ensure_coding_intelligence_table

        ensure_coding_intelligence_table(db)
    except Exception:
        pass
    try:
        from migrate_intelligence_snapshot import ensure_intelligence_snapshot_column

        ensure_intelligence_snapshot_column(db)
    except Exception:
        pass
    try:
        from migrate_claim_recovery_columns import ensure_claim_recovery_columns

        ensure_claim_recovery_columns(db)
    except Exception:
        pass
    try:
        from migrate_acquisition import ensure_acquisition_schema

        ensure_acquisition_schema(db)
    except Exception as e:
        print(f"⚠️  Acquisition schema migration: {e}")
    try:
        from migrate_retention import ensure_retention_schema

        ensure_retention_schema(db)
    except Exception as e:
        print(f"⚠️  Retention schema migration: {e}")
    # Gunicorn loads app:app — __main__ block never runs; ensure tables, pricing, and admin exist.
    try:
        db.create_all()
        initialize_pricing_data()
        auto_setup_admin()
    except Exception as e:
        print(f"⚠️  Startup initialization warning: {e}")

# File upload configuration
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/api/internal/retention/<command>', methods=['POST'])
def internal_retention_run(command):
    """Cron hook: POST with header X-Retention-Key matching RETENTION_CRON_SECRET."""
    secret = os.getenv('RETENTION_CRON_SECRET')
    if not secret or request.headers.get('X-Retention-Key') != secret:
        return jsonify({'error': 'Forbidden'}), 403
    import retention_jobs

    if command == 'daily':
        retention_jobs.run_daily_weekday()
    elif command == 'weekly':
        retention_jobs.run_weekly()
    elif command == 'reactivation':
        retention_jobs.run_reactivation()
    elif command == 'all':
        retention_jobs.run_daily_weekday()
        retention_jobs.run_weekly()
        retention_jobs.run_reactivation()
    else:
        return jsonify({'error': 'Unknown command'}), 400
    return jsonify({'ok': True, 'command': command})


# ============================================================================
# PRICING & SUBSCRIPTION ROUTES
# ============================================================================

@app.route('/api/pricing/plans', methods=['GET'])
def get_pricing_plans():
    """Get all subscription plans and credit packs"""
    try:
        return jsonify({
            'retail_price': PricingManager.RETAIL_PRICE,
            'subscription_tiers': PricingManager.get_all_subscription_tiers(),
            'credit_packs': PricingManager.get_all_credit_packs()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pricing/subscribe', methods=['POST'])
@limiter.limit("5 per hour")
def create_subscription():
    """Create Stripe subscription checkout session"""
    try:
        data = request.json
        email = data.get('email')
        tier = data.get('tier')  # starter, core, scale
        
        if not email or not tier:
            return jsonify({'error': 'Email and tier are required'}), 400
        
        tier_info = PricingManager.get_subscription_tier(tier)
        if not tier_info:
            return jsonify({'error': 'Invalid subscription tier'}), 400
        
        # Get or create user
        user = CreditManager.get_or_create_user(email)
        
        # Create Stripe customer if doesn't exist
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(email=email)
            user.stripe_customer_id = customer.id
            db.session.commit()
        
        # Get subscription plan from database
        plan = SubscriptionPlan.query.filter_by(name=tier).first()
        if not plan:
            return jsonify({'error': 'Subscription plan not found in database'}), 404
        
        # Create Stripe checkout session for subscription
        session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': plan.stripe_price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{request.headers.get('Origin', 'http://localhost:3000')}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{request.headers.get('Origin', 'http://localhost:3000')}/pricing",
            metadata={
                'user_id': user.id,
                'tier': tier,
                'type': 'subscription',
                'plan_limit': tier_info['included_appeals']
            }
        )
        
        return jsonify({
            'session_id': session.id,
            'user_id': user.id
        }), 200
        
    except Exception as e:
        print(f"❌ Error creating subscription: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pricing/credits', methods=['POST'])
@limiter.limit("10 per hour")
def purchase_credits():
    """Create Stripe checkout session for credit pack purchase"""
    try:
        data = request.json
        email = data.get('email')
        pack_id = data.get('pack_id')  # pack_25, pack_50, etc.
        
        if not email or not pack_id:
            return jsonify({'error': 'Email and pack_id are required'}), 400
        
        pack_info = PricingManager.get_credit_pack(pack_id)
        if not pack_info:
            return jsonify({'error': 'Invalid credit pack'}), 400
        
        # Get or create user
        user = CreditManager.get_or_create_user(email)
        
        # Create Stripe customer if doesn't exist
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(email=email)
            user.stripe_customer_id = customer.id
            db.session.commit()
        
        # Get credit pack from database
        pack = CreditPack.query.filter_by(name=pack_info['name']).first()
        if not pack:
            return jsonify({'error': 'Credit pack not found in database'}), 404
        
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': pack.stripe_price_id,
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{request.headers.get('Origin', 'http://localhost:3000')}/credits/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{request.headers.get('Origin', 'http://localhost:3000')}/pricing",
            metadata={
                'user_id': user.id,
                'pack_id': pack_id,
                'credits': pack.credits,
                'type': 'credit_pack'
            }
        )
        
        return jsonify({
            'session_id': session.id,
            'user_id': user.id
        }), 200
        
    except Exception as e:
        print(f"❌ Error purchasing credits: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# PDF PARSING ROUTE
# ============================================================================

@app.route('/api/parse/denial-letter', methods=['POST'])
@limiter.limit("20 per hour")
def parse_denial_letter():
    """Parse uploaded denial letter PDF and extract information"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only PDF files are allowed.'}), 400
        
        # Save temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{uuid.uuid4()}_{filename}")
        file.save(temp_path)
        
        try:
            # Parse the PDF
            result = parse_denial_pdf(temp_path)
            
            # ADD QUALITY WARNINGS
            if result.get('confidence') == 'low':
                result['warning'] = 'Low confidence extraction - please review all fields carefully'
            
            return jsonify(result), 200
            
        except ValueError as e:
            # USER-FRIENDLY ERROR MESSAGES
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Could not extract information from PDF. Please enter information manually.',
                'allow_manual': True
            }), 400
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    except Exception as e:
        print(f"❌ Error parsing denial letter: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'An error occurred while processing your file. Please enter information manually.',
            'allow_manual': True
        }), 500


@app.route('/api/parse/denial-text', methods=['POST'])
@limiter.limit("30 per hour")
def parse_denial_text_route():
    """Extract claim fields from pasted denial / EOB plain text (fast path, no file)."""
    try:
        data = request.get_json(silent=True) or {}
        text = (data.get('text') or '').strip()
        if not text:
            return jsonify({'success': False, 'error': 'Empty text'}), 400
        if len(text) > 100_000:
            return jsonify({'success': False, 'error': 'Text exceeds maximum length'}), 400

        result = parse_denial_text(text)
        if result.get('confidence') == 'low' and not result.get('warning'):
            result['warning'] = 'Low confidence extraction - please review all fields carefully'

        return jsonify(result), 200
    except Exception as e:
        print(f"❌ Error parsing denial text: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'Could not parse pasted text. Try again or adjust the excerpt.',
            'allow_manual': True,
        }), 500

# ============================================================================
# APPEAL SUBMISSION ROUTES (Updated with Credit Logic)
# ============================================================================

@app.route('/api/appeals/submit', methods=['POST'])
@limiter.limit("10 per hour")
def submit_appeal():
    try:
        # Get user email (required for credit system)
        email = request.form.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Get or create user
        user = CreditManager.get_or_create_user(email)
        
        # Validate required fields
        required = ['payer', 'claim_number', 'patient_id', 'provider_name', 'provider_npi', 'date_of_service', 'denial_reason']
        missing_fields = [field for field in required if not request.form.get(field)]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'missing_fields': missing_fields
            }), 400
        
        # Check timely filing
        deadline_str = request.form.get('timely_filing_deadline')
        if deadline_str:
            try:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d').date()
                if not validate_timely_filing(deadline):
                    return jsonify({
                        'error': 'Timely filing deadline has passed',
                        'deadline': deadline_str,
                        'message': 'The timely filing deadline for this claim has already passed. Appeals may not be accepted.'
                    }), 422
            except ValueError:
                return jsonify({'error': 'Invalid date format for timely_filing_deadline. Use YYYY-MM-DD'}), 400
        
        # Check duplicate
        if check_duplicate(request.form.get('claim_number'), request.form.get('payer')):
            return jsonify({
                'error': 'Duplicate appeal detected',
                'message': f'An appeal for claim {request.form.get("claim_number")} with {request.form.get("payer")} already exists in the system.',
                'claim_number': request.form.get('claim_number')
            }), 422
        
        # Handle file upload with validation
        denial_letter = request.files.get('denial_letter')
        denial_letter_path = None
        if denial_letter:
            if not allowed_file(denial_letter.filename):
                return jsonify({
                    'error': 'Invalid file type',
                    'message': 'Only PDF, JPG, JPEG, and PNG files are allowed.',
                    'allowed_types': ['pdf', 'jpg', 'jpeg', 'png']
                }), 400
            
            denial_letter.seek(0, os.SEEK_END)
            file_size = denial_letter.tell()
            denial_letter.seek(0)
            
            if file_size > MAX_FILE_SIZE:
                file_size_mb = file_size / (1024 * 1024)
                return jsonify({
                    'error': 'File size exceeds limit',
                    'message': f'File size ({file_size_mb:.1f}MB) exceeds the 10MB limit.',
                    'max_size_mb': 10
                }), 400
            
            filename = secure_filename(denial_letter.filename)
            denial_letter_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_{filename}")
            denial_letter.save(denial_letter_path)
        
        # Create appeal
        appeal_id = f"APP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        appeal = Appeal(
            appeal_id=appeal_id,
            user_id=user.id,
            payer=request.form.get('payer'),
            claim_number=request.form.get('claim_number'),
            patient_id=request.form.get('patient_id'),
            provider_name=request.form.get('provider_name'),
            provider_npi=request.form.get('provider_npi'),
            date_of_service=datetime.strptime(request.form.get('date_of_service'), '%Y-%m-%d').date(),
            denial_reason=request.form.get('denial_reason'),
            billed_amount=request.form.get('billed_amount', 0.00),
            diagnosis_code=request.form.get('diagnosis_code'),
            denial_code=request.form.get('denial_code'),
            cpt_codes=request.form.get('cpt_codes'),
            appeal_level=request.form.get('appeal_level', 'level_1'),
            timely_filing_deadline=datetime.strptime(deadline_str, '%Y-%m-%d').date() if deadline_str else None,
            denial_letter_path=denial_letter_path,
            status='pending',
            payment_status='unpaid',
            price_charged=app.config['PRICE_PER_APPEAL'],
            credit_used=False,
            queue_status='pending',
        )
        
        db.session.add(appeal)
        db.session.flush()
        db.session.add(
            ClaimStatusEvent(
                appeal_db_id=appeal.id,
                user_id=user.id,
                event_type='created',
                message='Appeal submitted',
            )
        )
        db.session.commit()
        
        return jsonify({
            'appeal_id': appeal_id,
            'message': 'Appeal submitted successfully',
            'status': 'pending',
            'user_id': user.id,
            'credit_balance': user.credit_balance
        }), 201
        
    except ValueError as e:
        return jsonify({
            'error': 'Invalid data format',
            'message': str(e)
        }), 400
    except Exception as e:
        print(f"❌ Error in submit_appeal: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred while processing your appeal. Please try again or contact support.'
        }), 500

@app.route('/api/appeals/generate/<appeal_id>', methods=['POST'])
@limiter.limit("10 per hour")
def generate_appeal_with_credits(appeal_id):
    """Generate appeal using credits or retail payment - WITH USAGE TRACKING"""
    try:
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not appeal:
            return jsonify({'error': 'Appeal not found'}), 404
        
        # PREVENT ANY REGENERATION
        if appeal.status == 'completed':
            return jsonify({'error': 'Appeal already generated'}), 400
        
        # PREVENT RETAIL REGENERATION EXPLOIT
        if appeal.retail_token_used:
            return jsonify({
                'error': 'Retail appeal already generated',
                'message': 'This retail appeal has already been generated. Purchase credits for additional appeals.'
            }), 400
        
        if appeal.user_id:
            user = User.query.get(appeal.user_id)
            if user:
                # TESTING: payment disabled
                # allowed, _used, used_free_trial = CreditManager.try_begin_generation(user.id)
                allowed, _used, used_free_trial = True, False, False
                if allowed:
                    appeal.credit_used = True
                    appeal.payment_status = 'free_trial' if used_free_trial else 'paid'
                    appeal.status = 'paid'
                    appeal.generation_count += 1
                    db.session.commit()
                    try:
                        pdf_path = generator.generate_appeal(appeal)
                        appeal.appeal_letter_path = pdf_path
                        appeal.status = 'completed'
                        appeal.completed_at = datetime.utcnow()
                        appeal.last_generated_at = datetime.utcnow()
                        if getattr(appeal, 'queue_status', None) is not None:
                            appeal.queue_status = 'generated'
                        db.session.commit()
                        CreditManager.increment_usage(user.id, used_free_trial=used_free_trial)
                        usage_stats = CreditManager.get_usage_stats(user.id)
                        sub_id = getattr(user, 'stripe_subscription_id', None)
                        if (
                            usage_stats.get('overage_count', 0) > 0
                            and sub_id
                            and not used_free_trial
                        ):
                            try:
                                StripeBilling.report_overage_usage(user.id, quantity=1)
                            except Exception:
                                pass
                        return jsonify({
                            'message': 'Appeal generated successfully',
                            'appeal_id': appeal_id,
                            'status': 'completed',
                            'credit_balance': user.credit_balance,
                            'usage_stats': usage_stats
                        }), 200
                    except Exception as e:
                        appeal.status = 'failed'
                        db.session.commit()
                        return jsonify({'error': f'Generation failed: {str(e)}'}), 500
        
        return jsonify({
            'error': 'No credits available',
            'message': 'Please purchase credits or pay for this appeal',
            'requires_payment': True
        }), 402
        
    except Exception as e:
        print(f"❌ Error generating appeal: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/appeals/payment/<appeal_id>', methods=['POST'])
@limiter.limit("5 per hour")
def create_payment(appeal_id):
    """Create retail payment for single appeal"""
    try:
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not appeal:
            return jsonify({'error': 'Appeal not found'}), 404
        
        if appeal.payment_status == 'paid':
            return jsonify({'error': 'Payment already completed'}), 400
        
        # Create Stripe checkout session for retail payment
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {'name': f'Appeal Generation - {appeal.claim_number}'},
                    'unit_amount': 1000,  # $10.00
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{request.headers.get('Origin', 'http://localhost:3000')}/download/{appeal_id}",
            cancel_url=f"{request.headers.get('Origin', 'http://localhost:3000')}/payment/{appeal_id}",
            metadata={
                'appeal_id': appeal_id,
                'type': 'retail'
            }
        )
        
        return jsonify({
            'session_id': session.id,
            'appeal_id': appeal_id
        }), 200
        
    except Exception as e:
        print(f"❌ Error in create_payment: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# STRIPE BILLING ENDPOINTS
# ============================================================================

@app.route('/api/stripe/create-checkout', methods=['POST'])
@limiter.limit("10 per hour")
def create_stripe_checkout():
    """
    Create Stripe checkout session for subscription
    Uses new StripeBilling service with metered overage billing
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        plan = data.get('plan')  # starter, core, scale
        
        if not user_id or not plan:
            return jsonify({'error': 'user_id and plan are required'}), 400
        
        # Get origin for redirect URLs
        origin = request.headers.get('Origin', Config.DOMAIN)
        success_url = f"{origin}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/pricing"
        
        # Create checkout session with metered billing
        result = StripeBilling.create_checkout_session(
            user_id=user_id,
            plan=plan,
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"❌ Error creating checkout: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stripe/create-portal', methods=['POST'])
@limiter.limit("10 per hour")
def create_stripe_portal():
    """
    Create Stripe customer portal session for self-service billing management
    Allows users to upgrade, downgrade, cancel, and update payment methods
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        # Get origin for return URL
        origin = request.headers.get('Origin', Config.DOMAIN)
        return_url = f"{origin}/dashboard"
        
        # Create portal session
        result = StripeBilling.create_portal_session(
            user_id=user_id,
            return_url=return_url
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"❌ Error creating portal: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stripe/subscription/<int:user_id>', methods=['GET'])
def get_stripe_subscription(user_id):
    """Get detailed subscription information from Stripe"""
    try:
        info = StripeBilling.get_subscription_info(user_id)
        if not info:
            return jsonify({'error': 'No subscription found'}), 404
        
        return jsonify(info), 200
        
    except Exception as e:
        print(f"❌ Error getting subscription: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stripe/upgrade', methods=['POST'])
@limiter.limit("5 per hour")
def upgrade_stripe_subscription():
    """Upgrade user subscription to a higher tier"""
    try:
        data = request.json
        user_id = data.get('user_id')
        new_plan = data.get('plan')  # core or scale
        
        if not user_id or not new_plan:
            return jsonify({'error': 'user_id and plan are required'}), 400
        
        # Upgrade subscription
        success = StripeBilling.upgrade_subscription(user_id, new_plan)
        
        if success:
            return jsonify({'status': 'success', 'message': f'Upgraded to {new_plan}'}), 200
        else:
            return jsonify({'error': 'Upgrade failed'}), 500
        
    except Exception as e:
        print(f"❌ Error upgrading subscription: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# STRIPE WEBHOOK HANDLER (Enhanced)
# ============================================================================

@app.route('/api/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """
    Enhanced Stripe webhook handler
    Handles all subscription lifecycle events and metered billing
    """
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    # Verify webhook signature
    event = StripeBilling.verify_webhook_signature(payload, sig_header)
    if not event:
        return jsonify({'error': 'Invalid signature'}), 400
    
    event_id = event['id']
    event_type = event['type']
    
    # HARD WEBHOOK IDEMPOTENCY - rely on unique constraint
    try:
        with db.session.begin():
            db.session.add(ProcessedWebhookEvent(event_id=event_id, event_type=event_type))
            db.session.flush()
    except Exception:
        # IntegrityError from unique constraint = duplicate event
        print(f"⚠️  Duplicate webhook event: {event_id}")
        return jsonify({'status': 'duplicate'}), 200
    
    print(f"📨 Processing webhook: {event_type}")
    
    # Handle checkout.session.completed
    if event_type == 'checkout.session.completed':
        session = event['data']['object']
        metadata = session.get('metadata', {})
        payment_type = metadata.get('type')
        
        if payment_type == 'subscription':
            # NEW: Use StripeBilling service for subscription activation
            StripeBilling.handle_checkout_completed(session)
            
            # LEGACY: Also update credit manager for backward compatibility
            user_id = metadata.get('user_id')
            tier = metadata.get('tier')
            if user_id and tier:
                CreditManager.set_subscription(user_id, tier)
                CreditManager.update_plan_limit(user_id)
                CreditManager.allocate_monthly_credits(user_id)
        
        elif payment_type == 'credit_pack':
            # Handle credit pack purchase
            user_id = metadata.get('user_id')
            credits = int(metadata.get('credits', 0))
            
            if user_id and credits:
                CreditManager.add_credits(user_id, credits, reason='purchase')
                print(f"✓ Added {credits} credits to user {user_id}")
        
        elif payment_type == 'onboarding_retail':
            appeal_id = metadata.get('appeal_id')
            if appeal_id:
                appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
                if appeal and appeal.user_id is None:
                    appeal.payment_status = 'paid'
                    appeal.status = 'awaiting_account'
                    appeal.paid_at = datetime.utcnow()
                    appeal.stripe_payment_intent_id = session.get('payment_intent')
                    db.session.commit()
                    print(f"✓ Onboarding retail paid; awaiting account signup for {appeal_id}")
        
        elif payment_type == 'retail':
            # Handle retail appeal payment
            appeal_id = metadata.get('appeal_id')
            
            if appeal_id:
                appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
                if appeal:
                    # CHECK IF ALREADY GENERATED
                    if appeal.status == 'completed' or appeal.retail_token_used:
                        print(f"⚠️  Appeal {appeal_id} already completed - ignoring webhook")
                        return jsonify({'status': 'already_completed'}), 200
                    
                    appeal.payment_status = 'paid'
                    appeal.status = 'paid'
                    appeal.paid_at = datetime.utcnow()
                    appeal.stripe_payment_intent_id = session.get('payment_intent')
                    appeal.retail_token_used = True  # LOCK RETAIL GENERATION
                    appeal.generation_count += 1
                    db.session.commit()
                    
                    # Generate appeal after payment
                    try:
                        appeal_path = generator.generate_appeal(appeal)
                        appeal.appeal_letter_path = appeal_path
                        appeal.status = 'completed'
                        appeal.completed_at = datetime.utcnow()
                        appeal.last_generated_at = datetime.utcnow()
                        if getattr(appeal, 'queue_status', None) is not None:
                            appeal.queue_status = 'generated'
                        db.session.commit()
                        
                        # INCREMENT USAGE TRACKING for retail appeals
                        if appeal.user_id:
                            CreditManager.increment_usage(appeal.user_id)
                        
                        print(f"✓ Appeal generated for {appeal_id}")
                    except Exception as e:
                        appeal.status = 'failed'
                        db.session.commit()
                        print(f"❌ Appeal generation failed: {e}")
    
    # Handle invoice.paid (for recurring subscriptions)
    elif event_type == 'invoice.paid':
        invoice = event['data']['object']
        
        # NEW: Use StripeBilling service to reset usage counters
        StripeBilling.handle_invoice_paid(invoice)
        
        # LEGACY: Also allocate credits for backward compatibility
        customer_id = invoice.get('customer')
        user = User.query.filter_by(stripe_customer_id=customer_id).first()
        if user and user.subscription_tier:
            CreditManager.allocate_monthly_credits(user.id)
    
    # Handle customer.subscription.updated
    elif event_type == 'customer.subscription.updated':
        subscription = event['data']['object']
        
        # NEW: Use StripeBilling service to handle upgrades/downgrades
        StripeBilling.handle_subscription_updated(subscription)
    
    # Handle customer.subscription.deleted
    elif event_type == 'customer.subscription.deleted':
        subscription = event['data']['object']
        
        # NEW: Use StripeBilling service to handle cancellation
        StripeBilling.handle_subscription_deleted(subscription)
        
        # LEGACY: Also update credit manager
        customer_id = subscription.get('customer')
        user = User.query.filter_by(stripe_customer_id=customer_id).first()
        if user:
            CreditManager.cancel_subscription(user.id)
    
    # Event already marked as processed at start of function
    return jsonify({'status': 'success'}), 200

# ============================================================================
# INTERNAL TESTING ENDPOINTS (DO NOT EXPOSE IN PRODUCTION)
# ============================================================================

@app.route('/internal/test-parallel-deduction', methods=['POST'])
def test_parallel_deduction():
    """Test parallel credit deduction for race conditions"""
    import concurrent.futures
    
    data = request.json
    user_id = data.get('user_id')
    threads = data.get('threads', 20)
    
    if not user_id:
        return jsonify({'error': 'user_id required'}), 400
    
    # Get initial state
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    initial_sub = user.subscription_credits
    initial_bulk = user.bulk_credits
    initial_total = initial_sub + initial_bulk
    
    # Execute parallel deductions
    def deduct():
        return CreditManager.deduct_credit(user_id)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=threads) as executor:
        futures = [executor.submit(deduct) for _ in range(threads)]
        results = [f.result() for f in futures]
    
    success_count = sum(results)
    fail_count = len(results) - success_count
    
    # Get final state
    db.session.expire(user)
    user = User.query.get(user_id)
    final_sub = user.subscription_credits
    final_bulk = user.bulk_credits
    final_total = final_sub + final_bulk
    
    return jsonify({
        'initial_subscription_credits': initial_sub,
        'initial_bulk_credits': initial_bulk,
        'initial_total': initial_total,
        'threads': threads,
        'success': success_count,
        'fail': fail_count,
        'final_subscription_credits': final_sub,
        'final_bulk_credits': final_bulk,
        'final_total': final_total,
        'credits_deducted': initial_total - final_total,
        'expected_deductions': min(initial_total, threads)
    })

@app.route('/internal/test-webhook-duplicate', methods=['POST'])
def test_webhook_duplicate():
    """Test webhook duplicate handling"""
    import concurrent.futures
    from sqlalchemy.exc import IntegrityError
    
    data = request.json
    event_id = data.get('event_id', f'test_event_{int(time.time())}')
    
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
    
    success_count = sum(results)
    
    # Check database
    event_count = ProcessedWebhookEvent.query.filter_by(event_id=event_id).count()
    
    return jsonify({
        'event_id': event_id,
        'parallel_inserts_attempted': 2,
        'successful_inserts': success_count,
        'events_in_database': event_count,
        'unique_constraint_working': event_count == 1
    })

# ============================================================================
# USER & ADMIN ROUTES
# ============================================================================

@app.route('/api/user/<int:user_id>', methods=['GET'])
def get_user_info(user_id):
    """Get user information and stats"""
    try:
        stats = CreditManager.get_user_stats(user_id)
        if not stats:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/email/<email>', methods=['GET'])
def get_user_by_email(email):
    """Get user information by email"""
    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        stats = CreditManager.get_user_stats(user.id)
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/usage/<int:user_id>', methods=['GET'])
def get_usage_stats(user_id):
    """Get detailed usage statistics"""
    try:
        stats = CreditManager.get_usage_stats(user_id)
        if not stats:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/usage/email/<email>', methods=['GET'])
def get_usage_by_email(email):
    """Get usage statistics by email"""
    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        stats = CreditManager.get_usage_stats(user.id)
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upgrade/suggestions/<int:user_id>', methods=['GET'])
def get_upgrade_suggestions(user_id):
    """Get upgrade suggestions based on usage"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        usage_stats = CreditManager.get_usage_stats(user_id)
        next_tier = PricingManager.get_next_tier(user.subscription_tier)
        
        return jsonify({
            'current_tier': user.subscription_tier,
            'usage_stats': usage_stats,
            'next_tier': next_tier,
            'should_upgrade': usage_stats['upgrade_status'] in ['approaching_limit', 'limit_reached']
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/dashboard', methods=['GET'])
def admin_dashboard():
    """Admin dashboard with metrics"""
    try:
        # Total users
        total_users = User.query.count()
        
        # Total appeals
        total_appeals = Appeal.query.count()
        completed_appeals = Appeal.query.filter_by(status='completed').count()
        
        # Revenue calculations
        retail_revenue = Appeal.query.filter_by(payment_status='paid', credit_used=False).count() * 10
        
        # Subscription breakdown
        subscription_counts = {}
        for tier in ['starter', 'growth', 'pro']:
            count = User.query.filter_by(subscription_tier=tier).count()
            subscription_counts[tier] = count
        
        # Appeals by payer (top 10)
        from sqlalchemy import func
        payer_stats = db.session.query(
            Appeal.payer,
            func.count(Appeal.id).label('count')
        ).group_by(Appeal.payer).order_by(func.count(Appeal.id).desc()).limit(10).all()
        
        # Appeals by denial code (top 10)
        denial_code_stats = db.session.query(
            Appeal.denial_code,
            func.count(Appeal.id).label('count')
        ).filter(Appeal.denial_code.isnot(None)).group_by(Appeal.denial_code).order_by(func.count(Appeal.id).desc()).limit(10).all()
        
        # Recent appeals
        recent_appeals = Appeal.query.order_by(Appeal.created_at.desc()).limit(10).all()
        
        return jsonify({
            'total_users': total_users,
            'total_appeals': total_appeals,
            'completed_appeals': completed_appeals,
            'retail_revenue': retail_revenue,
            'subscription_counts': subscription_counts,
            'top_payers': [{'payer': p[0], 'count': p[1]} for p in payer_stats],
            'top_denial_codes': [{'code': d[0], 'count': d[1]} for d in denial_code_stats],
            'recent_appeals': [{
                'appeal_id': a.appeal_id,
                'payer': a.payer,
                'status': a.status,
                'created_at': a.created_at.isoformat()
            } for a in recent_appeals]
        }), 200
        
    except Exception as e:
        print(f"❌ Error in admin dashboard: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# EXISTING ROUTES (Maintained for compatibility)
# ============================================================================

@app.route('/api/appeals/list', methods=['GET'])
def list_appeals():
    """List all appeals (for testing)"""
    try:
        appeals = Appeal.query.order_by(Appeal.created_at.desc()).limit(20).all()
        return jsonify({
            'appeals': [{
                'appeal_id': a.appeal_id,
                'claim_number': a.claim_number,
                'payer': getattr(a, 'payer', getattr(a, 'payer_name', 'Unknown')),
                'status': a.status,
                'payment_status': a.payment_status,
                'created_at': a.created_at.isoformat() if a.created_at else None
            } for a in appeals]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/appeals/<appeal_id>', methods=['GET'])
def get_appeal(appeal_id):
    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    if not appeal:
        return jsonify({'error': 'Not found'}), 404
    
    return jsonify({
        'id': appeal.id,
        'appeal_id': appeal.appeal_id,
        'claim_number': appeal.claim_number,
        'payer': getattr(appeal, 'payer', getattr(appeal, 'payer_name', 'Unknown')),
        'status': appeal.status,
        'payment_status': appeal.payment_status,
        'created_at': appeal.created_at.isoformat(),
        'credit_used': appeal.credit_used
    })

@app.route('/api/appeals/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id')
    
    if user_id:
        appeals = Appeal.query.filter_by(user_id=user_id).order_by(Appeal.created_at.desc()).limit(50).all()
    else:
        appeals = Appeal.query.order_by(Appeal.created_at.desc()).limit(50).all()
    
    return jsonify({
        'appeals': [{
            'id': a.id,
            'appeal_id': a.appeal_id,
            'claim_number': a.claim_number,
            'payer': getattr(a, 'payer', getattr(a, 'payer_name', 'Unknown')),
            'status': a.status,
            'credit_used': a.credit_used
        } for a in appeals]
    })

@app.route('/api/appeals/<appeal_id>/download', methods=['GET'])
def download_appeal(appeal_id):
    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    
    if not appeal:
        return jsonify({'error': 'Appeal not found'}), 404
    
    if appeal.status != 'completed':
        return jsonify({'error': 'Appeal not ready', 'status': appeal.status}), 404
    
    if not appeal.appeal_letter_path:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if using Supabase Storage
    if Config.USE_SUPABASE_STORAGE:
        file_data = storage.download_file(appeal.appeal_letter_path)
        if not file_data:
            return jsonify({'error': 'File not found in storage'}), 404
        
        return Response(
            file_data,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=appeal_{appeal.claim_number}.pdf'
            }
        )
    else:
        if not os.path.exists(appeal.appeal_letter_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(
            appeal.appeal_letter_path, 
            as_attachment=True, 
            download_name=f"appeal_{appeal.claim_number}.pdf"
        )

@app.route('/api/appeals/<appeal_id>/outcome', methods=['PUT'])
def update_appeal_outcome(appeal_id):
    """
    Update the outcome of an appeal for tracking and analytics
    
    Expected payload:
    {
        "outcome_status": "approved|partially_approved|denied|pending_review|withdrawn",
        "outcome_date": "YYYY-MM-DD",
        "outcome_amount_recovered": 15000.00,
        "outcome_notes": "Additional details about the outcome"
    }
    """
    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    
    if not appeal:
        return jsonify({'error': 'Appeal not found'}), 404
    
    data = request.json
    
    # Validate outcome_status
    valid_statuses = ['approved', 'partially_approved', 'denied', 'pending_review', 'withdrawn']
    outcome_status = data.get('outcome_status')
    if outcome_status and outcome_status not in valid_statuses:
        return jsonify({'error': f'Invalid outcome_status. Must be one of: {", ".join(valid_statuses)}'}), 400
    
    # Update outcome fields
    if outcome_status:
        appeal.outcome_status = outcome_status
    
    if data.get('outcome_date'):
        try:
            appeal.outcome_date = datetime.strptime(data['outcome_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid outcome_date format. Use YYYY-MM-DD'}), 400
    
    if data.get('outcome_amount_recovered') is not None:
        appeal.outcome_amount_recovered = float(data['outcome_amount_recovered'])
    
    if data.get('outcome_notes'):
        appeal.outcome_notes = data['outcome_notes']
    
    appeal.outcome_updated_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'appeal_id': appeal.appeal_id,
            'outcome_status': appeal.outcome_status,
            'outcome_date': appeal.outcome_date.isoformat() if appeal.outcome_date else None,
            'outcome_amount_recovered': float(appeal.outcome_amount_recovered) if appeal.outcome_amount_recovered else None
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update outcome: {str(e)}'}), 500

@app.route('/api/analytics/outcomes', methods=['GET'])
def get_outcome_analytics():
    """
    Get analytics on appeal outcomes for continuous improvement
    
    Returns success rates, average recovery amounts, and quality score correlations
    """
    # Get all appeals with outcomes
    appeals_with_outcomes = Appeal.query.filter(Appeal.outcome_status.isnot(None)).all()
    
    if not appeals_with_outcomes:
        return jsonify({
            'total_appeals': 0,
            'message': 'No outcome data available yet'
        })
    
    # Calculate statistics
    total = len(appeals_with_outcomes)
    approved = sum(1 for a in appeals_with_outcomes if a.outcome_status == 'approved')
    partially_approved = sum(1 for a in appeals_with_outcomes if a.outcome_status == 'partially_approved')
    denied = sum(1 for a in appeals_with_outcomes if a.outcome_status == 'denied')
    
    success_rate = (approved + partially_approved) / total if total > 0 else 0
    
    # Calculate recovery statistics
    total_billed = sum(float(a.billed_amount or 0) for a in appeals_with_outcomes)
    total_recovered = sum(float(a.outcome_amount_recovered or 0) for a in appeals_with_outcomes)
    recovery_rate = total_recovered / total_billed if total_billed > 0 else 0
    
    # Quality score analysis
    appeals_with_quality = [a for a in appeals_with_outcomes if a.ai_quality_score is not None]
    avg_quality_score = sum(a.ai_quality_score for a in appeals_with_quality) / len(appeals_with_quality) if appeals_with_quality else None
    
    # Quality correlation with success
    successful_appeals = [a for a in appeals_with_outcomes if a.outcome_status in ['approved', 'partially_approved'] and a.ai_quality_score is not None]
    avg_quality_successful = sum(a.ai_quality_score for a in successful_appeals) / len(successful_appeals) if successful_appeals else None
    
    denied_appeals = [a for a in appeals_with_outcomes if a.outcome_status == 'denied' and a.ai_quality_score is not None]
    avg_quality_denied = sum(a.ai_quality_score for a in denied_appeals) / len(denied_appeals) if denied_appeals else None
    
    return jsonify({
        'total_appeals': total,
        'outcomes': {
            'approved': approved,
            'partially_approved': partially_approved,
            'denied': denied,
            'success_rate': round(success_rate * 100, 1)
        },
        'financial': {
            'total_billed': round(total_billed, 2),
            'total_recovered': round(total_recovered, 2),
            'recovery_rate': round(recovery_rate * 100, 1)
        },
        'quality_metrics': {
            'avg_quality_score': round(avg_quality_score, 1) if avg_quality_score else None,
            'avg_quality_successful': round(avg_quality_successful, 1) if avg_quality_successful else None,
            'avg_quality_denied': round(avg_quality_denied, 1) if avg_quality_denied else None,
            'quality_impact': round(avg_quality_successful - avg_quality_denied, 1) if (avg_quality_successful and avg_quality_denied) else None
        }
    })

@app.route('/api/analytics/optimization-insights', methods=['GET'])
def get_optimization_insights():
    """
    Get data-driven insights for prompt optimization
    
    Returns recommendations based on outcome analysis
    """
    try:
        from prompt_optimizer import prompt_optimizer
        insights = prompt_optimizer.get_optimization_insights()
        return jsonify(insights)
    except ImportError:
        return jsonify({'error': 'Optimization module not available'}), 501
    except Exception as e:
        return jsonify({'error': f'Failed to generate insights: {str(e)}'}), 500

@app.route('/api/analytics/ab-tests', methods=['GET'])
def get_ab_tests():
    """
    Get status of all A/B tests
    
    Returns list of active tests and their current results
    """
    try:
        from ab_testing import ab_testing
        
        results = {}
        for test_id, test in ab_testing.active_tests.items():
            if test['status'] == 'active':
                test_results = ab_testing.get_test_results(test_id)
                results[test_id] = test_results
        
        return jsonify({
            'active_tests': len([t for t in ab_testing.active_tests.values() if t['status'] == 'active']),
            'tests': results
        })
    except ImportError:
        return jsonify({'error': 'A/B testing module not available'}), 501
    except Exception as e:
        return jsonify({'error': f'Failed to get test results: {str(e)}'}), 500

@app.route('/api/analytics/ab-tests/<test_id>', methods=['GET'])
def get_ab_test_details(test_id):
    """
    Get detailed results for a specific A/B test
    
    Returns statistical analysis and recommendation
    """
    try:
        from ab_testing import ab_testing
        results = ab_testing.get_test_results(test_id)
        return jsonify(results)
    except ImportError:
        return jsonify({'error': 'A/B testing module not available'}), 501
    except Exception as e:
        return jsonify({'error': f'Failed to get test details: {str(e)}'}), 500

# ============================================================================
# ADMIN ROUTES
# ============================================================================

@app.route('/api/admin/login', methods=['POST'])
@limiter.limit("30 per hour")
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        result = admin_auth.login(username, password)
        
        if result['success']:
            return jsonify({
                'success': True,
                'token': result['token'],
                'admin': result['admin']
            }), 200
        else:
            return jsonify({'error': result['error']}), 401
            
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    """Admin logout endpoint"""
    try:
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]
            admin_auth.destroy_session(token)
        
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/verify', methods=['GET'])
@require_admin
def admin_verify():
    """Verify admin session is valid"""
    admin = Admin.query.get(request.admin_id)
    return jsonify({
        'valid': True,
        'admin': {
            'id': admin.id,
            'username': admin.username,
            'email': admin.email
        }
    }), 200

@app.route('/api/admin/dashboard/stats', methods=['GET'])
@require_admin
def admin_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Total counts
        total_appeals = Appeal.query.count()
        total_users = User.query.count()
        total_revenue = db.session.query(db.func.sum(Appeal.price_charged)).filter(
            Appeal.payment_status == 'paid'
        ).scalar() or 0
        
        # Recent appeals (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_appeals = Appeal.query.filter(Appeal.created_at >= thirty_days_ago).count()
        
        # AI quality metrics
        avg_quality_score = db.session.query(db.func.avg(Appeal.ai_quality_score)).filter(
            Appeal.ai_quality_score.isnot(None)
        ).scalar()
        
        avg_citation_count = db.session.query(db.func.avg(Appeal.ai_citation_count)).filter(
            Appeal.ai_citation_count.isnot(None)
        ).scalar()
        
        # Outcome statistics
        appeals_with_outcomes = Appeal.query.filter(Appeal.outcome_status.isnot(None)).count()
        approved_appeals = Appeal.query.filter(Appeal.outcome_status == 'approved').count()
        success_rate = (approved_appeals / appeals_with_outcomes * 100) if appeals_with_outcomes > 0 else 0
        
        total_recovered = db.session.query(db.func.sum(Appeal.outcome_amount_recovered)).filter(
            Appeal.outcome_amount_recovered.isnot(None)
        ).scalar() or 0
        
        return jsonify({
            'totals': {
                'appeals': total_appeals,
                'users': total_users,
                'revenue': float(total_revenue),
                'recovered': float(total_recovered)
            },
            'recent': {
                'appeals_30d': recent_appeals
            },
            'ai_quality': {
                'avg_quality_score': round(float(avg_quality_score), 1) if avg_quality_score else None,
                'avg_citation_count': round(float(avg_citation_count), 1) if avg_citation_count else None
            },
            'outcomes': {
                'total_with_outcomes': appeals_with_outcomes,
                'approved': approved_appeals,
                'success_rate': round(success_rate, 1)
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/appeals', methods=['GET'])
@require_admin
def admin_get_appeals():
    """Get all appeals with filters"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        status = request.args.get('status')
        outcome_status = request.args.get('outcome_status')
        
        query = Appeal.query
        
        if status:
            query = query.filter_by(status=status)
        if outcome_status:
            query = query.filter_by(outcome_status=outcome_status)
        
        query = query.order_by(Appeal.created_at.desc())
        
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        appeals = [{
            'id': a.id,
            'appeal_id': a.appeal_id,
            'payer': a.payer,
            'claim_number': a.claim_number,
            'patient_id': a.patient_id,
            'provider_name': a.provider_name,
            'denial_code': a.denial_code,
            'billed_amount': float(a.billed_amount) if a.billed_amount else None,
            'status': a.status,
            'payment_status': a.payment_status,
            'ai_quality_score': a.ai_quality_score,
            'ai_citation_count': a.ai_citation_count,
            'ai_model_used': a.ai_model_used,
            'outcome_status': a.outcome_status,
            'outcome_amount_recovered': float(a.outcome_amount_recovered) if a.outcome_amount_recovered else None,
            'created_at': a.created_at.isoformat() if a.created_at else None,
            'paid_at': a.paid_at.isoformat() if a.paid_at else None
        } for a in paginated.items]
        
        return jsonify({
            'appeals': appeals,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/appeals/<appeal_id>', methods=['GET'])
@require_admin
def admin_get_appeal_detail(appeal_id):
    """Get detailed appeal information"""
    try:
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not appeal:
            return jsonify({'error': 'Appeal not found'}), 404
        
        return jsonify({
            'appeal_id': appeal.appeal_id,
            'payer': appeal.payer,
            'claim_number': appeal.claim_number,
            'patient_id': appeal.patient_id,
            'provider_name': appeal.provider_name,
            'provider_npi': appeal.provider_npi,
            'date_of_service': appeal.date_of_service.isoformat() if appeal.date_of_service else None,
            'denial_reason': appeal.denial_reason,
            'denial_code': appeal.denial_code,
            'diagnosis_code': appeal.diagnosis_code,
            'cpt_codes': appeal.cpt_codes,
            'billed_amount': float(appeal.billed_amount) if appeal.billed_amount else None,
            'appeal_level': appeal.appeal_level,
            'status': appeal.status,
            'payment_status': appeal.payment_status,
            'ai_quality_score': appeal.ai_quality_score,
            'ai_citation_count': appeal.ai_citation_count,
            'ai_word_count': appeal.ai_word_count,
            'ai_model_used': appeal.ai_model_used,
            'ai_generation_method': appeal.ai_generation_method,
            'outcome_status': appeal.outcome_status,
            'outcome_date': appeal.outcome_date.isoformat() if appeal.outcome_date else None,
            'outcome_amount_recovered': float(appeal.outcome_amount_recovered) if appeal.outcome_amount_recovered else None,
            'outcome_notes': appeal.outcome_notes,
            'created_at': appeal.created_at.isoformat() if appeal.created_at else None,
            'paid_at': appeal.paid_at.isoformat() if appeal.paid_at else None,
            'completed_at': appeal.completed_at.isoformat() if appeal.completed_at else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
@require_admin
def admin_get_users():
    """Get all users"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = User.query.order_by(User.created_at.desc())
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        users = [{
            'id': u.id,
            'email': u.email,
            'subscription_tier': u.subscription_tier,
            'subscription_credits': u.subscription_credits,
            'bulk_credits': u.bulk_credits,
            'total_credits': u.credit_balance,
            'created_at': u.created_at.isoformat() if u.created_at else None,
            'appeal_count': len(u.appeals)
        } for u in paginated.items]
        
        return jsonify({
            'users': users,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Initialize pricing data
        initialize_pricing_data()
        # Auto-setup admin system
        auto_setup_admin()
    app.run(debug=True, port=5000)
