# Testing & Validation Checklist - Denial Appeal Pro

## Pre-Deployment Testing

### 1. Installation Testing

#### Windows Setup
- [ ] Run `.\setup.ps1` successfully
- [ ] Virtual environment created
- [ ] All Python dependencies installed
- [ ] Database initialized
- [ ] Seed data loaded
- [ ] Frontend dependencies installed

#### Linux/Mac Setup
- [ ] Run `./setup.sh` successfully
- [ ] Virtual environment created
- [ ] All Python dependencies installed
- [ ] Database initialized
- [ ] Seed data loaded
- [ ] Frontend dependencies installed

#### Docker Setup
- [ ] `docker-compose up -d` runs successfully
- [ ] All containers start (db, backend, frontend)
- [ ] Services accessible on correct ports
- [ ] Database migrations applied
- [ ] Seed data loaded

### 2. Backend Testing

#### API Health Check
- [ ] `GET /health` returns 200 status
- [ ] Response: `{"status": "operational"}`

#### Database Connectivity
- [ ] Database connection established
- [ ] Tables created (appeals, payer_rules, denial_codes)
- [ ] Seed data present (7 payers, 20 denial codes)

#### Rule Engine Tests
```bash
cd backend
python -m pytest tests/test_rule_engine.py -v
```

**Expected Results:**
- [ ] `test_timely_filing_valid` - PASS
- [ ] `test_timely_filing_expired` - PASS
- [ ] `test_appeal_level_valid` - PASS
- [ ] `test_appeal_level_exhausted` - PASS
- [ ] `test_duplicate_detection` - PASS
- [ ] `test_submission_channel_validation` - PASS
- [ ] `test_denial_classification` - PASS

#### Language Filter Tests
```bash
cd backend
python -m pytest tests/test_language_filter.py -v
```

**Expected Results:**
- [ ] `test_forbidden_medical_necessity` - PASS
- [ ] `test_forbidden_legal_obligation` - PASS
- [ ] `test_forbidden_entitlement` - PASS
- [ ] `test_forbidden_guarantee` - PASS
- [ ] `test_valid_procedural_language` - PASS
- [ ] `test_valid_neutral_language` - PASS
- [ ] `test_case_insensitive` - PASS

### 3. Frontend Testing

#### Application Load
- [ ] Frontend loads at http://localhost:3000
- [ ] No console errors
- [ ] All navigation links work
- [ ] Header displays correctly
- [ ] Footer displays disclaimer

#### Navigation
- [ ] "New Appeal" page loads
- [ ] "Appeal History" page loads
- [ ] "Batch Processing" page loads
- [ ] "Payer Rules" page loads

### 4. Functional Testing

#### Test Case 1: Valid Appeal Execution

**Input:**
```json
{
  "payer_name": "UnitedHealthcare",
  "plan_type": "commercial",
  "claim_number": "TEST-001",
  "patient_id": "PT001",
  "provider_npi": "1234567890",
  "date_of_service": "2024-01-15",
  "denial_date": "2024-02-01",
  "denial_reason_codes": "16,M80",
  "appeal_level": "1",
  "submission_channel": "fax"
}
```

**Expected Results:**
- [ ] Status: 201 Created
- [ ] Appeal ID generated (format: APP-YYYYMMDD-XXXXXXXX)
- [ ] Denial category: "missing_documentation"
- [ ] Deadline calculated (180 days from denial)
- [ ] Three documents generated
- [ ] Price charged: $10.00
- [ ] Audit record created

**Validation:**
- [ ] Appeal letter PDF generated
- [ ] Attachment checklist PDF generated
- [ ] Cover sheet PDF generated
- [ ] Documents downloadable
- [ ] Language filter passed (no forbidden phrases)

#### Test Case 2: Expired Deadline (Hard Stop)

**Input:**
```json
{
  "payer_name": "UnitedHealthcare",
  "plan_type": "commercial",
  "claim_number": "TEST-002",
  "patient_id": "PT002",
  "provider_npi": "1234567890",
  "date_of_service": "2023-01-15",
  "denial_date": "2023-02-01",
  "denial_reason_codes": "16",
  "submission_channel": "fax"
}
```

