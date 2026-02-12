# 🚨 CRITICAL FIXES - MUST IMPLEMENT BEFORE PRODUCTION

## Priority: IMMEDIATE

These fixes address revenue-threatening vulnerabilities found in the audit.

---

## FIX #1: Webhook Idempotency (CRITICAL)

### Problem:
Stripe can send duplicate webhooks → users get double credits

### Implementation:

**Step 1**: Add new model to `models.py`:

```python
class ProcessedWebhookEvent(db.Model):
    __tablename__ = 'processed_webhook_events'
    
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    event_type = db.Column(db.String(100), nullable=False)
    processed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    metadata = db.Column(db.Text)
```

**Step 2**: Update webhook handler in `app.py`:

```python
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
    
    # ✅ CHECK FOR DUPLICATE EVENT
    event_id = event['id']
    existing = ProcessedWebhookEvent.query.filter_by(event_id=event_id).first()
    if existing:
        print(f"⚠️  Duplicate webhook ignored: {event_id}")
        return jsonify({'status': 'duplicate', 'message': 'Event already processed'}), 200
    
    # Process event (existing code)...
    
    # ✅ MARK AS PROCESSED
    try:
        processed = ProcessedWebhookEvent(
            event_id=event_id,
            event_type=event['type'],
            metadata=str(event.get('data', {}).get('object', {}).get('metadata', {}))
        )
        db.session.add(processed)
        db.session.commit()
    except Exception as e:
        print(f"⚠️  Could not mark webhook as processed: {e}")
    
    return jsonify({'status': 'success'}), 200
```

---

## FIX #2: Prevent Retail Regeneration Exploit (CRITICAL)

### Problem:
User pays $10 retail → can regenerate unlimited times

### Implementation:

**Update `app.py` generate endpoint**:

```python
@app.route('/api/appeals/generate/<appeal_id>', methods=['POST'])
@limiter.limit("10 per hour")
def generate_appeal_with_credits(appeal_id):
    """Generate appeal using credits or retail payment"""
    try:
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if not appeal:
            return jsonify({'error': 'Appeal not found'}), 404
        
        # ✅ PREVENT ANY REGENERATION
        if appeal.status == 'completed':
            return jsonify({
                'error': 'Appeal already generated',
                'message': 'This appeal has already been generated and cannot be regenerated.',
                'appeal_id': appeal_id
            }), 400
        
        # ✅ PREVENT RETAIL REGENERATION EXPLOIT
        if appeal.payment_status == 'paid' and not appeal.credit_used and appeal.generation_count > 0:
            return jsonify({
                'error': 'Retail appeal already generated',
                'message': 'This retail appeal has already been generated. Purchase credits for additional appeals.',
                'appeal_id': appeal_id
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
                    appeal.generation_count += 1  # ✅ TRACK GENERATION
                    db.session.commit()
                    
                    # Generate appeal
                    try:
                        pdf_path = generator.generate_appeal(appeal)
                        appeal.appeal_letter_path = pdf_path
                        appeal.status = 'completed'
                        appeal.completed_at = datetime.utcnow()
                        appeal.last_generated_at = datetime.utcnow()  # ✅ TRACK TIMESTAMP
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
```

**Also update retail webhook handler**:

```python
elif event_type == 'retail':
    # Handle retail appeal payment
    appeal_id = metadata.get('appeal_id')
    
    if appeal_id:
        appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
        if appeal:
            # ✅ CHECK IF ALREADY GENERATED
            if appeal.status == 'completed':
                print(f"⚠️  Appeal {appeal_id} already completed - ignoring webhook")
                return jsonify({'status': 'already_completed'}), 200
            
            appeal.payment_status = 'paid'
            appeal.status = 'paid'
            appeal.paid_at = datetime.utcnow()
            appeal.stripe_payment_intent_id = session.get('payment_intent')
            appeal.generation_count += 1  # ✅ TRACK GENERATION
            db.session.commit()
            
            # Generate appeal after payment
            try:
                appeal_path = generator.generate_appeal(appeal)
                appeal.appeal_letter_path = appeal_path
                appeal.status = 'completed'
                appeal.completed_at = datetime.utcnow()
                appeal.last_generated_at = datetime.utcnow()  # ✅ TRACK TIMESTAMP
                db.session.commit()
                print(f"✓ Appeal generated for {appeal_id}")
            except Exception as e:
                appeal.status = 'failed'
                db.session.commit()
                print(f"❌ Appeal generation failed: {e}")
```

