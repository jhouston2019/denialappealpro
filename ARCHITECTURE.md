# Denial Appeal Pro - Architecture

## System Overview

Denial Appeal Pro is a production-grade execution utility that converts denied health insurance claims into procedurally compliant appeal submissions.

## Core Principles

1. **Execution Only** - No advisory function, medical judgment, or legal interpretation
2. **Deterministic Rules** - All decisions made by rule engine, not AI
3. **Payer Compliance** - Strict adherence to payer-specific requirements
4. **Audit Trail** - Immutable records of all executions

## Architecture Components

### Backend (Python/Flask)

```
backend/
├── app.py                 # Main Flask application
├── models.py              # Database models (SQLAlchemy)
├── config.py              # Configuration management
├── rule_engine.py         # Deterministic rule enforcement
├── appeal_generator.py    # PDF document generation
├── seed_data.py          # Database seeding
└── migrations/           # Database migrations
```

### Frontend (React)

```
frontend/
├── src/
│   ├── components/
│   │   ├── AppealForm.js      # Single appeal execution
│   │   ├── AppealList.js      # Metrics display
│   │   ├── BatchUpload.js     # Batch processing
│   │   └── PayerRules.js      # Rule configuration
│   ├── App.js
│   └── index.js
└── public/
```

## Workflow Execution

### Step 1: Intake
- Collect required fields only
- No optional context fields
- Validate data types and formats

### Step 2: Denial Classification
- Map denial codes to taxonomy
- Categories:
  - Timely filing
  - Missing documentation
  - Coding/billing error
  - Authorization related
  - Administrative/eligibility
  - Duplicate/already adjudicated

### Step 3: Rule Engine (Non-AI)
Deterministic validation enforcing:
- **Timely filing calculation**
  - Compute deadline from denial date + payer rules
  - HARD STOP if deadline passed
- **Appeal level eligibility**
  - Check against max allowed levels
  - HARD STOP if exhausted
- **Duplicate detection**
  - Check internal appeal history
  - Prevent duplicate submissions
- **Resubmission vs appeal**
  - Route based on payer requirements
- **Submission channel validation**
  - Verify channel is supported by payer

### Step 4: Appeal Assembly
Generate three documents:
1. **Appeal Letter** - Fixed structure, neutral language
2. **Attachment Checklist** - Payer-required documents
3. **Submission Cover Sheet** - Channel-specific formatting

### Step 5: Submission Handling
- Portal: Structured upload bundle
- Fax: Fax-ready PDF
- Mail: Printable packet

### Step 6: Audit Record
Create immutable record containing:
- Internal appeal ID
- Timestamped execution log
- Rules applied
- Submission method
- Deadline compliance status

## Data Models

### Appeal
Immutable execution record containing all intake data, classification, rules applied, and generated artifacts.

### PayerRule
Payer-specific configuration for deterministic execution:
- Appeal deadline days
- Max appeal levels
- Supported submission channels
- Required documents
- Special instructions

### DenialCode
Taxonomy of denial reason codes (CARC/RARC) mapped to categories.

## Language Filtering

The `LanguageFilter` class prevents forbidden phrases:
- Medical necessity claims
- Legal obligations
- Rights-based arguments
- Outcome guarantees
- Advocacy language

Any violation triggers a hard stop.

## Pricing

- Fixed: $10 per appeal execution
- No subscriptions, tiers, or discounts
- Recorded in immutable appeal record

## Compliance Guardrails

1. No medical judgment
2. No legal interpretation
3. No outcome guarantees
4. No strategy recommendations
5. Procedural execution only

## Metrics (Internal Only)

Tracked but not user-facing:
- Appeals initiated
- Appeals submitted on time
- Procedural rejection rate

## Deployment

### Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask run

# Frontend
cd frontend
npm install
npm start
```

### Production (Docker)
```bash
docker-compose up -d
```

## Security Considerations

1. No PHI storage beyond execution requirements
2. Audit logs for compliance
3. Immutable records prevent tampering
4. Input validation at all entry points

## Extensibility

### Adding New Payers
1. Add payer rule via API or admin interface
2. Configure deadline days, appeal levels, channels
3. Specify required documents

### Adding New Denial Codes
1. Add code to `DenialCode` table
2. Map to appropriate category
3. System automatically classifies

## Testing Strategy

1. **Unit Tests** - Rule engine logic
2. **Integration Tests** - End-to-end workflow
3. **Validation Tests** - Language filtering
4. **Compliance Tests** - Payer rule enforcement
