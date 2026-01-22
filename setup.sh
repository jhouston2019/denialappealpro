#!/bin/bash

# Denial Appeal Pro - Setup Script

echo "=== Denial Appeal Pro Setup ==="
echo ""

# Check Python version
echo "Checking Python version..."
python --version

# Backend setup
echo ""
echo "Setting up backend..."
cd backend

# Create virtual environment
echo "Creating virtual environment..."
python -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///denial_appeal_pro.db
SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
PRICE_PER_APPEAL=10.00
EOF
fi

# Initialize database
echo "Initializing database..."
python -c "from app import app, db; app.app_context().push(); db.create_all()"

# Seed database
echo "Seeding database..."
python seed_data.py

cd ..

# Frontend setup
echo ""
echo "Setting up frontend..."
cd frontend

# Install Node dependencies
echo "Installing Node dependencies..."
npm install

cd ..

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the application:"
echo ""
echo "Backend:"
echo "  cd backend"
echo "  source venv/bin/activate  # or venv\\Scripts\\activate on Windows"
echo "  flask run"
echo ""
echo "Frontend:"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "Or use Docker:"
echo "  docker-compose up -d"
echo ""