**Expected Results:**
- [ ] Status: 422 Unprocessable Entity
- [ ] Error message: "HARD STOP: Appeal deadline has passed"
- [ ] Rules applied logged
- [ ] No documents generated
- [ ] No appeal record created

#### Test Case 3: Exhausted Appeal Levels (Hard Stop)

**Input:**
```json
{
  "payer_name": "UnitedHealthcare",
  "plan_type": "commercial",
  "claim_number": "TEST-003",
  "patient_id": "PT003",
  "provider_npi": "1234567890",
  "date_of_service": "2024-01-15",
  "denial_date": "2024-02-01",
  "denial_reason_codes": "16",
  "appeal_level": "3",
  "submission_channel": "fax"
}
```

**Expected Results:**
- [ ] Status: 422 Unprocessable Entity
- [ ] Error message: "HARD STOP: Appeal levels exhausted"
- [ ] No documents generated

#### Test Case 4: Unsupported Submission Channel (Hard Stop)

**Input:**
```json
{
  "payer_name": "Cigna",
  "plan_type": "commercial",
  "claim_number": "TEST-004",
  "patient_id": "PT004",
  "provider_npi": "1234567890",
  "date_of_service": "2024-01-15",
  "denial_date": "2024-02-01",
  "denial_reason_codes": "16",
  "submission_channel": "portal"
}
```

**Expected Results:**
- [ ] Status: 422 Unprocessable Entity
- [ ] Error message: "Channel 'portal' not supported"
- [ ] Supported channels listed: fax, mail

#### Test Case 5: Batch Processing

**Input:**
```json
{
  "appeals": [
    {
      "payer_name": "UnitedHealthcare",
      "plan_type": "commercial",
      "claim_number": "BATCH-001",
      "patient_id": "PT001",
      "provider_npi": "1234567890",
      "date_of_service": "2024-01-15",
      "denial_date": "2024-02-01",
      "denial_reason_codes": "16",
      "submission_channel": "fax"
    },
    {
      "payer_name": "Aetna",
      "plan_type": "commercial",
      "claim_number": "BATCH-002",
      "patient_id": "PT002",
      "provider_npi": "1234567890",
      "date_of_service": "2024-01-20",
      "denial_date": "2024-02-05",
      "denial_reason_codes": "50",
      "submission_channel": "fax"
    }
  ]
}
```

**Expected Results:**
- [ ] Status: 200 OK
- [ ] Total: 2
- [ ] Both appeals processed
- [ ] Individual results returned
- [ ] Success/failure status for each

### 5. Payer Rules Testing

#### Create New Payer Rule

**Input:**
```json
{
  "payer_name": "Test Payer",
  "plan_type": "commercial",
  "appeal_deadline_days": 90,
  "max_appeal_levels": 2,
  "supports_portal": false,
  "supports_fax": true,
  "supports_mail": true
}
```

**Expected Results:**
- [ ] Status: 201 Created
- [ ] Rule ID returned
- [ ] Rule appears in list
- [ ] Rule enforced in subsequent appeals

#### List Payer Rules

**Expected Results:**
- [ ] Status: 200 OK
- [ ] At least 7 rules returned (seed data)
- [ ] All fields present for each rule

### 6. Document Validation

#### Appeal Letter Validation
- [ ] PDF format
- [ ] Contains disclaimer
- [ ] Neutral language only
- [ ] All required fields present
- [ ] Proper formatting
- [ ] No medical necessity claims
- [ ] No legal interpretation
- [ ] No outcome guarantees

#### Attachment Checklist Validation
- [ ] PDF format
- [ ] Lists required documents
- [ ] Checkbox format
- [ ] Payer-specific requirements
- [ ] Instructions included

#### Cover Sheet Validation
- [ ] PDF format
- [ ] Channel-specific instructions
- [ ] Appeal ID visible
- [ ] Submission date present
- [ ] Package contents listed

### 7. Compliance Validation

