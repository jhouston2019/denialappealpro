# Deployment Guide - Denial Appeal Pro

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (production) or SQLite (development)
- Docker & Docker Compose (optional)

## Development Deployment

### Quick Start (Windows)

```powershell
# Run setup script
.\setup.ps1

# Start backend (Terminal 1)
cd backend
.\venv\Scripts\Activate.ps1
flask run

# Start frontend (Terminal 2)
cd frontend
npm start
```

### Quick Start (Linux/Mac)

```bash
# Run setup script
chmod +x setup.sh
./setup.sh

# Start backend (Terminal 1)
cd backend
source venv/bin/activate
flask run

# Start frontend (Terminal 2)
cd frontend
npm start
```

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python -c "from app import app, db; app.app_context().push(); db.create_all()"

# Seed initial data
python seed_data.py

# Run development server
flask run
```

Backend will be available at: `http://localhost:5000`

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm start
```

Frontend will be available at: `http://localhost:3000`

## Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- PostgreSQL: `localhost:5432`

### Option 2: Manual Production Deployment

#### Backend (Production)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_ENV=production
export DATABASE_URL=postgresql://user:pass@localhost/denial_appeal_pro
export SECRET_KEY=your-secret-key-here

# Initialize database
flask db upgrade

# Seed data
python seed_data.py

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

#### Frontend (Production)

```bash
cd frontend

# Build production bundle
npm run build

# Serve with nginx or any static file server
# Copy build/ directory to web server root
```

### Option 3: Cloud Deployment

#### AWS Elastic Beanstalk

1. Install EB CLI:
```bash
pip install awsebcli
```

2. Initialize EB application:
```bash
eb init -p python-3.11 denial-appeal-pro
```

3. Create environment:
```bash
eb create denial-appeal-pro-env
```

4. Deploy:
```bash
eb deploy
```

#### Heroku

1. Create Heroku app:
```bash
heroku create denial-appeal-pro
```

2. Add PostgreSQL:
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

3. Set environment variables:
```bash
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=your-secret-key
```

4. Deploy:
```bash
git push heroku main
```

5. Initialize database:
```bash
heroku run python seed_data.py
```

#### DigitalOcean App Platform

1. Create new app from GitHub repository
2. Configure build settings:
   - Backend: Python, command: `gunicorn -w 4 -b 0.0.0.0:5000 app:app`
   - Frontend: Node.js, build: `npm run build`, output: `build/`
3. Add PostgreSQL database
4. Set environment variables
5. Deploy

## Database Migration

### Creating Migrations

```bash
cd backend
flask db migrate -m "Description of changes"
flask db upgrade
```

### Applying Migrations

```bash
flask db upgrade
```

### Rollback

```bash
flask db downgrade
```

## Environment Variables

### Backend (.env)

```
FLASK_APP=app.py
FLASK_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/denial_appeal_pro
SECRET_KEY=your-secret-key-here
PRICE_PER_APPEAL=10.00
```

### Frontend (.env.production)

```
REACT_APP_API_URL=https://api.denialappealpro.com
```

## Security Considerations

### Production Checklist

- [ ] Set strong `SECRET_KEY`
- [ ] Use PostgreSQL (not SQLite)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable database backups
- [ ] Implement rate limiting
- [ ] Add authentication/authorization
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Review file permissions
- [ ] Disable debug mode

### SSL/HTTPS Setup

#### Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name denialappealpro.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring & Logging

### Application Logs

Backend logs are written to stdout. Configure log aggregation:

```python
# In config.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Health Checks

- Backend: `GET /health`
- Expected response: `{"status": "operational"}`

### Metrics Endpoint

- Internal metrics: `GET /api/metrics`

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump denial_appeal_pro > backup.sql

# Restore
psql denial_appeal_pro < backup.sql
```

### File Backup

Backup these directories:
- `backend/generated_appeals/`
- `backend/audit_logs/`

## Scaling

### Horizontal Scaling

1. Use load balancer (nginx, HAProxy)
2. Run multiple backend instances
3. Share file storage (S3, NFS)
4. Use connection pooling for database

### Database Scaling

1. Enable connection pooling
2. Add read replicas
3. Implement caching (Redis)
4. Optimize queries

## Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version

# Check dependencies
pip list

# Check database connection
python -c "from app import db; print(db.engine.url)"
```

### Frontend build fails

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version
```

### Database migration errors

```bash
# Reset migrations (development only)
flask db downgrade base
flask db upgrade
```

## Performance Optimization

### Backend

- Use Gunicorn with multiple workers
- Enable gzip compression
- Implement caching
- Optimize database queries
- Use connection pooling

### Frontend

- Enable production build
- Use CDN for static assets
- Implement code splitting
- Enable browser caching
- Compress images

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review documentation
3. Check GitHub issues
