# Denial Appeal Pro - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### 1. Health Check

**GET** `/health`

Check service status.

**Response:**
```json
{
  "status": "operational",
  "service": "Denial Appeal Pro"
}
```

---

### 2. Create Appeal

**POST** `/api/appeals`

Execute appeal workflow for a single claim.

**Request Body:**
```json
{
  "payer_name": "UnitedHealthcare",
  "plan_type": "commercial",
  "claim_number": "CLM123456",
  "patient_id": "PT001",
  "provider_npi": "1234567890",
  "date_of_service": "2024-01-15",
  "denial_date": "2024-02-01",
  "denial_reason_codes": "16,M80",
  "appeal_level": "1",
  "submission_channel": "fax"
}
```

**Required Fields:**
- `payer_name` (string)
- `plan_type` (enum: "commercial", "medicare", "medicaid")
- `claim_number` (string)
- `patient_id` (string)
- `provider_npi` (string, 10 digits)
- `date_of_service` (date, YYYY-MM-DD)
- `denial_date` (date, YYYY-MM-DD)
- `denial_reason_codes` (string, comma-separated or array)
- `submission_channel` (enum: "portal", "fax", "mail")

**Optional Fields:**
- `appeal_level` (string, default: "1")

**Success Response (201):**
```json
{
  "appeal_id": "APP-20240201-A1B2C3D4",
  "status": "prepared",
  "denial_category": "missing_documentation",
  "deadline": "2024-07-30",
  "rules_applied": {
    "timely_filing": {
      "deadline": "2024-07-30",
      "compliant": true,
      "message": "Deadline: 2024-07-30 (180 days from denial)"
    },
    "appeal_level": {
      "valid": true,
      "message": "Appeal level 1 of 2 allowed"
    },
    "duplicate_check": {
      "valid": true,
      "message": "No duplicate detected"
    }
  },
  "documents": {
    "appeal_letter": "appeal_letter_APP-20240201-A1B2C3D4.pdf",
    "attachment_checklist": "attachment_checklist_APP-20240201-A1B2C3D4.pdf",
    "cover_sheet": "cover_sheet_APP-20240201-A1B2C3D4.pdf"
  },
  "price_charged": 10.00,
  "message": "Appeal package prepared for submission"
}
```

**Error Response (422):**
```json
{
  "error": "HARD STOP: Appeal deadline (2024-01-15) has passed",
  "rules_applied": {
    "timely_filing": {
      "deadline": "2024-01-15",
      "compliant": false,
      "message": "HARD STOP: Appeal deadline (2024-01-15) has passed"
    }
  }
}
```

---

### 3. Get Appeal

**GET** `/api/appeals/{appeal_id}`

Retrieve appeal execution record.

**Response:**
```json
{
  "appeal_id": "APP-20240201-A1B2C3D4",
  "claim_number": "CLM123456",
  "payer_name": "UnitedHealthcare",
  "plan_type": "commercial",
  "denial_category": "missing_documentation",
  "submission_status": "prepared",
  "created_at": "2024-02-01T10:30:00",
  "appeal_deadline": "2024-07-30",
  "price_charged": 10.00
}
```

---

### 4. Download Document

**GET** `/api/appeals/{appeal_id}/download/{doc_type}`

Download generated appeal documents.

**Parameters:**
- `appeal_id` (path): Appeal identifier
- `doc_type` (path): Document type ("letter" or "checklist")

**Response:**
PDF file download

---

### 5. Batch Create Appeals

**POST** `/api/appeals/batch`

Process multiple appeals simultaneously.

**Request Body:**
```json
{
  "appeals": [
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
    },
    {
      "payer_name": "Aetna",
      "plan_type": "commercial",
      "claim_number": "CLM002",
      "patient_id": "PT002",
      "provider_npi": "1234567890",
      "date_of_service": "2024-01-20",
      "denial_date": "2024-02-05",
      "denial_reason_codes": "50,197",
      "appeal_level": "1",
      "submission_channel": "portal"
    }
  ]
}
```

**Response:**
```json
{
  "total": 2,
  "results": [
    {
      "claim_number": "CLM001",
      "status": "success",
      "result": {
        "appeal_id": "APP-20240201-A1B2C3D4",
        "status": "prepared",
        "denial_category": "missing_documentation",
        "price_charged": 10.00
      }
    },
    {
      "claim_number": "CLM002",
      "status": "failed",
      "result": {
        "error": "Channel 'portal' not supported. Use: fax, mail"
      }
    }
  ]
}
```

---

### 6. List Payer Rules

**GET** `/api/payer-rules`

List all configured payer rules.

**Response:**
```json
{
  "rules": [
    {
      "id": 1,
      "payer_name": "UnitedHealthcare",
      "plan_type": "commercial",
      "appeal_deadline_days": 180,
      "max_appeal_levels": 2,
      "supports_portal": true,
      "supports_fax": true,
      "supports_mail": true
    }
  ]
}
```

---

### 7. Create Payer Rule

**POST** `/api/payer-rules`

Create new payer-specific rule.

**Request Body:**
```json
{
  "payer_name": "Blue Cross Blue Shield",
  "plan_type": "commercial",
  "appeal_deadline_days": 180,
  "max_appeal_levels": 2,
  "supports_portal": false,
  "supports_fax": true,
  "supports_mail": true,
  "required_documents": [
    "Original denial letter",
    "Claim form",
    "Medical records",
    "Itemized bill"
  ],
  "requires_resubmission": false,
  "special_instructions": null
}
```

**Required Fields:**
- `payer_name` (string)
- `plan_type` (enum: "commercial", "medicare", "medicaid")
- `appeal_deadline_days` (integer)

**Response:**
```json
{
  "id": 2,
  "message": "Payer rule created"
}
```

---

### 8. List Denial Codes

**GET** `/api/denial-codes`

List all denial reason codes in taxonomy.

**Response:**
```json
{
  "codes": [
    {
      "code": "16",
      "code_type": "CARC",
      "description": "Claim/service lacks information or has submission/billing error(s)",
      "category": "missing_documentation"
    },
    {
      "code": "29",
      "code_type": "CARC",
      "description": "The time limit for filing has expired",
      "category": "timely_filing"
    }
  ]
}
```

---

### 9. Get Metrics

**GET** `/api/metrics`

Internal metrics (not user-facing).

**Response:**
```json
{
  "appeals_initiated": 150,
  "appeals_submitted": 120,
  "appeals_prepared": 30,
  "note": "Internal metrics only"
}
```

---

## Error Codes

- `400` - Bad Request (missing required fields)
- `404` - Not Found (appeal or document not found)
- `422` - Unprocessable Entity (rule engine rejection)
- `500` - Internal Server Error

## Rate Limiting

No rate limiting in current version. Implement as needed for production.

## Authentication

No authentication in current version. Implement as needed for production deployment.
