#!/usr/bin/env python3
"""
Playwright E2E Test Runner
"""
import os
import sys
import argparse
import subprocess
import time
from datetime import datetime
from pathlib import Path

class PlaywrightTestRunner:
    """Playwright E2E Test Runner"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        self.tests_dir = self.project_root / "tests" / "playwright"
        self.reports_dir = self.project_root / "tests" / "reports"
        
    def setup_environment(self):
        """Setup test environment"""
        print("🔧 Setting up test environment...")
        
        # Create reports directory
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Set environment variables
        os.environ.setdefault("BASE_URL", "http://localhost:3000")
        os.environ.setdefault("API_BASE_URL", "http://localhost:8000")
        os.environ.setdefault("BROWSER", "chromium")
        os.environ.setdefault("HEADLESS", "false")
        
        print("✅ Environment setup complete")
    
    def install_dependencies(self):
        """Install required dependencies"""
        print("📦 Installing dependencies...")
        
        # Install Python dependencies
        requirements_file = self.backend_dir / "requirements-playwright.txt"
        if requirements_file.exists():
            cmd = [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"❌ Error installing Python dependencies: {result.stderr}")
                return False
        
        # Install Playwright browsers
        cmd = [sys.executable, "-m", "playwright", "install"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Error installing Playwright browsers: {result.stderr}")
            return False
        
        print("✅ Dependencies installed")
        return True
    
    def check_services(self):
        """Check if required services are running"""
        print("🔍 Checking services...")
        
        import requests
        
        # Check frontend
        try:
            response = requests.get(os.getenv("BASE_URL", "http://localhost:3000"), timeout=5)
            if response.status_code == 200:
                print("✅ Frontend service is running")
            else:
                print("❌ Frontend service is not responding correctly")
                return False
        except:
            print("❌ Frontend service is not running")
            return False
        
        # Check backend
        try:
            response = requests.get(os.getenv("API_BASE_URL", "http://localhost:8000"), timeout=5)
            if response.status_code == 200:
                print("✅ Backend service is running")
            else:
                print("❌ Backend service is not responding correctly")
                return False
        except:
            print("❌ Backend service is not running")
            return False
        
        return True
    
    def run_tests(self, test_type=None, browser=None, headless=False, parallel=False, verbose=False):
        """Run Playwright tests"""
        print(f"🧪 Running Playwright tests...")
        print(f"   Test Type: {test_type or 'all'}")
        print(f"   Browser: {browser or 'chromium'}")
        print(f"   Headless: {headless}")
        print(f"   Parallel: {parallel}")
        print(f"   Verbose: {verbose}")
        
        # Build pytest command
        cmd = [sys.executable, "-m", "pytest"]
        
        # Add test directory
        cmd.append(str(self.tests_dir))
        
        # Add markers
        if test_type:
            if test_type == "smoke":
                cmd.extend(["-m", "smoke"])
            elif test_type == "auth":
                cmd.extend(["-m", "login or registration"])
            elif test_type == "events":
                cmd.extend(["-m", "events"])
            elif test_type == "dashboard":
                cmd.extend(["-m", "dashboard"])
            elif test_type == "admin":
                cmd.extend(["-m", "admin"])
        
        # Add browser option
        if browser:
            cmd.extend(["--browser", browser])
        
        # Add headless option
        if headless:
            cmd.extend(["--headed", "false"])
        else:
            cmd.extend(["--headed", "true"])
        
        # Add parallel option
        if parallel:
            cmd.extend(["-n", "auto"])
        
        # Add verbose option
        if verbose:
            cmd.append("-v")
        
        # Add HTML report
        cmd.extend([
            "--html", str(self.reports_dir / "playwright-report.html"),
            "--self-contained-html"
        ])
        
        # Add Allure report
        cmd.extend([
            "--alluredir", str(self.reports_dir / "allure-results")
        ])
        
        # Add screenshots
        cmd.extend([
            "--screenshot", "only-on-failure",
            "--video", "retain-on-failure"
        ])
        
        # Run tests
        print(f"🚀 Executing: {' '.join(cmd)}")
        start_time = time.time()
        
        result = subprocess.run(cmd, cwd=str(self.project_root))
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"⏱️  Test execution completed in {duration:.2f} seconds")
        
        return result.returncode == 0
    
    def generate_reports(self):
        """Generate test reports"""
        print("📊 Generating reports...")
        
        # Import report generator
        sys.path.insert(0, str(self.tests_dir))
        from report_generator import ReportGenerator
        
        generator = ReportGenerator()
        success = generator.generate_combined_report()
        
        if success:
            print("✅ Reports generated successfully")
            return True
        else:
            print("❌ Error generating reports")
            return False
    
    def open_reports(self):
        """Open generated reports"""
        print("🌐 Opening reports...")
        
        import webbrowser
        
        # Open HTML report
        html_report = self.reports_dir / "playwright-report.html"
        if html_report.exists():
            webbrowser.open(f"file://{html_report.absolute()}")
            print(f"📊 HTML report opened: {html_report}")
        
        # Open Allure report
        allure_report = self.reports_dir / "allure-report" / "index.html"
        if allure_report.exists():
            webbrowser.open(f"file://{allure_report.absolute()}")
            print(f"📈 Allure report opened: {allure_report}")
    
    def cleanup(self):
        """Clean up test artifacts"""
        print("🧹 Cleaning up...")
        
        # Clean up old reports (keep last 7 days)
        import time
        current_time = time.time()
        cutoff_time = current_time - (7 * 24 * 60 * 60)
        
        for root, dirs, files in os.walk(self.reports_dir):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.getmtime(file_path) < cutoff_time:
                    try:
                        os.remove(file_path)
                        print(f"🗑️  Removed old file: {file_path}")
                    except OSError:
                        pass
        
        print("✅ Cleanup complete")
    
    def run_full_suite(self, test_type=None, browser=None, headless=False, parallel=False, verbose=False, open_reports=False):
        """Run complete test suite"""
        print("🚀 Starting Playwright E2E Test Suite")
        print("=" * 60)
        
        start_time = datetime.now()
        
        try:
            # Setup environment
            self.setup_environment()
            
            # Install dependencies
            if not self.install_dependencies():
                return False
            
            # Check services
            if not self.check_services():
                print("❌ Services are not running. Please start frontend and backend services.")
                return False
            
            # Run tests
            if not self.run_tests(test_type, browser, headless, parallel, verbose):
                print("❌ Tests failed")
                return False
            
            # Generate reports
            if not self.generate_reports():
                print("❌ Report generation failed")
                return False
            
            # Open reports
            if open_reports:
                self.open_reports()
            
            # Cleanup
            self.cleanup()
            
            end_time = datetime.now()
            duration = end_time - start_time
            
            print("\n" + "=" * 60)
            print("🎉 Test suite completed successfully!")
            print(f"⏱️  Total duration: {duration}")
            print(f"📊 Reports available in: {self.reports_dir}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error running test suite: {e}")
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Playwright E2E Test Runner")
    
    parser.add_argument("--test-type", choices=["smoke", "auth", "events", "dashboard", "admin"], 
                       help="Type of tests to run")
    parser.add_argument("--browser", choices=["chromium", "firefox", "webkit"], 
                       help="Browser to use for testing")
    parser.add_argument("--headless", action="store_true", 
                       help="Run tests in headless mode")
    parser.add_argument("--parallel", action="store_true", 
                       help="Run tests in parallel")
    parser.add_argument("--verbose", "-v", action="store_true", 
                       help="Verbose output")
    parser.add_argument("--open-reports", action="store_true", 
                       help="Open reports in browser after completion")
    parser.add_argument("--no-cleanup", action="store_true", 
                       help="Skip cleanup of old reports")
    
    args = parser.parse_args()
    
    runner = PlaywrightTestRunner()
    
    # Run test suite
    success = runner.run_full_suite(
        test_type=args.test_type,
        browser=args.browser,
        headless=args.headless,
        parallel=args.parallel,
        verbose=args.verbose,
        open_reports=args.open_reports
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()


