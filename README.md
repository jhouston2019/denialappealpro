# Denial Appeal Pro

A production-grade execution utility for converting denied health insurance claims into procedurally compliant, payer-ready appeal submissions.

## Product Scope

**This is an execution-only tool.**

- Converts denied claims into compliant appeal packages
- Enforces payer rules deterministically
- No medical judgment, legal interpretation, or advocacy
- No outcome guarantees or strategy recommendations

## Core Function

**Input:** Denied health insurance claim  
**Output:** Complete, compliant appeal submission package

## Pricing

$10 per appeal execution

## System Requirements

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

## Installation

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Database Setup

```bash
createdb denial_appeal_pro
cd backend
flask db upgrade
```

## Running the Application

### Development Mode

Backend:
```bash
cd backend
flask run
```

Frontend:
```bash
cd frontend
npm start
```

### Production Mode

```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Architecture

- **Backend:** Flask REST API with deterministic rule engine
- **Frontend:** React administrative interface
- **Database:** PostgreSQL for audit records
- **PDF Generation:** ReportLab for appeal documents

## Compliance

This system:
- Performs execution only
- Enforces payer rules deterministically
- Avoids all medical judgment
- Avoids all legal interpretation
- Never guarantees outcomes

## License

Proprietary
