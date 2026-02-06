# 🚀 Quick Setup Guide - Denial Appeal Pro

This guide will help you get the application running locally in under 10 minutes.

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Python 3.11+ installed
- ✅ Node.js 18+ installed
- ✅ Git installed

---

## 🔧 Step-by-Step Setup

### Step 1: Configure Environment Variables

**Backend Configuration:**

1. Open `backend/.env` (already created)
2. **REQUIRED**: Update these values:

```env
# Stripe Keys (Get from: https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
```

3. **OPTIONAL** (for AI-powered appeals):
```env
# OpenAI API Key (Get from: https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
```

**Frontend Configuration:**

1. Open `frontend/.env` (already created)
2. Update Stripe key:

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
```

---

### Step 2: Install Backend Dependencies

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

---

### Step 3: Initialize Database

```powershell
# Still in backend directory with venv activated
python init_database.py
```

This will create the SQLite database and all required tables.

---

### Step 4: Install Frontend Dependencies

```powershell
cd ..\frontend
npm install
```

---

### Step 5: Start the Application

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\activate
python app.py
```

Backend will start on: `http://localhost:5000`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm start
```

Frontend will start on: `http://localhost:3000`

---

## ✅ Verify Everything Works

### 1. Check Backend Health
Open browser: `http://localhost:5000/health`

Should see: `{"status": "ok"}`

### 2. Check Frontend
Open browser: `http://localhost:3000`

Should see the landing page.

### 3. Test Stripe Integration
Use Stripe test card:
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

---

## 🔍 Troubleshooting

### Backend won't start?

**Check environment validation output:**
The backend will show which configuration is missing when it starts.

**Common issues:**
- ❌ Missing Stripe keys → Update `backend/.env`
- ❌ Database error → Run `python init_database.py`
- ❌ Port 5000 in use → Change port in `app.py` (last line)

### Frontend won't connect to backend?

**Check:**
1. Backend is running on `http://localhost:5000`
2. `frontend/.env` has `REACT_APP_API_URL=http://localhost:5000`
3. No CORS errors in browser console

### Payment not working?

**Check:**
1. Stripe keys are configured in both `backend/.env` and `frontend/.env`
2. Keys match (test keys start with `sk_test_` and `pk_test_`)
3. Browser console for Stripe errors

### AI appeals not working?

**This is normal!** Without an OpenAI API key, the system uses expert templates instead.

To enable AI:
1. Get API key from: https://platform.openai.com/api-keys
2. Add to `backend/.env`: `OPENAI_API_KEY=sk-proj-...`
3. Restart backend

---

## 🎯 What's Working Now

After setup, you should have:

✅ **Backend server** running with environment validation
✅ **Frontend app** running and connected to backend
✅ **Database** initialized with tables
✅ **File upload** directories created
✅ **Error handling** for common issues
✅ **Stripe integration** ready for test payments
✅ **Template-based appeals** (or AI if configured)

---

## 📝 Next Steps

### For Development:
1. Test the full flow: Submit → Pay → Download
2. Check `backend/uploads/` and `backend/generated/` for files
3. Review generated PDFs

### For Production:
See `DEPLOYMENT.md` for deploying to:
- Supabase (database + storage)
- Fly.io (backend)
- Netlify (frontend)

---

## 🆘 Still Having Issues?

### Check the logs:

**Backend logs:**
Look at the terminal where `python app.py` is running.

**Frontend logs:**
Open browser Developer Tools → Console tab

### Common Error Messages:

| Error | Solution |
|-------|----------|
| "Stripe not configured" | Update Stripe keys in `.env` files |
| "Database connection failed" | Run `python init_database.py` |
| "Cannot connect to server" | Make sure backend is running on port 5000 |
| "CORS error" | Check `ALLOWED_ORIGINS` in `backend/.env` |

---

## 🎉 Success!

If you can:
1. ✅ See the landing page at `http://localhost:3000`
2. ✅ Submit a test appeal form
3. ✅ See the payment page
4. ✅ Complete a test payment
5. ✅ Download the generated PDF

**You're all set!** The application is working correctly.

---

## 📚 Additional Resources

- **Main README**: `README.md` - Feature overview
- **Deployment Guide**: `DEPLOYMENT.md` - Production setup
- **Backend API**: Check `backend/app.py` for all endpoints
- **Stripe Testing**: https://stripe.com/docs/testing

---

**Need help?** Check the error messages - they now include detailed troubleshooting information!
