# Denial Appeal Pro - Setup Script (PowerShell)

Write-Host "=== Denial Appeal Pro Setup ===" -ForegroundColor Green
Write-Host ""

# Check Python version
Write-Host "Checking Python version..." -ForegroundColor Yellow
python --version

# Backend setup
Write-Host ""
Write-Host "Setting up backend..." -ForegroundColor Yellow
Set-Location backend

# Create virtual environment
Write-Host "Creating virtual environment..." -ForegroundColor Yellow
python -m venv venv

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    $secretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    @"
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///denial_appeal_pro.db
SECRET_KEY=$secretKey
PRICE_PER_APPEAL=10.00
"@ | Out-File -FilePath .env -Encoding utf8
}

# Initialize database
Write-Host "Initializing database..." -ForegroundColor Yellow
python -c "from app import app, db; app.app_context().push(); db.create_all()"

# Seed database
Write-Host "Seeding database..." -ForegroundColor Yellow
python seed_data.py

Set-Location ..

# Frontend setup
Write-Host ""
Write-Host "Setting up frontend..." -ForegroundColor Yellow
Set-Location frontend

# Install Node dependencies
Write-Host "Installing Node dependencies..." -ForegroundColor Yellow
npm install

Set-Location ..

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:" -ForegroundColor White
Write-Host "  cd backend"
Write-Host "  .\venv\Scripts\Activate.ps1"
Write-Host "  flask run"
Write-Host ""
Write-Host "Frontend:" -ForegroundColor White
Write-Host "  cd frontend"
Write-Host "  npm start"
Write-Host ""
Write-Host "Or use Docker:" -ForegroundColor White
Write-Host "  docker-compose up -d"
Write-Host ""
