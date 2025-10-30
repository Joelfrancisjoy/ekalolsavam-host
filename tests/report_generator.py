"""
Test report generator for E2E testing
"""
import os
import json
import subprocess
import time
from datetime import datetime
from pathlib import Path

class TestReportGenerator:
    """Generate comprehensive test reports"""
    
    def __init__(self, reports_dir="tests/reports"):
        self.reports_dir = Path(reports_dir)
        self.reports_dir.mkdir(exist_ok=True)
        self.screenshots_dir = self.reports_dir / "screenshots"
        self.screenshots_dir.mkdir(exist_ok=True)
        self.allure_results_dir = self.reports_dir / "allure-results"
        self.allure_results_dir.mkdir(exist_ok=True)
        self.allure_report_dir = self.reports_dir / "allure-report"
        self.allure_report_dir.mkdir(exist_ok=True)
    
    def generate_html_report(self, test_results_file="pytest_results.json"):
        """Generate HTML report from pytest results"""
        try:
            # Run pytest with JSON output
            cmd = [
                "python", "-m", "pytest", 
                "tests/", 
                "--html=tests/reports/report.html",
                "--self-contained-html",
                "--json-report",
                f"--json-report-file=tests/reports/{test_results_file}",
                "-v"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ HTML report generated successfully")
                return True
            else:
                print(f"❌ Failed to generate HTML report: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error generating HTML report: {e}")
            return False
    
    def generate_allure_report(self):
        """Generate Allure report"""
        try:
            # Generate Allure report
            cmd = ["allure", "generate", str(self.allure_results_dir), "-o", str(self.allure_report_dir), "--clean"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Allure report generated successfully")
                return True
            else:
                print(f"❌ Failed to generate Allure report: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error generating Allure report: {e}")
            return False
    
    def serve_allure_report(self, port=8080):
        """Serve Allure report on local server"""
        try:
            cmd = ["allure", "serve", str(self.allure_results_dir), "-p", str(port)]
            print(f"🌐 Serving Allure report on http://localhost:{port}")
            subprocess.run(cmd)
        except Exception as e:
            print(f"❌ Error serving Allure report: {e}")
    
    def generate_summary_report(self):
        """Generate summary report"""
        try:
            summary = {
                "timestamp": datetime.now().isoformat(),
                "test_suite": "E-Kalolsavam E2E Tests",
                "reports": {
                    "html_report": str(self.reports_dir / "report.html"),
                    "allure_report": str(self.allure_report_dir),
                    "screenshots": str(self.screenshots_dir)
                },
                "test_categories": [
                    "Authentication Tests",
                    "Events Management Tests", 
                    "Dashboard Tests",
                    "Admin Functionality Tests",
                    "Scoring System Tests"
                ],
                "browsers_supported": ["Chrome", "Firefox"],
                "features_tested": [
                    "User Registration",
                    "User Login/Logout",
                    "Google OAuth Integration",
                    "Event Registration",
                    "Event Management",
                    "Score Submission",
                    "Admin Panel Access",
                    "Responsive Design"
                ]
            }
            
            summary_file = self.reports_dir / "test_summary.json"
            with open(summary_file, 'w') as f:
                json.dump(summary, f, indent=2)
            
            print(f"✅ Summary report generated: {summary_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error generating summary report: {e}")
            return False
    
    def generate_readme_report(self):
        """Generate README for test reports"""
        try:
            readme_content = f"""# E-Kalolsavam E2E Test Reports

## Test Execution Summary
- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **Test Suite**: E-Kalolsavam End-to-End Tests
- **Framework**: Selenium + pytest

## Available Reports

### 1. HTML Report
- **File**: `report.html`
- **Description**: Comprehensive HTML report with test results, screenshots, and detailed logs
- **Open**: Open `report.html` in your browser

### 2. Allure Report
- **Directory**: `allure-report/`
- **Description**: Interactive Allure report with advanced filtering and analytics
- **Open**: Run `allure serve allure-results` or open `allure-report/index.html`

### 3. Screenshots
- **Directory**: `screenshots/`
- **Description**: Screenshots captured during test failures and key steps

## Test Categories

### 🔐 Authentication Tests
- User registration with validation
- User login/logout functionality
- Google OAuth integration
- Session management

### 🎪 Events Management Tests
- Event listing and display
- Event registration process
- Event search and filtering
- Event details viewing

### 📊 Dashboard Tests
- Dashboard loading and navigation
- User information display
- Responsive design testing
- Menu functionality

### 👨‍💼 Admin Functionality Tests
- Admin panel access control
- User management
- Event management
- Score management

### 🏆 Scoring System Tests
- Score submission forms
- Score validation
- Score history display
- Export functionality

## Browser Support
- Chrome (Headless/Headed)
- Firefox (Headless/Headed)

## Environment Configuration
- **Frontend URL**: http://localhost:3000
- **Backend URL**: http://localhost:8000
- **Headless Mode**: Configurable via HEADLESS environment variable
- **Browser**: Configurable via BROWSER environment variable

## Running Tests

### Run All Tests
```bash
python -m pytest tests/ -v
```

### Run Specific Test Categories
```bash
# Authentication tests only
python -m pytest tests/test_authentication.py -v

# Admin tests only
python -m pytest tests/test_admin_functionality.py -v -m admin

# Smoke tests only
python -m pytest tests/ -v -m smoke
```

### Generate Reports
```bash
# Generate HTML report
python -m pytest tests/ --html=reports/report.html --self-contained-html

# Generate Allure report
python -m pytest tests/ --alluredir=reports/allure-results
allure generate reports/allure-results -o reports/allure-report --clean
allure serve reports/allure-results
```

## Test Configuration

### Environment Variables
- `BASE_URL`: Frontend application URL (default: http://localhost:3000)
- `API_BASE_URL`: Backend API URL (default: http://localhost:8000)
- `BROWSER`: Browser to use (chrome/firefox, default: chrome)
- `HEADLESS`: Run in headless mode (true/false, default: false)

### Test Data
- Test users are automatically generated using Faker
- Admin user: admin@test.com / admin123
- Test events and data are created dynamically

## Troubleshooting

### Common Issues
1. **Browser driver issues**: Ensure ChromeDriver/GeckoDriver is available
2. **Connection issues**: Verify frontend and backend are running
3. **Timeout issues**: Increase wait times in test configuration
4. **Screenshot issues**: Ensure reports/screenshots directory exists

### Debug Mode
Run tests with debug output:
```bash
python -m pytest tests/ -v -s --tb=long
```

## Report Structure
```
reports/
├── report.html              # Main HTML report
├── allure-report/           # Allure report directory
├── allure-results/         # Allure results directory
├── screenshots/            # Test failure screenshots
├── test_summary.json      # Test execution summary
└── README.md              # This file
```
"""
            
            readme_file = self.reports_dir / "README.md"
            with open(readme_file, 'w') as f:
                f.write(readme_content)
            
            print(f"✅ README report generated: {readme_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error generating README report: {e}")
            return False
    
    def generate_all_reports(self):
        """Generate all test reports"""
        print("🚀 Generating comprehensive test reports...")
        
        # Generate HTML report
        print("📊 Generating HTML report...")
        self.generate_html_report()
        
        # Generate Allure report
        print("📈 Generating Allure report...")
        self.generate_allure_report()
        
        # Generate summary
        print("📋 Generating summary report...")
        self.generate_summary_report()
        
        # Generate README
        print("📖 Generating README...")
        self.generate_readme_report()
        
        print("✅ All reports generated successfully!")
        print(f"📁 Reports directory: {self.reports_dir}")
        print(f"🌐 HTML Report: {self.reports_dir / 'report.html'}")
        print(f"📊 Allure Report: {self.allure_report_dir}")
        
        return True

if __name__ == "__main__":
    generator = TestReportGenerator()
    generator.generate_all_reports()



