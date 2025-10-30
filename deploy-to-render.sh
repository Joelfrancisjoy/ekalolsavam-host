#!/bin/bash

# Render Deployment Script for Kalolsavam Backend
# This script helps prepare and deploy the Django backend to Render

echo "🚀 Kalolsavam Backend Deployment Script"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "backend/manage.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project structure verified"

# Check if required files exist
echo "📋 Checking required files..."

files=("backend/Procfile" "backend/runtime.txt" "backend/render.yaml" "backend/requirements.txt")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

echo ""
echo "🔧 Pre-deployment checks..."

# Check if gunicorn is in requirements.txt
if grep -q "gunicorn" backend/requirements.txt; then
    echo "✅ Gunicorn found in requirements.txt"
else
    echo "❌ Gunicorn not found in requirements.txt"
    exit 1
fi

# Check if whitenoise is in requirements.txt
if grep -q "whitenoise" backend/requirements.txt; then
    echo "✅ WhiteNoise found in requirements.txt"
else
    echo "❌ WhiteNoise not found in requirements.txt"
    exit 1
fi

echo ""
echo "📝 Environment Variables Checklist:"
echo "Make sure you have these environment variables ready for Render:"
echo ""
echo "Required Variables:"
echo "- SECRET_KEY"
echo "- DEBUG=False"
echo "- ALLOWED_HOSTS=your-app-name.onrender.com"
echo "- DATABASE_NAME"
echo "- DATABASE_USER"
echo "- DATABASE_PASSWORD"
echo "- DATABASE_HOST"
echo "- DATABASE_PORT=3306"
echo "- SOCIAL_AUTH_GOOGLE_OAUTH2_KEY"
echo "- SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET"
echo "- EMAIL_HOST_USER"
echo "- EMAIL_HOST_PASSWORD"
echo ""

echo "🗄️ Database Setup Reminder:"
echo "1. Set up external MySQL database (PlanetScale, AWS RDS, etc.)"
echo "2. Create database: CREATE DATABASE kalolsavam_db;"
echo "3. Note down connection details for environment variables"
echo ""

echo "🚀 Deployment Steps:"
echo "1. Push your code to GitHub"
echo "2. Go to render.com and create new Web Service"
echo "3. Connect your GitHub repository"
echo "4. Use these settings:"
echo "   - Build Command: cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput"
echo "   - Start Command: cd backend && gunicorn e_kalolsavam.wsgi:application"
echo "5. Add all environment variables"
echo "6. Deploy!"
echo ""

echo "✅ Project is ready for Render deployment!"
echo "📖 See RENDER_DEPLOYMENT_GUIDE.md for detailed instructions"