---

## FIX #3: PDF Error Handling (HIGH)

### Problem:
Encrypted or image-only PDFs crash the workflow

### Implementation:

**Update `pdf_parser.py`**:

```python
def extract_text_from_pdf(self, pdf_path: str) -> str:
    """Extract text from PDF file with comprehensive error handling"""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            
            # ✅ CHECK IF PDF IS ENCRYPTED
            if reader.is_encrypted:
                try:
                    reader.decrypt('')  # Try empty password
                except:
                    raise ValueError("PDF is password protected. Please provide an unencrypted version.")
            
            # ✅ CHECK IF PDF HAS PAGES
            if len(reader.pages) == 0:
                raise ValueError("PDF has no pages")
            
            text = ""
            empty_pages = 0
            
            for i, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    if not page_text or len(page_text.strip()) < 10:
                        empty_pages += 1
                        print(f"⚠️  Warning: Page {i+1} has minimal or no extractable text")
                    text += page_text + "\n"
                except Exception as e:
                    print(f"⚠️  Warning: Could not extract text from page {i+1}: {e}")
                    empty_pages += 1
            
            # ✅ VALIDATE MINIMUM TEXT LENGTH
            if len(text.strip()) < 50:
                raise ValueError(
                    "PDF contains insufficient text. This may be an image-based PDF. "
                    "Please use a text-based PDF or OCR the document first."
                )
            
            # ✅ WARN IF MANY EMPTY PAGES
            if empty_pages > len(reader.pages) / 2:
                print(f"⚠️  Warning: {empty_pages}/{len(reader.pages)} pages had no extractable text")
            
            return text
            
    except ValueError as e:
        # Re-raise ValueError with user-friendly message
        raise
    except Exception as e:
        # Catch all other errors
        raise ValueError(f"Failed to read PDF: {str(e)}")
```

**Update API endpoint**:

```python
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
            
            # ✅ ADD QUALITY WARNINGS
            if result.get('confidence') == 'low':
                result['warning'] = 'Low confidence extraction - please review all fields carefully'
            
            return jsonify(result), 200
            
        except ValueError as e:
            # ✅ USER-FRIENDLY ERROR MESSAGES
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Could not extract information from PDF. Please enter information manually.'
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
            'message': 'An error occurred while processing your file. Please try again or enter information manually.'
        }), 500
```

---

## FIX #4: Subscription Renewal Credit Logic (MEDIUM)

### Problem:
Unclear if credits should accumulate or reset on renewal

### Decision Required:

**Option A: Accumulate (Recommended)**
```python
@staticmethod
def allocate_monthly_credits(user_id: int) -> bool:
    """Allocate monthly credits - ACCUMULATE unused credits"""
    try:
        user = User.query.get(user_id)
        if not user or not user.subscription_tier:
            return False
        
        plan = SubscriptionPlan.query.filter_by(name=user.subscription_tier).first()
        if not plan:
            return False
        
        # ✅ ADD to existing balance (let them accumulate)
        user.credit_balance += plan.included_credits
        db.session.commit()
        print(f"✓ Added {plan.included_credits} credits to user {user.id} (new balance: {user.credit_balance})")
        return True
    except Exception as e:
        print(f"Error allocating monthly credits: {e}")
        db.session.rollback()
        return False
```

