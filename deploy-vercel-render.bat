@echo off
REM Vercel + Render Deployment Script for Kalolsavam (Windows)
REM Backend: Vercel, Frontend: Render

echo 🚀 Kalolsavam Deployment Script (Vercel + Render)
echo ==================================================

REM Check if we're in the right directory
if not exist "backend\manage.py" (
    echo ❌ Error: backend\manage.py not found
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo ❌ Error: frontend\package.json not found
    pause
    exit /b 1
)

echo ✅ Project structure verified

REM Check backend files for Vercel
echo 📋 Checking backend files for Vercel...

if exist "vercel.json" (
    echo ✅ vercel.json exists
) else (
    echo ❌ vercel.json missing
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

if exist "backend\vercel_wsgi.py" (
    echo ✅ backend\vercel_wsgi.py exists
) else (
    echo ❌ backend\vercel_wsgi.py missing
    pause
    exit /b 1
)

REM Check frontend files for Render
echo 📋 Checking frontend files for Render...

if exist "frontend\render.yaml" (
    echo ✅ frontend\render.yaml exists
) else (
    echo ❌ frontend\render.yaml missing
    pause
    exit /b 1
)

if exist "frontend\package.json" (
    echo ✅ frontend\package.json exists
) else (
    echo ❌ frontend\package.json missing
    pause
    exit /b 1
)

echo.
echo 🔧 Pre-deployment checks...

REM Check if vercel is in requirements.txt
findstr /C:"vercel" backend\requirements.txt >nul
if %errorlevel% equ 0 (
    echo ✅ Vercel found in requirements.txt
) else (
    echo ❌ Vercel not found in requirements.txt
    pause
    exit /b 1
)

echo.
echo 📝 Environment Variables Checklist:
echo.
echo 🔧 BACKEND (Vercel) Environment Variables:
echo - SECRET_KEY
echo - DEBUG=False
echo - ALLOWED_HOSTS=your-app-name.vercel.app
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
echo 🎨 FRONTEND (Render) Environment Variables:
echo - REACT_APP_API_URL=https://your-backend-app.vercel.app
echo - REACT_APP_ENVIRONMENT=production
echo.

echo 🗄️ Database Setup Reminder:
echo 1. Set up external MySQL database (PlanetScale, AWS RDS, etc.)
echo 2. Create database: CREATE DATABASE kalolsavam_db;
echo 3. Note down connection details for environment variables
echo.

echo 🚀 Deployment Steps:
echo.
echo BACKEND (Vercel):
echo 1. Install Vercel CLI: npm i -g vercel
echo 2. Login to Vercel: vercel login
echo 3. Deploy backend: vercel --prod
echo 4. Set environment variables in Vercel dashboard
echo.
echo FRONTEND (Render):
echo 1. Push code to GitHub: git push origin main
echo 2. Go to render.com and create new Static Site
echo 3. Connect GitHub repository
echo 4. Use these settings:
echo    - Build Command: npm install ^&^& npm run build
echo    - Publish Directory: build
echo 5. Set REACT_APP_API_URL to your Vercel backend URL
echo 6. Deploy!
echo.

echo ✅ Project is ready for Vercel + Render deployment!
echo 📖 See VERCEL_RENDER_DEPLOYMENT_GUIDE.md for detailed instructions
pause


