# Denial Appeal Pro

Professional insurance appeal letter generation service. Turn denied claims into winning appeals for $10.

## Features

### Core Features
- ✅ Professional appeal letter generation
- ✅ Stripe payment integration ($10 per appeal)
- ✅ Timely filing validation (90-day window)
- ✅ Duplicate appeal prevention
- ✅ PDF generation and download
- ✅ Appeal history tracking
- ✅ Mobile-responsive navy blue design

### Security & Performance
- ✅ Rate limiting (200/day, 50/hour)
- ✅ CORS protection with whitelist
- ✅ File validation (type & size)
- ✅ Error boundaries (no white screens)
- ✅ Code splitting with React.lazy()
- ✅ Service worker for offline capability
- ✅ PostgreSQL support with connection pooling

### Monitoring & Analytics
- ✅ Google Analytics integration (optional)
- ✅ Performance monitoring (Web Vitals)
- ✅ Error tracking and logging
- ✅ Email notifications (optional)

## Tech Stack

**Frontend:**
- React 18
- React Router
- Axios
- Stripe.js

**Backend:**
- Flask
- SQLAlchemy (PostgreSQL/SQLite)
- Stripe API
- ReportLab (PDF generation)
- Flask-Limiter (rate limiting)

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (optional, SQLite works for dev)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file (see `backend/.env.example`):
```bash
cp .env.example .env
# Edit .env with your values
```

5. Run the development server:
```bash
python app.py
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (see `frontend/.env.example`):
```bash
cp .env.example .env
# Edit .env with your values
```

4. Run the development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## Environment Variables

### Backend `.env`
```bash
# Flask Configuration
SECRET_KEY=your-secret-key-here

# Database (use PostgreSQL in production)
DATABASE_URL=postgresql://user:password@host:port/database

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.netlify.app

# Pricing
PRICE_PER_APPEAL=10.00
```

### Frontend `.env`
```bash
# API URL
REACT_APP_API_URL=http://localhost:5000

# Stripe
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Analytics (Optional)
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
```

## Deployment

### Frontend (Netlify)

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
3. Set environment variables in Netlify dashboard:
   - `REACT_APP_API_URL` (your backend URL)
   - `REACT_APP_STRIPE_PUBLISHABLE_KEY`
4. Deploy!

### Backend (Railway/Render)

1. Connect your GitHub repository
2. Select `backend` as root directory
3. Set environment variables (all from `.env.example`)
4. Add PostgreSQL database addon
5. Configure Stripe webhook URL in Stripe dashboard:
   - URL: `https://your-backend.railway.app/api/stripe/webhook`
   - Events: `checkout.session.completed`
6. Deploy!

## Production Checklist

### Backend
- [ ] Set strong `SECRET_KEY` in backend
- [ ] Use PostgreSQL database (not SQLite)
- [ ] Configure production Stripe keys
- [ ] Set up Stripe webhook in dashboard
- [ ] Configure CORS with production domains
- [ ] Set up email service (optional)
- [ ] Configure database backups
- [ ] Set up error monitoring (optional: Sentry)

### Frontend
- [ ] Set `REACT_APP_API_URL` to production backend
- [ ] Configure production Stripe publishable key
- [ ] Add Google Analytics tracking ID (optional)
- [ ] Test all pages load correctly
- [ ] Verify service worker registration

### Testing
- [ ] Test payment flow end-to-end
- [ ] Verify file uploads work (PDF, images)
- [ ] Test appeal generation and download
- [ ] Test on mobile devices
- [ ] Verify rate limiting works
- [ ] Test offline capability
- [ ] Check loading states on slow connections

## API Endpoints

### Appeals
- `POST /api/appeals/submit` - Submit new appeal
- `GET /api/appeals/:id` - Get appeal details
- `GET /api/appeals/history` - Get all appeals
- `GET /api/appeals/:id/download` - Download appeal PDF

### Payment
- `POST /api/appeals/payment/:id` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Stripe webhook handler

### Health
- `GET /health` - Health check endpoint

## Rate Limits

- Global: 200 requests/day, 50 requests/hour per IP
- Submit appeal: 10 requests/hour per IP
- Create payment: 5 requests/hour per IP

## File Upload Limits

- Allowed types: PDF, JPG, JPEG, PNG
- Maximum size: 10MB

## Security Features

- ✅ Rate limiting
- ✅ CORS protection
- ✅ File type validation
- ✅ File size validation
- ✅ Stripe webhook signature verification
- ✅ SQL injection protection (SQLAlchemy ORM)
- ✅ XSS protection (React escaping)

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact: [your-email@example.com]

## Price

$10 per appeal. No subscriptions. No tiers.