#### Language Filter Enforcement
Test with forbidden phrases:
- [ ] "medically necessary" - BLOCKED
- [ ] "patient rights" - BLOCKED
- [ ] "legal obligation" - BLOCKED
- [ ] "entitled to" - BLOCKED
- [ ] "must cover" - BLOCKED
- [ ] "guarantee approval" - BLOCKED

#### Disclaimer Presence
- [ ] All PDFs include disclaimer
- [ ] UI footer shows disclaimer
- [ ] API responses include compliance notes

### 8. Performance Testing

#### Single Appeal
- [ ] Execution time < 5 seconds
- [ ] PDF generation < 2 seconds
- [ ] Database write < 1 second

#### Batch Processing (10 appeals)
- [ ] Total time < 30 seconds
- [ ] All appeals processed
- [ ] No memory leaks
- [ ] Database handles concurrent writes

### 9. Error Handling

#### Missing Required Fields
- [ ] Returns 400 Bad Request
- [ ] Lists missing fields
- [ ] No partial execution

#### Invalid Data Types
- [ ] Returns 400 Bad Request
- [ ] Clear error message
- [ ] No system crash

#### Database Connection Failure
- [ ] Returns 500 Internal Server Error
- [ ] Error logged
- [ ] Graceful degradation

### 10. Security Testing

#### Input Validation
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] File path traversal blocked
- [ ] Oversized inputs rejected

#### File Access
- [ ] Generated files accessible only via API
- [ ] No direct file system access
- [ ] Proper file permissions

### 11. Integration Testing

#### End-to-End Workflow
1. [ ] Submit appeal via UI
2. [ ] Verify rule engine validation
3. [ ] Confirm document generation
4. [ ] Download all documents
5. [ ] Verify audit record created
6. [ ] Check metrics updated

#### API Integration
1. [ ] POST appeal via API
2. [ ] GET appeal record
3. [ ] Download documents via API
4. [ ] Verify response formats

### 12. Metrics Validation

#### Internal Metrics Endpoint
- [ ] `GET /api/metrics` returns data
- [ ] Appeals initiated count accurate
- [ ] Appeals submitted count accurate
- [ ] Appeals prepared count accurate
- [ ] Note about internal use present

### 13. Documentation Validation

#### README.md
- [ ] Installation instructions clear
- [ ] All commands work
- [ ] Links functional

#### QUICKSTART.md
- [ ] 5-minute setup works
- [ ] Example data valid
- [ ] Troubleshooting helpful

#### API_DOCUMENTATION.md
- [ ] All endpoints documented
- [ ] Request/response examples accurate
- [ ] Error codes documented

### 14. Deployment Testing

#### Docker Deployment
- [ ] `docker-compose up -d` works
- [ ] All services healthy
- [ ] Logs accessible
- [ ] Data persists across restarts

#### Manual Deployment
- [ ] Backend runs standalone
- [ ] Frontend builds successfully
- [ ] Production config works
- [ ] Environment variables respected

## Post-Deployment Checklist

### Production Readiness
- [ ] PostgreSQL configured (not SQLite)
- [ ] SECRET_KEY set to secure value
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Firewall rules set
- [ ] Database backups enabled
- [ ] Monitoring configured
- [ ] Logging enabled
- [ ] Error tracking set up

### Security Hardening
- [ ] Debug mode disabled
- [ ] Sensitive data not logged
- [ ] File permissions set correctly
- [ ] Rate limiting considered
- [ ] Authentication planned (if needed)

### Operational Readiness
- [ ] Health check endpoint monitored
- [ ] Disk space monitored
- [ ] Database connections monitored
- [ ] Backup/restore tested
- [ ] Incident response plan documented

## Sign-Off

### Development Team
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Code reviewed
- [ ] Documentation complete

### QA Team
- [ ] Functional testing complete
- [ ] Compliance validation complete
- [ ] Performance testing complete
- [ ] Security testing complete

### Product Owner
- [ ] Requirements met
- [ ] Scope constraints enforced
- [ ] Compliance guardrails verified
- [ ] Pricing model implemented

---

**Testing Date:** _________________  
**Tested By:** _________________  
**Version:** 1.0.0  
**Status:** [ ] PASS [ ] FAIL
