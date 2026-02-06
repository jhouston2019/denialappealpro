# ✅ Setup Checklist - Denial Appeal Pro Backend

Use this checklist to ensure everything is configured correctly.

---

## 🔐 Environment Configuration

### Required Variables (Must Configure)

- [ ] `SECRET_KEY` - Set to a random string (not the default)
- [ ] `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_test_` or `sk_live_`)
- [ ] `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (starts with `pk_test_` or `pk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret (starts with `whsec_`)

### Optional Variables (Recommended)

- [ ] `OPENAI_API_KEY` - For AI-powered appeal generation (without this, uses templates)
- [ ] `DATABASE_URL` - For PostgreSQL (defaults to SQLite)
- [ ] `SUPABASE_URL` - For cloud file storage (defaults to local filesystem)
- [ ] `SUPABASE_KEY` - For cloud file storage
- [ ] `ALLOWED_ORIGINS` - CORS configuration (defaults to localhost)

---

## 📦 Installation

- [ ] Python 3.11+ installed
- [ ] Virtual environment created: `python -m venv venv`
- [ ] Virtual environment activated: `.\venv\Scripts\activate`
- [ ] Dependencies installed: `pip install -r requirements.txt`

---

## 🗄️ Database Setup

- [ ] Database initialized: `python init_database.py`
- [ ] Tables created successfully
- [ ] Can connect to database

---

## 📁 File System

- [ ] `uploads/` directory exists
- [ ] `generated/` directory exists
- [ ] Directories have write permissions

---

## 🔌 External Services

### Stripe

- [ ] Stripe account created
- [ ] Test mode keys obtained
- [ ] Webhook endpoint configured (for production)

### OpenAI (Optional)

- [ ] OpenAI account created
- [ ] API key obtained
- [ ] API key has credits/active subscription

### Supabase (Optional - for production)

- [ ] Supabase project created
- [ ] Database connection string obtained
- [ ] Storage bucket created
- [ ] Storage policies configured

---

## 🧪 Testing

- [ ] Backend starts without errors: `python app.py`
- [ ] Health check works: `http://localhost:5000/health`
- [ ] Environment validation passes (check startup logs)
- [ ] Can submit test appeal (even if payment fails)
- [ ] File upload works
- [ ] Database writes work

---

## 🚀 Ready to Go!

If all checkboxes above are checked, your backend is ready!

### Start the server:

```powershell
cd backend
.\venv\Scripts\activate
python app.py
```

### Watch for these success messages:

```
✅ VALIDATION PASSED: All required variables configured
✅ Database connection: OK
✅ Stripe connection: OK
✅ Advanced AI appeal generation enabled (or template mode)
```

---

## 🐛 Troubleshooting

### Environment validation fails?

Run the validator directly:
```powershell
python env_validator.py
```

This will show exactly what's missing.

### Database connection fails?

Check:
1. `DATABASE_URL` is correct in `.env`
2. For SQLite: Directory is writable
3. For PostgreSQL: Server is running and accessible

### Stripe connection fails?

Check:
1. Keys are correct (no typos)
2. Keys are for the right mode (test vs live)
3. Account is active

### Import errors?

Reinstall dependencies:
```powershell
pip install --upgrade -r requirements.txt
```

---

## 📝 Notes

- **Development**: Use SQLite and local filesystem (default)
- **Production**: Use PostgreSQL and Supabase Storage
- **AI Appeals**: Optional but highly recommended for better quality
- **Stripe Test Mode**: Use test keys during development

---

**All set?** Move on to testing the full application flow!
