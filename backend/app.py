"""Main Flask application."""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_migrate import Migrate
from datetime import datetime
import json
import uuid
import os

from config import config
from models import db, Appeal, PayerRule, DenialCode
from rule_engine import RuleEngine, RuleEngineException
from appeal_generator import AppealGenerator

app = Flask(__name__)
app.config.from_object(config['development'])

CORS(app)
db.init_app(app)
migrate = Migrate(app, db)

appeal_generator = AppealGenerator(app.config['GENERATED_APPEALS_DIR'])


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'operational', 'service': 'Denial Appeal Pro'})


@app.route('/api/appeals', methods=['POST'])
def create_appeal():
    """
    Execute appeal workflow.
    
    STEP 1: Intake
    STEP 2: Denial Classification
    STEP 3: Rule Engine Validation
    STEP 4: Appeal Assembly
    STEP 5: Submission Handling
    STEP 6: Audit Record Creation
    """
    try:
        data = request.json
        
        # STEP 1: Validate required intake fields
        required_fields = [
            'payer_name', 'plan_type', 'claim_number', 'patient_id',
            'provider_npi', 'date_of_service', 'denial_date',
            'denial_reason_codes', 'submission_channel'
        ]
        
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'missing': missing_fields
            }), 400
        
        # Validate plan type
        if data['plan_type'] not in ['commercial', 'medicare', 'medicaid']:
            return jsonify({
                'error': 'Invalid plan_type. Must be: commercial, medicare, or medicaid'
            }), 400
        
        # Validate submission channel
        if data['submission_channel'] not in ['portal', 'fax', 'mail']:
            return jsonify({
                'error': 'Invalid submission_channel. Must be: portal, fax, or mail'
            }), 400
        
        # Parse denial reason codes
        if isinstance(data['denial_reason_codes'], str):
            denial_codes = [c.strip() for c in data['denial_reason_codes'].split(',')]
        else:
            denial_codes = data['denial_reason_codes']
        
        # STEP 2: Denial Classification
        denial_category = RuleEngine.classify_denial(denial_codes)
        
        # STEP 3: Deterministic Rule Engine
        is_valid, error_msg, rules_applied = RuleEngine.validate_and_execute(data)
        
        if not is_valid:
            # Log failed attempt
            execution_log = {
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'rejected',
                'reason': error_msg,
                'rules_applied': rules_applied
            }
            
            return jsonify({
                'error': error_msg,
                'rules_applied': rules_applied,
                'execution_log': execution_log
            }), 422
        
        # Generate unique appeal ID
        appeal_id = f"APP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # STEP 4: Appeal Assembly
        try:
            # Generate appeal letter
            appeal_letter_path = appeal_generator.generate_appeal_letter(data, appeal_id)
            
            # Get required documents
            required_docs = RuleEngine.get_required_documents(
                data['payer_name'],
                data['plan_type']
            )
            
            # Generate attachment checklist
            checklist_path = appeal_generator.generate_attachment_checklist(
                data, appeal_id, required_docs
            )
            
            # Generate submission cover sheet
            cover_sheet_path = appeal_generator.generate_submission_cover_sheet(
                data, appeal_id, data['submission_channel']
            )
            
        except Exception as e:
            return jsonify({
                'error': f'Appeal assembly failed: {str(e)}'
            }), 500
        
        # STEP 5: Submission Handling
        # For now, prepare package for manual submission
        # Direct submission can be implemented per payer
        submission_status = 'prepared'
        submission_timestamp = None
        
        # STEP 6: Audit & Record Creation
        appeal_deadline = None
        for rule_key, rule_data in rules_applied.items():
            if rule_key == 'timely_filing' and 'deadline' in rule_data:
                appeal_deadline = datetime.fromisoformat(rule_data['deadline']).date()
                break
        
        execution_log = {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'success',
            'steps_completed': [
                'intake_validation',
                'denial_classification',
                'rule_engine_validation',
                'appeal_assembly',
                'submission_preparation'
            ],
            'documents_generated': [
                os.path.basename(appeal_letter_path),
                os.path.basename(checklist_path),
                os.path.basename(cover_sheet_path)
            ]
        }
        
        # Create immutable appeal record
        appeal = Appeal(
            appeal_id=appeal_id,
            payer_name=data['payer_name'],
            plan_type=data['plan_type'],
            claim_number=data['claim_number'],
            patient_id=data['patient_id'],
            provider_npi=data['provider_npi'],
            date_of_service=datetime.strptime(data['date_of_service'], '%Y-%m-%d').date(),
            denial_date=datetime.strptime(data['denial_date'], '%Y-%m-%d').date(),
            denial_reason_codes=json.dumps(denial_codes),
            appeal_level=data.get('appeal_level', '1'),
            submission_channel=data['submission_channel'],
            denial_category=denial_category,
            appeal_deadline=appeal_deadline,
            deadline_compliant=True,
            submission_status=submission_status,
            submission_timestamp=submission_timestamp,
            appeal_letter_path=appeal_letter_path,
            attachment_checklist_path=checklist_path,
            rules_applied=json.dumps(rules_applied),
            execution_log=json.dumps(execution_log),
            price_charged=app.config['PRICE_PER_APPEAL']
        )
        
        db.session.add(appeal)
        db.session.commit()
        
        return jsonify({
            'appeal_id': appeal_id,
            'status': 'prepared',
            'denial_category': denial_category,
            'deadline': appeal_deadline.isoformat() if appeal_deadline else None,
            'rules_applied': rules_applied,
            'documents': {
                'appeal_letter': os.path.basename(appeal_letter_path),
                'attachment_checklist': os.path.basename(checklist_path),
                'cover_sheet': os.path.basename(cover_sheet_path)
            },
            'price_charged': float(app.config['PRICE_PER_APPEAL']),
            'message': 'Appeal package prepared for submission'
        }), 201
        
    except Exception as e:
        return jsonify({
            'error': f'Appeal execution failed: {str(e)}'
        }), 500


