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
from models import db, Appeal
from appeal_generator import AppealGenerator
from validator import validate_timely_filing, check_duplicate
from supabase_storage import storage
from env_validator import validate_environment

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

@app.route('/api/appeals/list', methods=['GET'])
def list_appeals():
    """List all appeals (for testing)"""
    try:
        appeals = Appeal.query.order_by(Appeal.created_at.desc()).limit(20).all()
        return jsonify({
            'appeals': [{
                'appeal_id': a.appeal_id,
                'claim_number': a.claim_number,
                'payer_name': a.payer_name,
                'status': a.status,
                'payment_status': a.payment_status,
                'created_at': a.created_at.isoformat() if a.created_at else None
            } for a in appeals]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/appeals/test-generate/<appeal_id>', methods=['POST'])
def test_generate_appeal(appeal_id):
    """Test endpoint to manually generate appeal PDF without payment (for testing only)"""
    try:
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not appeal:
            return jsonify({'error': 'Appeal not found'}), 404
        
        # Generate the appeal PDF
        pdf_path = generator.generate_appeal(appeal)
        
        # Update appeal status
        appeal.pdf_path = pdf_path
        appeal.status = 'completed'
        appeal.payment_status = 'paid'  # Mark as paid for testing
        appeal.generated_at = datetime.now()
        db.session.commit()
        
        return jsonify({
            'message': 'Appeal generated successfully',
            'appeal_id': appeal_id,
            'status': 'completed',
            'pdf_path': pdf_path
        }), 200
        
    except Exception as e:
        print(f"❌ Error in test_generate_appeal: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/appeals/submit', methods=['POST'])
@limiter.limit("10 per hour")
def submit_appeal():
    try:
        # Validate required fields
        required = ['payer_name', 'claim_number', 'patient_id', 'provider_name', 'provider_npi', 'date_of_service', 'denial_reason']
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
        if check_duplicate(request.form.get('claim_number'), request.form.get('payer_name')):
            return jsonify({
                'error': 'Duplicate appeal detected',
                'message': f'An appeal for claim {request.form.get("claim_number")} with {request.form.get("payer_name")} already exists in the system.',
                'claim_number': request.form.get('claim_number')
            }), 422
        
        # Handle file upload with validation
        denial_letter = request.files.get('denial_letter')
        denial_letter_path = None
        if denial_letter:
            # Validate file type
            if not allowed_file(denial_letter.filename):
                return jsonify({
                    'error': 'Invalid file type',
                    'message': 'Only PDF, JPG, JPEG, and PNG files are allowed.',
                    'allowed_types': ['pdf', 'jpg', 'jpeg', 'png']
                }), 400
            
            # Validate file size
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
            payer_name=request.form.get('payer_name'),
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
            timely_filing_deadline=datetime.strptime(deadline_str, '%Y-%m-%d').date() if deadline_str else None,
            denial_letter_path=denial_letter_path,
            status='pending',
            payment_status='unpaid',
            price_charged=app.config['PRICE_PER_APPEAL']
        )
        
        db.session.add(appeal)
        db.session.commit()
        
        return jsonify({
            'appeal_id': appeal_id,
            'message': 'Appeal submitted successfully',
            'status': 'pending'
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

@app.route('/api/appeals/payment/<appeal_id>', methods=['POST'])
@limiter.limit("5 per hour")
def create_payment(appeal_id):
    try:
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not appeal:
            return jsonify({
                'error': 'Appeal not found',
                'message': f'No appeal found with ID: {appeal_id}'
            }), 404
        
        if appeal.payment_status == 'paid':
            return jsonify({
                'error': 'Payment already completed',
                'message': 'This appeal has already been paid for.',
                'appeal_id': appeal_id
            }), 400
        
        # Create Stripe checkout session
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
            metadata={'appeal_id': appeal_id}
        )
        
        return jsonify({
            'session_id': session.id,
            'appeal_id': appeal_id
        }), 200
        
    except stripe.error.StripeError as e:
        print(f"❌ Stripe error in create_payment: {e}")
        return jsonify({
            'error': 'Payment processing error',
            'message': 'Unable to create payment session. Please try again or contact support.',
            'details': str(e)
        }), 500
    except Exception as e:
        import traceback
        print(f"❌ Error in create_payment: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        print(f"❌ Stripe API key set: {bool(stripe.api_key)}")
        print(f"❌ Stripe API key value: {stripe.api_key[:20] if stripe.api_key else 'None'}...")
        return jsonify({
            'error': str(e),
            'message': 'An unexpected error occurred. Please try again or contact support.'
        }), 500

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
    
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        appeal_id = session['metadata']['appeal_id']
        
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if appeal:
            appeal.payment_status = 'paid'
            appeal.status = 'paid'
            appeal.paid_at = datetime.utcnow()
            appeal.stripe_payment_intent_id = session.get('payment_intent')
            db.session.commit()
            
            # Generate appeal after payment
            try:
                appeal_path = generator.generate_appeal(appeal)
                appeal.appeal_letter_path = appeal_path
                appeal.status = 'completed'
                appeal.completed_at = datetime.utcnow()
                db.session.commit()
            except Exception as e:
                appeal.status = 'failed'
                db.session.commit()
    
    return jsonify({'status': 'success'}), 200

@app.route('/api/appeals/<appeal_id>', methods=['GET'])
def get_appeal(appeal_id):
    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    if not appeal:
        return jsonify({'error': 'Not found'}), 404
    
    return jsonify({
        'id': appeal.id,
        'appeal_id': appeal.appeal_id,
        'claim_number': appeal.claim_number,
        'payer_name': appeal.payer_name,
        'status': appeal.status,
        'payment_status': appeal.payment_status,
        'created_at': appeal.created_at.isoformat()
    })

@app.route('/api/appeals/history', methods=['GET'])
def get_history():
    appeals = Appeal.query.order_by(Appeal.created_at.desc()).limit(50).all()
    return jsonify({
        'appeals': [{
            'id': a.id,
            'appeal_id': a.appeal_id,
            'claim_number': a.claim_number,
            'payer_name': a.payer_name,
            'status': a.status
        } for a in appeals]
    })

@app.route('/api/appeals/<appeal_id>/download', methods=['GET'])
def download_appeal(appeal_id):
    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    
    if not appeal:
        return jsonify({
            'error': 'Appeal not found',
            'message': f'No appeal found with ID: {appeal_id}'
        }), 404
    
    if appeal.status != 'completed':
        return jsonify({
            'error': 'Appeal not ready',
            'message': f'Appeal status is "{appeal.status}". Please wait for completion.',
            'status': appeal.status
        }), 404
    
    if not appeal.appeal_letter_path:
        return jsonify({
            'error': 'File not found',
            'message': 'Appeal letter file is missing. Please contact support.'
        }), 404
    
    # Check if using Supabase Storage
    if Config.USE_SUPABASE_STORAGE:
        # Download from Supabase
        file_data = storage.download_file(appeal.appeal_letter_path)
        if not file_data:
            return jsonify({'error': 'File not found in storage'}), 404
        
        # Return file as response
        return Response(
            file_data,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=appeal_{appeal.claim_number}.pdf'
            }
        )
    else:
        # Local filesystem
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
    app.run(debug=True, port=5000)
