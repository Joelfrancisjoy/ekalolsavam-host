#!/bin/bash
# Playwright E2E Test Runner for Linux/macOS
# Usage: ./run_playwright_tests.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="all"
BROWSER="chromium"
HEADLESS="false"
PARALLEL="false"
VERBOSE="false"
OPEN_REPORTS="false"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to show help
show_help() {
    echo "Usage: ./run_playwright_tests.sh [options]"
    echo ""
    echo "Options:"
    echo "  --test-type TYPE    Type of tests to run (smoke, auth, events, dashboard, admin)"
    echo "  --browser BROWSER   Browser to use (chromium, firefox, webkit)"
    echo "  --headless          Run tests in headless mode"
    echo "  --parallel          Run tests in parallel"
    echo "  --verbose, -v       Verbose output"
    echo "  --open-reports      Open reports in browser after completion"
    echo "  --help              Show this help message"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --test-type)
            TEST_TYPE="$2"
            shift 2
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --headless)
            HEADLESS="true"
            shift
            ;;
        --parallel)
            PARALLEL="true"
            shift
            ;;
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --open-reports)
            OPEN_REPORTS="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "🚀 Starting Playwright E2E Test Suite"
echo "===================================="

# Setup environment
print_info "Setting up test environment..."

# Create reports directory
mkdir -p tests/reports
mkdir -p tests/reports/screenshots
mkdir -p tests/reports/videos
mkdir -p tests/reports/allure-results
mkdir -p tests/reports/allure-report

# Set environment variables
export BASE_URL="http://localhost:3000"
export API_BASE_URL="http://localhost:8000"
export BROWSER="$BROWSER"
export HEADLESS="$HEADLESS"

print_status "Environment setup complete"

# Install dependencies
print_info "Installing dependencies..."

# Install Python dependencies
if [ -f "backend/requirements-playwright.txt" ]; then
    pip install -r backend/requirements-playwright.txt
    if [ $? -ne 0 ]; then
        print_error "Error installing Python dependencies"
        exit 1
    fi
fi

# Install Playwright browsers
python -m playwright install
if [ $? -ne 0 ]; then
    print_error "Error installing Playwright browsers"
    exit 1
fi

print_status "Dependencies installed"

# Check services
print_info "Checking services..."

# Check frontend service
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_error "Frontend service is not running"
    print_warning "Please start the frontend service: cd frontend && npm start"
    exit 1
fi

# Check backend service
if ! curl -s http://localhost:8000 > /dev/null 2>&1; then
    print_error "Backend service is not running"
    print_warning "Please start the backend service: cd backend && python manage.py runserver"
    exit 1
fi

print_status "Services are running"

# Run tests
print_info "Running Playwright tests..."
echo "   Test Type: $TEST_TYPE"
echo "   Browser: $BROWSER"
echo "   Headless: $HEADLESS"
echo "   Parallel: $PARALLEL"
echo "   Verbose: $VERBOSE"

# Build pytest command
PYTEST_CMD="python -m pytest tests/playwright/"

# Add markers
case $TEST_TYPE in
    "smoke")
        PYTEST_CMD="$PYTEST_CMD -m smoke"
        ;;
    "auth")
        PYTEST_CMD="$PYTEST_CMD -m 'login or registration'"
        ;;
    "events")
        PYTEST_CMD="$PYTEST_CMD -m events"
        ;;
    "dashboard")
        PYTEST_CMD="$PYTEST_CMD -m dashboard"
        ;;
    "admin")
        PYTEST_CMD="$PYTEST_CMD -m admin"
        ;;
esac

# Add browser option
PYTEST_CMD="$PYTEST_CMD --browser $BROWSER"

# Add headless option
if [ "$HEADLESS" = "true" ]; then
    PYTEST_CMD="$PYTEST_CMD --headed false"
else
    PYTEST_CMD="$PYTEST_CMD --headed true"
fi

# Add parallel option
if [ "$PARALLEL" = "true" ]; then
    PYTEST_CMD="$PYTEST_CMD -n auto"
fi

# Add verbose option
if [ "$VERBOSE" = "true" ]; then
    PYTEST_CMD="$PYTEST_CMD -v"
fi

# Add HTML report
PYTEST_CMD="$PYTEST_CMD --html tests/reports/playwright-report.html --self-contained-html"

# Add Allure report
PYTEST_CMD="$PYTEST_CMD --alluredir tests/reports/allure-results"

# Add screenshots and videos
PYTEST_CMD="$PYTEST_CMD --screenshot only-on-failure --video retain-on-failure"

echo "🚀 Executing: $PYTEST_CMD"

# Run tests
eval $PYTEST_CMD
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
    print_status "Tests completed successfully"
else
    print_error "Tests failed"
fi

# Generate reports
print_info "Generating reports..."

# Generate Allure report
allure generate tests/reports/allure-results -o tests/reports/allure-report --clean
if [ $? -ne 0 ]; then
    print_error "Error generating Allure report"
    exit 1
fi

print_status "Reports generated successfully"

# Open reports
if [ "$OPEN_REPORTS" = "true" ]; then
    print_info "Opening reports..."
    
    # Open HTML report
    if [ -f "tests/reports/playwright-report.html" ]; then
        if command -v xdg-open > /dev/null; then
            xdg-open tests/reports/playwright-report.html
        elif command -v open > /dev/null; then
            open tests/reports/playwright-report.html
        else
            print_warning "Could not open HTML report automatically"
        fi
        print_status "HTML report opened"
    fi
    
    # Open Allure report
    if [ -f "tests/reports/allure-report/index.html" ]; then
        if command -v xdg-open > /dev/null; then
            xdg-open tests/reports/allure-report/index.html
        elif command -v open > /dev/null; then
            open tests/reports/allure-report/index.html
        else
            print_warning "Could not open Allure report automatically"
        fi
        print_status "Allure report opened"
    fi
fi

# Cleanup
print_info "Cleaning up old reports..."

# Clean up old reports (keep last 7 days)
find tests/reports -type f -mtime +7 -delete 2>/dev/null || true

print_status "Cleanup complete"

echo ""
echo "===================================="
if [ $TEST_RESULT -eq 0 ]; then
    echo "🎉 Test suite completed successfully!"
else
    echo "❌ Test suite completed with failures"
fi
echo "📊 Reports available in: tests/reports/"
echo ""

exit $TEST_RESULT


