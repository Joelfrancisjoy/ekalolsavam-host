#!/bin/bash

# Playwright E2E Test Runner Script
# This script sets up the environment and runs Playwright tests

set -e

echo "🚀 Starting Playwright E2E Test Suite"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ to continue."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8+ to continue."
    exit 1
fi

print_success "Python version: $(python3 --version)"

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Install Playwright browsers
print_status "Installing Playwright browsers..."
npx playwright install --with-deps

# Set up backend
print_status "Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Set up database
print_status "Setting up database..."
python manage.py migrate

# Start backend server in background
print_status "Starting backend server..."
python manage.py runserver &
BACKEND_PID=$!

# Go back to root directory
cd ..

# Set up frontend
print_status "Setting up frontend..."
cd frontend

# Install frontend dependencies
npm ci

# Start frontend server in background
print_status "Starting frontend server..."
npm start &
FRONTEND_PID=$!

# Go back to root directory
cd ..

# Wait for servers to be ready
print_status "Waiting for servers to be ready..."
npx wait-on http://localhost:8000/api/health/ http://localhost:3000 --timeout 60000

print_success "Servers are ready!"

# Run tests based on arguments
if [ "$1" = "smoke" ]; then
    print_status "Running smoke tests..."
    npx playwright test tests/playwright/smoke/ --reporter=html,allure-playwright
elif [ "$1" = "auth" ]; then
    print_status "Running authentication tests..."
    npx playwright test tests/playwright/auth/ --reporter=html,allure-playwright
elif [ "$1" = "events" ]; then
    print_status "Running events tests..."
    npx playwright test tests/playwright/events/ --reporter=html,allure-playwright
elif [ "$1" = "admin" ]; then
    print_status "Running admin tests..."
    npx playwright test tests/playwright/admin/ --reporter=html,allure-playwright
elif [ "$1" = "api" ]; then
    print_status "Running API tests..."
    npx playwright test tests/playwright/api/ --reporter=html,allure-playwright
elif [ "$1" = "ui" ]; then
    print_status "Running UI tests..."
    npx playwright test tests/playwright/ui/ --reporter=html,allure-playwright
elif [ "$1" = "headed" ]; then
    print_status "Running tests in headed mode..."
    npx playwright test --headed --reporter=html,allure-playwright
elif [ "$1" = "debug" ]; then
    print_status "Running tests in debug mode..."
    npx playwright test --debug --reporter=html,allure-playwright
else
    print_status "Running all tests..."
    npx playwright test --reporter=html,allure-playwright
fi

# Capture exit code
TEST_EXIT_CODE=$?

# Generate Allure report
print_status "Generating Allure report..."
npm run allure:generate

# Print results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_success "All tests passed! 🎉"
else
    print_error "Some tests failed. Check the report for details."
fi

# Cleanup
print_status "Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true

# Print report locations
print_status "Test reports generated:"
print_status "- Playwright Report: playwright-report/index.html"
print_status "- Allure Report: allure-report/index.html"

# Open reports if on local machine
if [ "$CI" != "true" ]; then
    if command -v open &> /dev/null; then
        print_status "Opening Playwright report..."
        open playwright-report/index.html
    elif command -v xdg-open &> /dev/null; then
        print_status "Opening Playwright report..."
        xdg-open playwright-report/index.html
    fi
fi

exit $TEST_EXIT_CODE


