# Netlify Deployment Guide - Denial Appeal Pro

## Important Note

Denial Appeal Pro is a **full-stack application** with both frontend and backend components. Netlify can host the **frontend only**. You'll need a separate service for the backend API.

## Architecture for Netlify Deployment

```
Frontend (React) → Netlify
Backend (Flask API) → Heroku/Railway/Render/DigitalOcean
Database (PostgreSQL) → Backend hosting service
```

---

## Step 1: Deploy Backend First

### Option A: Deploy Backend to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create app
cd backend
heroku create denialappealpro-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
heroku config:set PRICE_PER_APPEAL=10.00

# Create Procfile
echo "web: gunicorn app:app" > Procfile

# Deploy
git init
git add .
git commit -m "Backend deployment"
heroku git:remote -a denialappealpro-api
git push heroku master

# Initialize database
heroku run python seed_data.py
```

Your backend will be at: `https://denialappealpro-api.herokuapp.com`

### Option B: Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Add PostgreSQL
railway add postgresql

# Deploy
railway up

# Get URL
railway domain
```

### Option C: Deploy Backend to Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Add PostgreSQL database
6. Set environment variables
7. Deploy

---

## Step 2: Deploy Frontend to Netlify

### Method 1: Netlify CLI (Recommended)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Navigate to project root
cd "d:\Axis\Axis Projects - Projects\Projects - Stage 1\denial appeal pro"

# Initialize Netlify
netlify init

# Follow prompts:
# - Create & configure a new site
# - Team: Your team
# - Site name: denialappealpro
# - Build command: cd frontend && npm install && npm run build
# - Publish directory: frontend/build

# Deploy
netlify deploy --prod
```

### Method 2: Netlify Dashboard (Easiest)

1. **Go to Netlify:** https://app.netlify.com
2. **Click:** "Add new site" → "Import an existing project"
3. **Connect GitHub:** Select your repository
4. **Configure build settings:**
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
   - **Environment variables:**
     - `REACT_APP_API_URL` = `https://your-backend-url.herokuapp.com`
5. **Click:** "Deploy site"

### Method 3: Manual Deploy

```bash
# Build frontend locally
cd frontend
npm install
npm run build

# Deploy build folder
netlify deploy --prod --dir=build
```

---

## Step 3: Update Frontend API URL

Before deploying, update the frontend to use your backend URL:

### Create `.env.production` in frontend folder:

```env
REACT_APP_API_URL=https://denialappealpro-api.herokuapp.com
```

### Update `frontend/package.json`:

Remove or update the proxy line:

```json
{
  "proxy": "http://localhost:5000"  // Remove this for production
}
```

### Update API calls in frontend:

The frontend should use `process.env.REACT_APP_API_URL` or relative URLs like `/api/appeals`.

---

## Step 4: Configure CORS on Backend

Update `backend/app.py` to allow Netlify domain:

```python
from flask_cors import CORS

# Update CORS configuration
CORS(app, origins=[
    'http://localhost:3000',
    'https://denialappealpro.netlify.app',
    'https://*.netlify.app'
])
```

---

## Step 5: Test Deployment

1. **Visit your Netlify URL:** https://denialappealpro.netlify.app
2. **Test health check:** https://your-backend-url.herokuapp.com/health
3. **Test appeal creation** through the UI
4. **Verify documents download**

---

## Current Status

❌ **Backend:** Not deployed (required for app to function)  
❌ **Frontend:** Not deployed to Netlify  
✅ **Code:** Available on GitHub

---

## Quick Start (All-in-One)

### 1. Deploy Backend to Heroku

```bash
cd backend
heroku create denialappealpro-api
heroku addons:create heroku-postgresql:hobby-dev
echo "web: gunicorn app:app" > Procfile
git init
git add .
git commit -m "Deploy"
heroku git:remote -a denialappealpro-api
git push heroku master
heroku run python seed_data.py
```

### 2. Get Backend URL

```bash
heroku info -a denialappealpro-api
# Copy the "Web URL"
```

### 3. Deploy Frontend to Netlify

```bash
cd ../frontend
echo "REACT_APP_API_URL=https://denialappealpro-api.herokuapp.com" > .env.production
cd ..
netlify init
netlify deploy --prod
```

---

## Alternative: Deploy Both Together

### Option 1: Use Docker on DigitalOcean App Platform

1. Push code to GitHub (already done ✅)
2. Go to DigitalOcean App Platform
3. Create new app from GitHub repo
4. It will detect `docker-compose.yml`
5. Deploy all services together

### Option 2: Use Railway (Easiest Full-Stack)

```bash
railway login
railway init
railway up
railway domain
```

Railway will deploy both frontend and backend automatically.

---

## Troubleshooting

### "Page not found" on Netlify

**Cause:** Backend not deployed or frontend can't reach backend

**Solution:**
1. Deploy backend first
2. Update `REACT_APP_API_URL` in frontend
3. Redeploy frontend

### CORS Errors

**Cause:** Backend doesn't allow Netlify domain

**Solution:** Update CORS settings in `backend/app.py`

### API calls failing

**Cause:** Wrong API URL in frontend

**Solution:** Check `.env.production` has correct backend URL

---

## Recommended Setup

**For Production:**
- **Frontend:** Netlify (free tier works)
- **Backend:** Railway or Render (free tier available)
- **Database:** Included with Railway/Render

**Cost:** $0-10/month

**Steps:**
1. Deploy backend to Railway (5 minutes)
2. Get backend URL
3. Deploy frontend to Netlify with backend URL (5 minutes)
4. Done!

---

## Need Help?

The application is currently only on GitHub. To make it accessible at `denialappealpro.netlify.app`, you need to:

1. ✅ Have code on GitHub (done)
2. ❌ Deploy backend to a hosting service
3. ❌ Deploy frontend to Netlify with backend URL
4. ❌ Configure custom domain (optional)

Would you like me to help you deploy to Railway (easiest) or Heroku?
