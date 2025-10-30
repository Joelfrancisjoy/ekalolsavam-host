#!/bin/bash
# E2E Test Runner for Linux/macOS
# E-Kalolsavam Application

echo "🎭 E-Kalolsavam E2E Test Runner"
echo "================================================"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed or not in PATH"
    echo "Please install Python3 and add it to your PATH"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "backend/kalenv" ]; then
    echo "❌ Virtual environment not found"
    echo "Please create virtual environment first:"
    echo "cd backend"
    echo "python3 -m venv kalenv"
    echo "source kalenv/bin/activate"
    echo "pip install -r requirements.txt"
    echo "pip install -r requirements-test.txt"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source backend/kalenv/bin/activate

# Check dependencies
echo "🔍 Checking dependencies..."
python3 -c "import selenium, pytest, allure" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Missing dependencies. Installing..."
    pip install -r backend/requirements-test.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Set environment variables
export BASE_URL=http://localhost:3000
export API_BASE_URL=http://localhost:8000
export BROWSER=chrome
export HEADLESS=false

# Check if services are running
echo "🔍 Checking services..."
python3 -c "import requests; requests.get('http://localhost:3000', timeout=5)" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Frontend is not running at http://localhost:3000"
    echo "Please start frontend: cd frontend && npm start"
    exit 1
fi

python3 -c "import requests; requests.get('http://localhost:8000/api/', timeout=5)" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Backend is not running at http://localhost:8000"
    echo "Please start backend: cd backend && python manage.py runserver"
    exit 1
fi

echo "✅ Services are running"

# Create reports directory
mkdir -p tests/reports/screenshots

# Run tests
echo "🚀 Running E2E tests..."
python3 run_tests.py --test-type all --browser chrome

# Generate reports
echo "📊 Generating reports..."
python3 -c "from tests.report_generator import TestReportGenerator; TestReportGenerator().generate_all_reports()"

echo ""
echo "🎉 Test execution completed!"
echo "📊 Check reports in tests/reports/ directory"
echo "🌐 Open tests/reports/report.html in your browser"
echo ""



