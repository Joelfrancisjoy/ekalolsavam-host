@echo off
REM Render Deployment Script for Kalolsavam Backend (Windows)
REM This script helps prepare and deploy the Django backend to Render

echo 🚀 Kalolsavam Backend Deployment Script
echo ========================================

REM Check if we're in the right directory
if not exist "backend\manage.py" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

echo ✅ Project structure verified

REM Check if required files exist
echo 📋 Checking required files...

if exist "backend\Procfile" (
    echo ✅ backend\Procfile exists
) else (
    echo ❌ backend\Procfile missing
    pause
    exit /b 1
)

if exist "backend\runtime.txt" (
    echo ✅ backend\runtime.txt exists
) else (
    echo ❌ backend\runtime.txt missing
    pause
    exit /b 1
)

if exist "render.yaml" (
    echo ✅ render.yaml exists in root
) else (
    echo ❌ render.yaml missing from root directory
    pause
    exit /b 1
)

if exist "backend\requirements.txt" (
    echo ✅ backend\requirements.txt exists
) else (
    echo ❌ backend\requirements.txt missing
    pause
    exit /b 1
)

echo.
echo 🔧 Pre-deployment checks...

REM Check if gunicorn is in requirements.txt
findstr /C:"gunicorn" backend\requirements.txt >nul
if %errorlevel% equ 0 (
    echo ✅ Gunicorn found in requirements.txt
) else (
    echo ❌ Gunicorn not found in requirements.txt
    pause
    exit /b 1
)

REM Check if whitenoise is in requirements.txt
findstr /C:"whitenoise" backend\requirements.txt >nul
if %errorlevel% equ 0 (
    echo ✅ WhiteNoise found in requirements.txt
) else (
    echo ❌ WhiteNoise not found in requirements.txt
    pause
    exit /b 1
)

echo.
echo 📝 Environment Variables Checklist:
echo Make sure you have these environment variables ready for Render:
echo.
echo Required Variables:
echo - SECRET_KEY
echo - DEBUG=False
echo - ALLOWED_HOSTS=your-app-name.onrender.com
echo - DATABASE_NAME
echo - DATABASE_USER
echo - DATABASE_PASSWORD
echo - DATABASE_HOST
echo - DATABASE_PORT=3306
echo - SOCIAL_AUTH_GOOGLE_OAUTH2_KEY
echo - SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET
echo - EMAIL_HOST_USER
echo - EMAIL_HOST_PASSWORD
echo.

echo 🗄️ Database Setup Reminder:
echo 1. Set up external MySQL database (PlanetScale, AWS RDS, etc.)
echo 2. Create database: CREATE DATABASE kalolsavam_db;
echo 3. Note down connection details for environment variables
echo.

echo 🚀 Deployment Steps:
echo 1. Make sure render.yaml is in the ROOT directory (not backend/)
echo 2. Push your code to GitHub: git push origin main
echo 3. Go to render.com and create new Web Service
echo 4. Connect your GitHub repository: Joelfrancisjoy/E-Kalolsavam-
echo 5. Render will auto-detect render.yaml configuration
echo 6. Add all environment variables in Render dashboard
echo 7. Click Deploy!
echo.

echo ✅ Project is ready for Render deployment!
echo 📖 See RENDER_DEPLOYMENT_GUIDE.md for detailed instructions
pause