**Option B: Reset with minimum guarantee**
```python
@staticmethod
def allocate_monthly_credits(user_id: int) -> bool:
    """Allocate monthly credits - RESET but ensure minimum"""
    try:
        user = User.query.get(user_id)
        if not user or not user.subscription_tier:
            return False
        
        plan = SubscriptionPlan.query.filter_by(name=user.subscription_tier).first()
        if not plan:
            return False
        
        # ✅ Ensure user has at least included credits
        if user.credit_balance < plan.included_credits:
            user.credit_balance = plan.included_credits
        else:
            # They have more than included - add the monthly amount
            user.credit_balance += plan.included_credits
        
        db.session.commit()
        return True
    except Exception as e:
        print(f"Error allocating monthly credits: {e}")
        db.session.rollback()
        return False
```

**Recommendation**: Use Option A (Accumulate) - more customer-friendly

---

## FIX #5: Add Generation Tracking Columns (REQUIRED FOR FIX #2)

### Migration Required:

```python
# Add to migrate_database.py or create new migration
with db.engine.connect() as conn:
    # Add generation tracking columns
    conn.execute(db.text("ALTER TABLE appeals ADD COLUMN generation_count INTEGER DEFAULT 0"))
    conn.execute(db.text("ALTER TABLE appeals ADD COLUMN last_generated_at TIMESTAMP"))
    conn.commit()
```

---

## DEPLOYMENT CHECKLIST

Before deploying these fixes:

- [ ] Backup production database
- [ ] Run migration to add `processed_webhook_events` table
- [ ] Run migration to add `generation_count` and `last_generated_at` columns
- [ ] Update `models.py` with new model
- [ ] Update `app.py` with webhook idempotency
- [ ] Update `app.py` with regeneration prevention
- [ ] Update `pdf_parser.py` with error handling
- [ ] Update `credit_manager.py` with chosen renewal logic
- [ ] Test webhook idempotency (send same event twice)
- [ ] Test retail regeneration prevention
- [ ] Test encrypted PDF upload
- [ ] Test image-only PDF upload
- [ ] Deploy to staging
- [ ] Run full test suite
- [ ] Deploy to production

---

## TESTING COMMANDS

```bash
# Test webhook idempotency
curl -X POST http://localhost:5000/api/stripe/webhook \
  -H "Stripe-Signature: test" \
  -d '{"id":"evt_test_123","type":"checkout.session.completed"}'

# Should succeed first time, return "duplicate" second time

# Test retail regeneration
curl -X POST http://localhost:5000/api/appeals/generate/APP-20240101-TEST123

# Should fail if already generated

# Test encrypted PDF
# Upload a password-protected PDF - should return user-friendly error
```

---

## ESTIMATED TIME

- Fix #1 (Idempotency): 30 minutes
- Fix #2 (Regeneration): 45 minutes
- Fix #3 (PDF Errors): 30 minutes
- Fix #4 (Credit Logic): 15 minutes
- Fix #5 (Migration): 15 minutes
- Testing: 1 hour

**Total**: ~3 hours to implement and test all critical fixes

---

## POST-FIX VERIFICATION

After implementing, verify:

1. ✅ Webhook fires twice → only processes once
2. ✅ Buy 100 credits → balance increases by 100
3. ✅ Buy 100 more → balance becomes 200 (not 100)
4. ✅ Retail appeal generated → cannot regenerate
5. ✅ Encrypted PDF → clear error message
6. ✅ Image PDF → clear error message
7. ✅ Subscription renewal → credits handled per chosen logic

---

## PRIORITY ORDER

1. **FIX #1** (Idempotency) - CRITICAL - Do first
2. **FIX #2** (Regeneration) - CRITICAL - Do second
3. **FIX #5** (Migration) - REQUIRED - Do third
4. **FIX #3** (PDF Errors) - HIGH - Do fourth
5. **FIX #4** (Credit Logic) - MEDIUM - Do last

---

## SUPPORT

If issues arise during implementation:
1. Check logs for specific error messages
2. Verify database migrations completed
3. Test each fix individually
4. Roll back if necessary (migrations are reversible)
