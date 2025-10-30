#!/usr/bin/env python3
"""
E2E Test Runner for E-Kalolsavam Application
"""
import os
import sys
import subprocess
import argparse
import time
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import selenium
        import pytest
        import allure
        print("✅ All required dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install dependencies: pip install -r backend/requirements-test.txt")
        return False

def check_services():
    """Check if frontend and backend services are running"""
    import requests
    
    frontend_url = os.getenv('BASE_URL', 'http://localhost:3000')
    backend_url = os.getenv('API_BASE_URL', 'http://localhost:8000')
    
    print("🔍 Checking services...")
    
    # Check frontend
    try:
        response = requests.get(frontend_url, timeout=5)
        if response.status_code == 200:
            print(f"✅ Frontend is running at {frontend_url}")
        else:
            print(f"⚠️  Frontend responded with status {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend is not accessible at {frontend_url}: {e}")
        return False
    
    # Check backend
    try:
        response = requests.get(f"{backend_url}/api/", timeout=5)
        if response.status_code in [200, 404]:  # 404 is okay for root API
            print(f"✅ Backend is running at {backend_url}")
        else:
            print(f"⚠️  Backend responded with status {response.status_code}")
    except Exception as e:
        print(f"❌ Backend is not accessible at {backend_url}: {e}")
        return False
    
    return True

def run_tests(test_type="all", browser="chrome", headless=False, parallel=False, generate_reports=True):
    """Run E2E tests"""
    
    # Set environment variables
    os.environ['BROWSER'] = browser
    os.environ['HEADLESS'] = str(headless).lower()
    os.environ['BASE_URL'] = os.getenv('BASE_URL', 'http://localhost:3000')
    os.environ['API_BASE_URL'] = os.getenv('API_BASE_URL', 'http://localhost:8000')
    
    # Build pytest command
    cmd = ["python", "-m", "pytest"]
    
    # Add test path based on type
    if test_type == "all":
        cmd.append("tests/")
    elif test_type == "smoke":
        cmd.extend(["tests/", "-m", "smoke"])
    elif test_type == "auth":
        cmd.append("tests/test_authentication.py")
    elif test_type == "events":
        cmd.append("tests/test_events.py")
    elif test_type == "dashboard":
        cmd.append("tests/test_dashboard.py")
    elif test_type == "admin":
        cmd.extend(["tests/test_admin_functionality.py", "-m", "admin"])
    elif test_type == "scoring":
        cmd.extend(["tests/test_scoring_system.py", "-m", "scoring"])
    else:
        print(f"❌ Unknown test type: {test_type}")
        return False
    
    # Add options
    cmd.extend(["-v", "--tb=short"])
    
    if parallel:
        cmd.extend(["-n", "auto"])
    
    if generate_reports:
        cmd.extend([
            "--html=tests/reports/report.html",
            "--self-contained-html",
            "--alluredir=tests/reports/allure-results"
        ])
    
    print(f"🚀 Running tests: {' '.join(cmd)}")
    print(f"🌐 Browser: {browser}")
    print(f"👻 Headless: {headless}")
    print(f"⚡ Parallel: {parallel}")
    
    # Run tests
    start_time = time.time()
    result = subprocess.run(cmd)
    end_time = time.time()
    
    duration = end_time - start_time
    print(f"⏱️  Test execution time: {duration:.2f} seconds")
    
    if result.returncode == 0:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed!")
    
    return result.returncode == 0

def generate_reports():
    """Generate test reports"""
    print("📊 Generating test reports...")
    
    try:
        from tests.report_generator import TestReportGenerator
        generator = TestReportGenerator()
        generator.generate_all_reports()
        return True
    except Exception as e:
        print(f"❌ Error generating reports: {e}")
        return False

def serve_allure_report(port=8080):
    """Serve Allure report"""
    print(f"🌐 Serving Allure report on http://localhost:{port}")
    
    try:
        from tests.report_generator import TestReportGenerator
        generator = TestReportGenerator()
        generator.serve_allure_report(port)
    except Exception as e:
        print(f"❌ Error serving Allure report: {e}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="E-Kalolsavam E2E Test Runner")
    
    parser.add_argument(
        "--test-type", 
        choices=["all", "smoke", "auth", "events", "dashboard", "admin", "scoring"],
        default="all",
        help="Type of tests to run"
    )
    
    parser.add_argument(
        "--browser",
        choices=["chrome", "firefox"],
        default="chrome",
        help="Browser to use for testing"
    )
    
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run tests in headless mode"
    )
    
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run tests in parallel"
    )
    
    parser.add_argument(
        "--no-reports",
        action="store_true",
        help="Skip report generation"
    )
    
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only check dependencies and services"
    )
    
    parser.add_argument(
        "--generate-reports-only",
        action="store_true",
        help="Only generate reports from existing results"
    )
    
    parser.add_argument(
        "--serve-allure",
        type=int,
        metavar="PORT",
        help="Serve Allure report on specified port"
    )
    
    args = parser.parse_args()
    
    print("🎭 E-Kalolsavam E2E Test Runner")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Check services
    if not check_services():
        print("⚠️  Services are not running. Please start frontend and backend services.")
        print("Frontend: npm start (in frontend directory)")
        print("Backend: python manage.py runserver (in backend directory)")
        sys.exit(1)
    
    if args.check_only:
        print("✅ All checks passed!")
        return
    
    if args.generate_reports_only:
        generate_reports()
        return
    
    if args.serve_allure:
        serve_allure_report(args.serve_allure)
        return
    
    # Run tests
    success = run_tests(
        test_type=args.test_type,
        browser=args.browser,
        headless=args.headless,
        parallel=args.parallel,
        generate_reports=not args.no_reports
    )
    
    if not args.no_reports and success:
        generate_reports()
    
    if success:
        print("\n🎉 Test execution completed successfully!")
        print("📊 Check reports in tests/reports/ directory")
    else:
        print("\n💥 Test execution failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()



