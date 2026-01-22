# Quick Start Guide - Denial Appeal Pro

## What is Denial Appeal Pro?

An execution-only utility that converts denied health insurance claims into procedurally compliant appeal submissions.

**Price:** $10 per appeal execution

## 5-Minute Setup

### Windows

```powershell
# 1. Run setup script
.\setup.ps1

# 2. Start backend (new terminal)
cd backend
.\venv\Scripts\Activate.ps1
flask run

# 3. Start frontend (new terminal)
cd frontend
npm start
```

### Linux/Mac

```bash
# 1. Run setup script
chmod +x setup.sh
./setup.sh

# 2. Start backend (new terminal)
cd backend
source venv/bin/activate
flask run

# 3. Start frontend (new terminal)
cd frontend
npm start
```

### Docker (Easiest)

```bash
docker-compose up -d
```

## Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Docs:** See API_DOCUMENTATION.md

## First Appeal Execution

1. Navigate to http://localhost:3000
2. Fill in the appeal form:
   - Payer Name: `UnitedHealthcare`
   - Plan Type: `commercial`
   - Claim Number: `TEST-001`
   - Patient ID: `PT001`
   - Provider NPI: `1234567890`
   - Date of Service: (recent date)
   - Denial Date: (recent date)
   - Denial Reason Codes: `16,M80`
   - Submission Channel: `fax`
3. Click "Execute Appeal"
4. Download generated documents

## What Happens During Execution

### Step 1: Intake Validation
System validates all required fields

### Step 2: Denial Classification
Maps denial codes to categories (e.g., missing_documentation)

### Step 3: Rule Engine Validation
Checks:
- ✓ Timely filing deadline
- ✓ Appeal level eligibility
- ✓ Duplicate detection
- ✓ Submission channel support

### Step 4: Document Generation
Creates:
- Appeal letter (PDF)
- Attachment checklist (PDF)
- Submission cover sheet (PDF)

### Step 5: Audit Record
Creates immutable execution record

## Hard Stops

Execution will stop if:
- ❌ Appeal deadline has passed
- ❌ Appeal levels exhausted
- ❌ Duplicate submission detected
- ❌ Submission channel not supported

## Batch Processing

For multiple appeals:

1. Navigate to "Batch Processing"
2. Load example or paste JSON array
3. Click "Process Batch"
4. Review results

Example batch format:
```json
[
  {
    "payer_name": "UnitedHealthcare",
    "plan_type": "commercial",
    "claim_number": "CLM001",
    "patient_id": "PT001",
    "provider_npi": "1234567890",
    "date_of_service": "2024-01-15",
    "denial_date": "2024-02-01",
    "denial_reason_codes": "16,M80",
    "appeal_level": "1",
    "submission_channel": "fax"
  }
]
```

## Payer Configuration

Add new payer rules:

1. Navigate to "Payer Rules"
2. Click "Add New Rule"
3. Configure:
   - Payer name
   - Plan type
   - Appeal deadline (days)
   - Max appeal levels
   - Supported channels
4. Click "Create Rule"

## Common Denial Codes

Pre-configured codes include:

**Timely Filing:**
- `29` - Time limit expired

**Missing Documentation:**
- `16` - Missing information
- `M80` - Incomplete documentation

**Authorization:**
- `50` - Not deemed medical necessity
- `197` - Missing authorization

**Coding/Billing:**
- `4` - Inconsistent modifier
- `11` - Inconsistent diagnosis

## API Usage

### Execute Single Appeal

```bash
curl -X POST http://localhost:5000/api/appeals \
  -H "Content-Type: application/json" \
  -d '{
    "payer_name": "UnitedHealthcare",
    "plan_type": "commercial",
    "claim_number": "TEST-001",
    "patient_id": "PT001",
    "provider_npi": "1234567890",
    "date_of_service": "2024-01-15",
    "denial_date": "2024-02-01",
    "denial_reason_codes": "16,M80",
    "submission_channel": "fax"
  }'
```

### Get Metrics

```bash
curl http://localhost:5000/api/metrics
```

## Troubleshooting

### Backend won't start

```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Linux/Mac

# Check Python version
python --version  # Should be 3.11+
```

### Frontend won't start

```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database errors

```bash
cd backend
python -c "from app import app, db; app.app_context().push(); db.create_all()"
python seed_data.py
```

## File Locations

Generated files are stored in:
- `backend/generated_appeals/` - Appeal PDFs
- `backend/audit_logs/` - Execution logs

## Next Steps

1. **Review Documentation:**
   - `ARCHITECTURE.md` - System design
   - `API_DOCUMENTATION.md` - API reference
   - `COMPLIANCE.md` - Compliance guidelines
   - `DEPLOYMENT.md` - Production deployment

2. **Configure Payers:**
   - Add your payer-specific rules
   - Set appeal deadlines
   - Configure submission channels

3. **Test Workflow:**
   - Execute test appeals
   - Review generated documents
   - Verify rule enforcement

4. **Production Deployment:**
   - Follow DEPLOYMENT.md
   - Configure PostgreSQL
   - Enable HTTPS
   - Set up monitoring

## Important Reminders

- ✓ Execution only - no advisory function
- ✓ No medical judgment or legal interpretation
- ✓ Fixed pricing: $10 per appeal
- ✓ Neutral procedural language only
- ✓ Audit trail for all executions

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Review documentation
3. Check GitHub repository
4. Verify configuration

## System Requirements

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (production)
- 2GB RAM minimum
- 10GB disk space
