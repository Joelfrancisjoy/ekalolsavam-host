@echo off
REM Playwright E2E Test Runner for Windows
REM Usage: run_playwright_tests.bat [options]

echo 🚀 Starting Playwright E2E Test Suite
echo ====================================

REM Set default values
set TEST_TYPE=all
set BROWSER=chromium
set HEADLESS=false
set PARALLEL=false
set VERBOSE=false
set OPEN_REPORTS=false

REM Parse command line arguments
:parse_args
if "%1"=="" goto run_tests
if "%1"=="--test-type" (
    set TEST_TYPE=%2
    shift
    shift
    goto parse_args
)
if "%1"=="--browser" (
    set BROWSER=%2
    shift
    shift
    goto parse_args
)
if "%1"=="--headless" (
    set HEADLESS=true
    shift
    goto parse_args
)
if "%1"=="--parallel" (
    set PARALLEL=true
    shift
    goto parse_args
)
if "%1"=="--verbose" (
    set VERBOSE=true
    shift
    goto parse_args
)
if "%1"=="-v" (
    set VERBOSE=true
    shift
    goto parse_args
)
if "%1"=="--open-reports" (
    set OPEN_REPORTS=true
    shift
    goto parse_args
)
if "%1"=="--help" (
    echo Usage: run_playwright_tests.bat [options]
    echo.
    echo Options:
    echo   --test-type TYPE    Type of tests to run (smoke, auth, events, dashboard, admin)
    echo   --browser BROWSER   Browser to use (chromium, firefox, webkit)
    echo   --headless          Run tests in headless mode
    echo   --parallel          Run tests in parallel
    echo   --verbose, -v       Verbose output
    echo   --open-reports      Open reports in browser after completion
    echo   --help              Show this help message
    echo.
    goto end
)
shift
goto parse_args

:run_tests
echo 🔧 Setting up test environment...

REM Create reports directory
if not exist "tests\reports" mkdir "tests\reports"
if not exist "tests\reports\screenshots" mkdir "tests\reports\screenshots"
if not exist "tests\reports\videos" mkdir "tests\reports\videos"
if not exist "tests\reports\allure-results" mkdir "tests\reports\allure-results"
if not exist "tests\reports\allure-report" mkdir "tests\reports\allure-report"

REM Set environment variables
set BASE_URL=http://localhost:3000
set API_BASE_URL=http://localhost:8000
set BROWSER=%BROWSER%
set HEADLESS=%HEADLESS%

echo ✅ Environment setup complete

echo 📦 Installing dependencies...

REM Install Python dependencies
if exist "backend\requirements-playwright.txt" (
    pip install -r backend\requirements-playwright.txt
    if errorlevel 1 (
        echo ❌ Error installing Python dependencies
        goto end
    )
)

REM Install Playwright browsers
python -m playwright install
if errorlevel 1 (
    echo ❌ Error installing Playwright browsers
    goto end
)

echo ✅ Dependencies installed

echo 🔍 Checking services...

REM Check if services are running
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend service is not running
    echo Please start the frontend service: cd frontend ^&^& npm start
    goto end
)

curl -s http://localhost:8000 >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend service is not running
    echo Please start the backend service: cd backend ^&^& python manage.py runserver
    goto end
)

echo ✅ Services are running

echo 🧪 Running Playwright tests...
echo    Test Type: %TEST_TYPE%
echo    Browser: %BROWSER%
echo    Headless: %HEADLESS%
echo    Parallel: %PARALLEL%
echo    Verbose: %VERBOSE%

REM Build pytest command
set PYTEST_CMD=python -m pytest tests\playwright\

REM Add markers
if "%TEST_TYPE%"=="smoke" (
    set PYTEST_CMD=%PYTEST_CMD% -m smoke
) else if "%TEST_TYPE%"=="auth" (
    set PYTEST_CMD=%PYTEST_CMD% -m "login or registration"
) else if "%TEST_TYPE%"=="events" (
    set PYTEST_CMD=%PYTEST_CMD% -m events
) else if "%TEST_TYPE%"=="dashboard" (
    set PYTEST_CMD=%PYTEST_CMD% -m dashboard
) else if "%TEST_TYPE%"=="admin" (
    set PYTEST_CMD=%PYTEST_CMD% -m admin
)

REM Add browser option
set PYTEST_CMD=%PYTEST_CMD% --browser %BROWSER%

REM Add headless option
if "%HEADLESS%"=="true" (
    set PYTEST_CMD=%PYTEST_CMD% --headed false
) else (
    set PYTEST_CMD=%PYTEST_CMD% --headed true
)

REM Add parallel option
if "%PARALLEL%"=="true" (
    set PYTEST_CMD=%PYTEST_CMD% -n auto
)

REM Add verbose option
if "%VERBOSE%"=="true" (
    set PYTEST_CMD=%PYTEST_CMD% -v
)

REM Add HTML report
set PYTEST_CMD=%PYTEST_CMD% --html tests\reports\playwright-report.html --self-contained-html

REM Add Allure report
set PYTEST_CMD=%PYTEST_CMD% --alluredir tests\reports\allure-results

REM Add screenshots and videos
set PYTEST_CMD=%PYTEST_CMD% --screenshot only-on-failure --video retain-on-failure

echo 🚀 Executing: %PYTEST_CMD%

REM Run tests
%PYTEST_CMD%
set TEST_RESULT=%errorlevel%

if %TEST_RESULT%==0 (
    echo ✅ Tests completed successfully
) else (
    echo ❌ Tests failed
)

echo 📊 Generating reports...

REM Generate Allure report
allure generate tests\reports\allure-results -o tests\reports\allure-report --clean
if errorlevel 1 (
    echo ❌ Error generating Allure report
    goto end
)

echo ✅ Reports generated successfully

if "%OPEN_REPORTS%"=="true" (
    echo 🌐 Opening reports...
    
    REM Open HTML report
    if exist "tests\reports\playwright-report.html" (
        start tests\reports\playwright-report.html
        echo 📊 HTML report opened
    )
    
    REM Open Allure report
    if exist "tests\reports\allure-report\index.html" (
        start tests\reports\allure-report\index.html
        echo 📈 Allure report opened
    )
)

echo 🧹 Cleaning up old reports...

REM Clean up old reports (keep last 7 days)
forfiles /p tests\reports /s /m *.* /d -7 /c "cmd /c del @path" 2>nul

echo ✅ Cleanup complete

echo.
echo ====================================
if %TEST_RESULT%==0 (
    echo 🎉 Test suite completed successfully!
) else (
    echo ❌ Test suite completed with failures
)
echo 📊 Reports available in: tests\reports\
echo.

:end
exit /b %TEST_RESULT%


