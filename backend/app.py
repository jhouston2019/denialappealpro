from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from datetime import datetime, timedelta
import stripe
import os
import uuid
from werkzeug.utils import secure_filename

from config import Config
from models import db, Appeal
from appeal_generator import AppealGenerator
from validator import validate_timely_filing, check_duplicate

app = Flask(__name__)
app.config.from_object(Config)

# Configure CORS with specific allowed origins
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=[origin.strip() for origin in allowed_origins])

db.init_app(app)
stripe.api_key = app.config['STRIPE_SECRET_KEY']

generator = AppealGenerator(app.config['GENERATED_FOLDER'])

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/appeals/submit', methods=['POST'])
def submit_appeal():
    try:
        # Validate required fields
        required = ['payer_name', 'claim_number', 'patient_id', 'provider_name', 'provider_npi', 'date_of_service', 'denial_reason']
        for field in required:
            if not request.form.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check timely filing
        deadline_str = request.form.get('timely_filing_deadline')
        if deadline_str:
            deadline = datetime.strptime(deadline_str, '%Y-%m-%d').date()
            if not validate_timely_filing(deadline):
                return jsonify({'error': 'Timely filing deadline has passed'}), 422
        
        # Check duplicate
        if check_duplicate(request.form.get('claim_number'), request.form.get('payer_name')):
            return jsonify({'error': 'Duplicate appeal detected for this claim'}), 422
        
        # Handle file upload
        denial_letter = request.files.get('denial_letter')
        denial_letter_path = None
        if denial_letter:
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
        
        return jsonify({'appeal_id': appeal_id}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/appeals/payment/<appeal_id>', methods=['POST'])
def create_payment(appeal_id):
    try:
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not appeal:
            return jsonify({'error': 'Appeal not found'}), 404
        
        if appeal.payment_status == 'paid':
            return jsonify({'error': 'Already paid'}), 400
        
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
        
        return jsonify({'session_id': session.id}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    if not appeal or appeal.status != 'completed':
        return jsonify({'error': 'Not available'}), 404
    
    if not appeal.appeal_letter_path or not os.path.exists(appeal.appeal_letter_path):
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(appeal.appeal_letter_path, as_attachment=True, download_name=f"appeal_{appeal.claim_number}.pdf")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
