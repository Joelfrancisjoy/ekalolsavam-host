@echo off
REM E2E Test Runner for Windows
REM E-Kalolsavam Application

echo 🎭 E-Kalolsavam E2E Test Runner
echo ================================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python and add it to your PATH
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "backend\kalenv\Scripts\activate.bat" (
    echo ❌ Virtual environment not found
    echo Please create virtual environment first:
    echo cd backend
    echo python -m venv kalenv
    echo kalenv\Scripts\activate
    echo pip install -r requirements.txt
    echo pip install -r requirements-test.txt
    pause
    exit /b 1
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call backend\kalenv\Scripts\activate.bat

REM Check dependencies
echo 🔍 Checking dependencies...
python -c "import selenium, pytest, allure" 2>nul
if errorlevel 1 (
    echo ❌ Missing dependencies. Installing...
    pip install -r backend\requirements-test.txt
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Set environment variables
set BASE_URL=http://localhost:3000
set API_BASE_URL=http://localhost:8000
set BROWSER=chrome
set HEADLESS=false

REM Check if services are running
echo 🔍 Checking services...
python -c "import requests; requests.get('http://localhost:3000', timeout=5)" 2>nul
if errorlevel 1 (
    echo ❌ Frontend is not running at http://localhost:3000
    echo Please start frontend: cd frontend ^&^& npm start
    pause
    exit /b 1
)

python -c "import requests; requests.get('http://localhost:8000/api/', timeout=5)" 2>nul
if errorlevel 1 (
    echo ❌ Backend is not running at http://localhost:8000
    echo Please start backend: cd backend ^&^& python manage.py runserver
    pause
    exit /b 1
)

echo ✅ Services are running

REM Create reports directory
if not exist "tests\reports" mkdir tests\reports
if not exist "tests\reports\screenshots" mkdir tests\reports\screenshots

REM Run tests
echo 🚀 Running E2E tests...
python run_tests.py --test-type all --browser chrome

REM Generate reports
echo 📊 Generating reports...
python -c "from tests.report_generator import TestReportGenerator; TestReportGenerator().generate_all_reports()"

echo.
echo 🎉 Test execution completed!
echo 📊 Check reports in tests\reports\ directory
echo 🌐 Open tests\reports\report.html in your browser
echo.
pause



