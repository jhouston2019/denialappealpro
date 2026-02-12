from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta
import stripe
import os
import uuid
import io
from werkzeug.utils import secure_filename

from config import Config
from models import db, Appeal, User, SubscriptionPlan, CreditPack, ProcessedWebhookEvent
from appeal_generator import AppealGenerator
from validator import validate_timely_filing, check_duplicate
from supabase_storage import storage
from env_validator import validate_environment
from credit_manager import CreditManager, PricingManager, initialize_pricing_data
from pdf_parser import parse_denial_pdf
from timely_filing import calculate_timely_filing
from denial_rules import get_denial_rule

# Validate environment configuration on startup
print("\n" + "="*60)
print("DENIAL APPEAL PRO - BACKEND SERVER")
print("="*60)
validate_environment(strict=False)

app = Flask(__name__)
app.config.from_object(Config)

# Configure CORS with specific allowed origins
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=[origin.strip() for origin in allowed_origins])

# Configure rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

db.init_app(app)

# Configure Stripe
stripe_key = app.config['STRIPE_SECRET_KEY']
if not stripe_key:
    print("⚠️  WARNING: STRIPE_SECRET_KEY is not set!")
else:
    print(f"✓ Stripe API key configured (starts with: {stripe_key[:15]}...)")
stripe.api_key = stripe_key

generator = AppealGenerator(app.config['GENERATED_FOLDER'])

# File upload configuration
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

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
        tier = data.get('tier')  # starter, growth, pro
        
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
                'type': 'subscription'
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
            credit_used=False
        )
        
        db.session.add(appeal)
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
    """Generate appeal using credits or retail payment"""
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
        
        # Check if user has credits
        if appeal.user_id:
            user = User.query.get(appeal.user_id)
            if user and user.credit_balance > 0:
                # Use credit
                if CreditManager.deduct_credit(user.id):
                    appeal.credit_used = True
                    appeal.payment_status = 'paid'
                    appeal.status = 'paid'
                    appeal.generation_count += 1
                    db.session.commit()
                    
                    # Generate appeal
                    try:
                        pdf_path = generator.generate_appeal(appeal)
                        appeal.appeal_letter_path = pdf_path
                        appeal.status = 'completed'
                        appeal.completed_at = datetime.utcnow()
                        appeal.last_generated_at = datetime.utcnow()
                        db.session.commit()
                        
                        return jsonify({
                            'message': 'Appeal generated successfully using credit',
                            'appeal_id': appeal_id,
                            'status': 'completed',
                            'credit_balance': user.credit_balance
                        }), 200
                    except Exception as e:
                        appeal.status = 'failed'
                        db.session.commit()
                        return jsonify({'error': f'Generation failed: {str(e)}'}), 500
        
        # No credits available - require payment
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
# STRIPE WEBHOOK HANDLER (Enhanced)
# ============================================================================

@app.route('/api/stripe/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, app.config['STRIPE_WEBHOOK_SECRET']
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
    event_id = event['id']
    
    # HARD ATOMIC IDEMPOTENCY CHECK - transaction wrapped
    try:
        with db.session.begin_nested():
            # Check if already processed
            existing = db.session.query(ProcessedWebhookEvent).filter_by(event_id=event_id).with_for_update().first()
            if existing:
                return jsonify({'status': 'duplicate'}), 200
            
            # Insert event record FIRST - unique constraint protects against race
            processed = ProcessedWebhookEvent(event_id=event_id, event_type=event['type'])
            db.session.add(processed)
        
        # Commit the event record
        db.session.commit()
        
    except Exception as e:
        # Unique constraint violation = duplicate webhook
        db.session.rollback()
        return jsonify({'status': 'duplicate'}), 200
    
    # Handle checkout.session.completed
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        metadata = session.get('metadata', {})
        event_type = metadata.get('type')
        
        if event_type == 'subscription':
            # Handle subscription purchase
            user_id = metadata.get('user_id')
            tier = metadata.get('tier')
            
            if user_id and tier:
                user = User.query.get(user_id)
                if user:
                    # Set subscription tier
                    CreditManager.set_subscription(user_id, tier)
                    # Allocate monthly credits
                    CreditManager.allocate_monthly_credits(user_id)
                    print(f"✓ Subscription activated for user {user_id}: {tier}")
        
        elif event_type == 'credit_pack':
            # Handle credit pack purchase
            user_id = metadata.get('user_id')
            credits = int(metadata.get('credits', 0))
            
            if user_id and credits:
                CreditManager.add_credits(user_id, credits, reason='purchase')
                print(f"✓ Added {credits} credits to user {user_id}")
        
        elif event_type == 'retail':
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
                        db.session.commit()
                        print(f"✓ Appeal generated for {appeal_id}")
                    except Exception as e:
                        appeal.status = 'failed'
                        db.session.commit()
                        print(f"❌ Appeal generation failed: {e}")
    
    # Handle invoice.paid (for recurring subscriptions)
    elif event['type'] == 'invoice.paid':
        invoice = event['data']['object']
        customer_id = invoice.get('customer')
        
        # Find user by Stripe customer ID
        user = User.query.filter_by(stripe_customer_id=customer_id).first()
        if user and user.subscription_tier:
            # Allocate monthly credits
            CreditManager.allocate_monthly_credits(user.id)
            print(f"✓ Monthly credits allocated for user {user.id}")
    
    # Handle customer.subscription.deleted
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        customer_id = subscription.get('customer')
        
        # Find user and cancel subscription
        user = User.query.filter_by(stripe_customer_id=customer_id).first()
        if user:
            CreditManager.cancel_subscription(user.id)
            print(f"✓ Subscription canceled for user {user.id}")
    
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
            with db.session.begin_nested():
                event = ProcessedWebhookEvent(event_id=event_id, event_type='test')
                db.session.add(event)
            db.session.commit()
            return True
        except IntegrityError:
            db.session.rollback()
            return False
        except Exception:
            db.session.rollback()
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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Initialize pricing data
        initialize_pricing_data()
    app.run(debug=True, port=5000)
