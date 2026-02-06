# ⚡ Quick Start - Denial Appeal Pro

**Get running in 5 minutes!**

---

## 🔑 Step 1: Get Your API Keys (2 minutes)

### Stripe (Required)
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (starts with `sk_test_`)
3. Copy **Publishable key** (starts with `pk_test_`)

### OpenAI (Optional - for AI appeals)
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-`)

---

## ⚙️ Step 2: Configure (1 minute)

### Backend
Edit `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
```

### Frontend
Edit `frontend/.env`:
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

---

## 📦 Step 3: Install (1 minute)

### Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python init_database.py
```

### Frontend
```powershell
cd frontend
npm install
```

---

## 🚀 Step 4: Run (1 minute)

### Terminal 1 - Backend
```powershell
cd backend
.\venv\Scripts\activate
python app.py
```

### Terminal 2 - Frontend
```powershell
cd frontend
npm start
```

---

## ✅ Step 5: Test

1. Open: http://localhost:3000
2. Fill out appeal form
3. Use test card: `4242 4242 4242 4242`
4. Download PDF

---

## 🆘 Quick Fixes

| Problem | Solution |
|---------|----------|
| Backend won't start | Check `.env` has Stripe keys |
| Frontend won't load | Make sure backend is running |
| Payment fails | Verify Stripe keys in both `.env` files |
| No AI appeals | Add `OPENAI_API_KEY` (or use templates) |

---

## 📚 More Help

- **Detailed Setup**: See `SETUP.md`
- **Troubleshooting**: See `FIXES_APPLIED.md`
- **Deployment**: See `DEPLOYMENT.md`

---

**That's it!** You should be up and running. 🎉
