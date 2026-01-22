# Denial Appeal Pro

Health insurance denial → appeal execution utility.

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Environment Variables

Backend `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=sqlite:///appeals.db
```

Frontend `.env`:
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Deployment

Frontend: Netlify
Backend: Railway/Render

## Price

$10 per appeal. No subscriptions. No tiers.