@app.route('/api/appeals/<appeal_id>', methods=['GET'])
def get_appeal(appeal_id):
    """Retrieve appeal record."""
    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    
    if not appeal:
        return jsonify({'error': 'Appeal not found'}), 404
    
    return jsonify({
        'appeal_id': appeal.appeal_id,
        'claim_number': appeal.claim_number,
        'payer_name': appeal.payer_name,
        'plan_type': appeal.plan_type,
        'denial_category': appeal.denial_category,
        'submission_status': appeal.submission_status,
        'created_at': appeal.created_at.isoformat(),
        'appeal_deadline': appeal.appeal_deadline.isoformat() if appeal.appeal_deadline else None,
        'price_charged': float(appeal.price_charged)
    })


@app.route('/api/appeals/<appeal_id>/download/<doc_type>', methods=['GET'])
def download_document(appeal_id, doc_type):
    """Download generated appeal documents."""
    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    
    if not appeal:
        return jsonify({'error': 'Appeal not found'}), 404
    
    if doc_type == 'letter':
        filepath = appeal.appeal_letter_path
    elif doc_type == 'checklist':
        filepath = appeal.attachment_checklist_path
    else:
        return jsonify({'error': 'Invalid document type'}), 400
    
    if not filepath or not os.path.exists(filepath):
        return jsonify({'error': 'Document not found'}), 404
    
    return send_file(filepath, as_attachment=True)


@app.route('/api/appeals/batch', methods=['POST'])
def batch_create_appeals():
    """
    Batch appeal processing for high-throughput workflows.
    """
    try:
        data = request.json
        appeals_data = data.get('appeals', [])
        
        if not appeals_data:
            return jsonify({'error': 'No appeals provided'}), 400
        
        results = []
        
        for appeal_data in appeals_data:
            # Process each appeal individually
            with app.test_request_context(
                '/api/appeals',
                method='POST',
                json=appeal_data
            ):
                response = create_appeal()
                
                if isinstance(response, tuple):
                    result_data, status_code = response
                else:
                    result_data = response
                    status_code = 200
                
                results.append({
                    'claim_number': appeal_data.get('claim_number'),
                    'status': 'success' if status_code == 201 else 'failed',
                    'result': result_data.get_json()
                })
        
        return jsonify({
            'total': len(appeals_data),
            'results': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Batch processing failed: {str(e)}'
        }), 500


@app.route('/api/payer-rules', methods=['GET'])
def list_payer_rules():
    """List all configured payer rules."""
    rules = PayerRule.query.all()
    
    return jsonify({
        'rules': [{
            'id': rule.id,
            'payer_name': rule.payer_name,
            'plan_type': rule.plan_type,
            'appeal_deadline_days': rule.appeal_deadline_days,
            'max_appeal_levels': rule.max_appeal_levels,
            'supports_portal': rule.supports_portal,
            'supports_fax': rule.supports_fax,
            'supports_mail': rule.supports_mail
        } for rule in rules]
    })


@app.route('/api/payer-rules', methods=['POST'])
def create_payer_rule():
    """Create new payer rule."""
    try:
        data = request.json
        
        required_fields = ['payer_name', 'plan_type', 'appeal_deadline_days']
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            return jsonify({'error': 'Missing required fields', 'missing': missing}), 400
        
        rule = PayerRule(
            payer_name=data['payer_name'],
            plan_type=data['plan_type'],
            appeal_deadline_days=data['appeal_deadline_days'],
            max_appeal_levels=data.get('max_appeal_levels', 2),
            supports_portal=data.get('supports_portal', False),
            supports_fax=data.get('supports_fax', True),
            supports_mail=data.get('supports_mail', True),
            required_documents=json.dumps(data.get('required_documents', [])),
            requires_resubmission=data.get('requires_resubmission', False),
            special_instructions=data.get('special_instructions')
        )
        
        db.session.add(rule)
        db.session.commit()
        
        return jsonify({
            'id': rule.id,
            'message': 'Payer rule created'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/denial-codes', methods=['GET'])
def list_denial_codes():
    """List all denial codes."""
    codes = DenialCode.query.all()
    
    return jsonify({
        'codes': [{
            'code': code.code,
            'code_type': code.code_type,
            'description': code.description,
            'category': code.category
        } for code in codes]
    })


@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Internal metrics - not user-facing."""
    total_appeals = Appeal.query.count()
    submitted_appeals = Appeal.query.filter_by(submission_status='submitted').count()
    prepared_appeals = Appeal.query.filter_by(submission_status='prepared').count()
    
    return jsonify({
        'appeals_initiated': total_appeals,
        'appeals_submitted': submitted_appeals,
        'appeals_prepared': prepared_appeals,
        'note': 'Internal metrics only'
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
