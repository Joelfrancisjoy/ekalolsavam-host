@echo off
setlocal enabledelayedexpansion

REM Playwright E2E Test Runner Script for Windows
REM This script sets up the environment and runs Playwright tests

echo 🚀 Starting Playwright E2E Test Suite

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ to continue.
    exit /b 1
)

echo [SUCCESS] Node.js version: 
node --version

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.8+ to continue.
    exit /b 1
)

echo [SUCCESS] Python version: 
python --version

REM Install dependencies
echo [INFO] Installing dependencies...
call npm ci

REM Install Playwright browsers
echo [INFO] Installing Playwright browsers...
call npx playwright install --with-deps

REM Set up backend
echo [INFO] Setting up backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install Python dependencies
echo [INFO] Installing Python dependencies...
pip install -r requirements.txt

REM Set up database
echo [INFO] Setting up database...
python manage.py migrate

REM Start backend server in background
echo [INFO] Starting backend server...
start /b python manage.py runserver

REM Go back to root directory
cd ..

REM Set up frontend
echo [INFO] Setting up frontend...
cd frontend

REM Install frontend dependencies
call npm ci

REM Start frontend server in background
echo [INFO] Starting frontend server...
start /b npm start

REM Go back to root directory
cd ..

REM Wait for servers to be ready
echo [INFO] Waiting for servers to be ready...
call npx wait-on http://localhost:8000/api/health/ http://localhost:3000 --timeout 60000

echo [SUCCESS] Servers are ready!

REM Run tests based on arguments
if "%1"=="smoke" (
    echo [INFO] Running smoke tests...
    call npx playwright test tests/playwright/smoke/ --reporter=html,allure-playwright
) else if "%1"=="auth" (
    echo [INFO] Running authentication tests...
    call npx playwright test tests/playwright/auth/ --reporter=html,allure-playwright
) else if "%1"=="events" (
    echo [INFO] Running events tests...
    call npx playwright test tests/playwright/events/ --reporter=html,allure-playwright
) else if "%1"=="admin" (
    echo [INFO] Running admin tests...
    call npx playwright test tests/playwright/admin/ --reporter=html,allure-playwright
) else if "%1"=="api" (
    echo [INFO] Running API tests...
    call npx playwright test tests/playwright/api/ --reporter=html,allure-playwright
) else if "%1"=="ui" (
    echo [INFO] Running UI tests...
    call npx playwright test tests/playwright/ui/ --reporter=html,allure-playwright
) else if "%1"=="headed" (
    echo [INFO] Running tests in headed mode...
    call npx playwright test --headed --reporter=html,allure-playwright
) else if "%1"=="debug" (
    echo [INFO] Running tests in debug mode...
    call npx playwright test --debug --reporter=html,allure-playwright
) else (
    echo [INFO] Running all tests...
    call npx playwright test --reporter=html,allure-playwright
)

REM Capture exit code
set TEST_EXIT_CODE=%errorlevel%

REM Generate Allure report
echo [INFO] Generating Allure report...
call npm run allure:generate

REM Print results
if %TEST_EXIT_CODE% equ 0 (
    echo [SUCCESS] All tests passed! 🎉
) else (
    echo [ERROR] Some tests failed. Check the report for details.
)

REM Print report locations
echo [INFO] Test reports generated:
echo [INFO] - Playwright Report: playwright-report\index.html
echo [INFO] - Allure Report: allure-report\index.html

REM Open reports if on local machine
if not defined CI (
    echo [INFO] Opening Playwright report...
    start playwright-report\index.html
)

exit /b %TEST_EXIT_CODE%


