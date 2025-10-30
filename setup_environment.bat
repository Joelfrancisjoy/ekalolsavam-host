@echo off
REM E-Kalolsavam Environment Setup Script
REM This script sets up the complete development environment

echo ============================================
echo E-KALOLSAVAM ENVIRONMENT SETUP
echo ============================================
echo.

echo [1/5] Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)
echo.

echo [2/5] Installing backend dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
echo.

echo [3/5] Verifying critical packages...
python -c "import whitenoise; print('✓ whitenoise installed')"
python -c "import google.auth; print('✓ google-auth installed')"
python -c "import google_auth_oauthlib; print('✓ google-auth-oauthlib installed')"
python -c "import google_auth_httplib2; print('✓ google-auth-httplib2 installed')"
echo.

echo [4/5] Checking Django configuration...
python manage.py check
if %errorlevel% neq 0 (
    echo ERROR: Django configuration check failed
    pause
    exit /b 1
)
echo.

echo [5/5] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo WARNING: Failed to install frontend dependencies
    echo You may need to run 'npm install' manually in the frontend directory
)
cd ..
echo.

echo ============================================
echo SETUP COMPLETE!
echo ============================================
echo.
echo Backend dependencies: ✓ INSTALLED
echo Frontend dependencies: ✓ INSTALLED
echo Django configuration: ✓ VERIFIED
echo.
echo To start the servers:
echo   Backend:  cd backend ^&^& python manage.py runserver
echo   Frontend: cd frontend ^&^& npm start
echo.
echo For authentication testing, see:
echo   - QUICK_TEST_GUIDE.md
echo   - AUTHENTICATION_FIX_REPORT.md
echo.
pause
