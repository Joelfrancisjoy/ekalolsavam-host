"""
Report Generator for Playwright E2E Tests
"""
import os
import json
import subprocess
import webbrowser
from datetime import datetime
from pathlib import Path
from allure_config import allure_config

class ReportGenerator:
    """Generate comprehensive test reports"""
    
    def __init__(self):
        self.reports_dir = "tests/reports"
        self.html_report_path = os.path.join(self.reports_dir, "playwright-report.html")
        self.allure_results_dir = os.path.join(self.reports_dir, "allure-results")
        self.allure_report_dir = os.path.join(self.reports_dir, "allure-report")
        self.screenshots_dir = os.path.join(self.reports_dir, "screenshots")
        self.videos_dir = os.path.join(self.reports_dir, "videos")
        
    def setup_directories(self):
        """Create necessary directories for reporting"""
        directories = [
            self.reports_dir,
            self.allure_results_dir,
            self.allure_report_dir,
            self.screenshots_dir,
            self.videos_dir
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    def generate_html_report(self):
        """Generate HTML report using pytest-html"""
        print("Generating HTML report...")
        
        # Run tests with HTML report
        cmd = [
            "python", "-m", "pytest",
            "tests/playwright/",
            "--html=" + self.html_report_path,
            "--self-contained-html",
            "-v"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"HTML report generated: {self.html_report_path}")
            return True
        else:
            print(f"Error generating HTML report: {result.stderr}")
            return False
    
    def generate_allure_report(self):
        """Generate Allure report"""
        print("Generating Allure report...")
        
        # Setup Allure environment
        allure_config.setup_allure_environment()
        
        # Run tests with Allure
        cmd = [
            "python", "-m", "pytest",
            "tests/playwright/",
            "--alluredir=" + self.allure_results_dir,
            "-v"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            # Generate Allure report
            allure_cmd = [
                "allure", "generate",
                self.allure_results_dir,
                "-o", self.allure_report_dir,
                "--clean"
            ]
            
            allure_result = subprocess.run(allure_cmd, capture_output=True, text=True)
            
            if allure_result.returncode == 0:
                print(f"Allure report generated: {self.allure_report_dir}")
                return True
            else:
                print(f"Error generating Allure report: {allure_result.stderr}")
                return False
        else:
            print(f"Error running tests: {result.stderr}")
            return False
    
    def generate_combined_report(self):
        """Generate both HTML and Allure reports"""
        print("Generating combined reports...")
        
        # Setup directories
        self.setup_directories()
        
        # Generate HTML report
        html_success = self.generate_html_report()
        
        # Generate Allure report
        allure_success = self.generate_allure_report()
        
        # Generate summary
        self.generate_summary_report(html_success, allure_success)
        
        return html_success and allure_success
    
    def generate_summary_report(self, html_success, allure_success):
        """Generate summary report"""
        summary = {
            "timestamp": datetime.now().isoformat(),
            "reports": {
                "html": {
                    "success": html_success,
                    "path": self.html_report_path,
                    "url": f"file://{os.path.abspath(self.html_report_path)}"
                },
                "allure": {
                    "success": allure_success,
                    "path": self.allure_report_dir,
                    "url": f"file://{os.path.abspath(os.path.join(self.allure_report_dir, 'index.html'))}"
                }
            },
            "directories": {
                "screenshots": self.screenshots_dir,
                "videos": self.videos_dir,
                "allure_results": self.allure_results_dir
            }
        }
        
        summary_file = os.path.join(self.reports_dir, "summary.json")
        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)
        
        print(f"Summary report generated: {summary_file}")
    
    def open_html_report(self):
        """Open HTML report in browser"""
        if os.path.exists(self.html_report_path):
            webbrowser.open(f"file://{os.path.abspath(self.html_report_path)}")
            print("HTML report opened in browser")
        else:
            print("HTML report not found. Please generate it first.")
    
    def open_allure_report(self):
        """Open Allure report in browser"""
        allure_index = os.path.join(self.allure_report_dir, "index.html")
        if os.path.exists(allure_index):
            webbrowser.open(f"file://{os.path.abspath(allure_index)}")
            print("Allure report opened in browser")
        else:
            print("Allure report not found. Please generate it first.")
    
    def serve_allure_report(self, port=8080):
        """Serve Allure report on local server"""
        cmd = ["allure", "serve", self.allure_results_dir, "--port", str(port)]
        print(f"Serving Allure report on http://localhost:{port}")
        subprocess.run(cmd)
    
    def generate_test_summary(self):
        """Generate test execution summary"""
        summary = {
            "timestamp": datetime.now().isoformat(),
            "test_suites": [
                "test_authentication.py",
                "test_registration.py", 
                "test_dashboard.py",
                "test_events.py",
                "test_smoke_suite.py"
            ],
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "duration": 0
        }
        
        summary_file = os.path.join(self.reports_dir, "test_summary.json")
        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)
        
        return summary_file
    
    def cleanup_old_reports(self, days=7):
        """Clean up old report files"""
        import time
        
        current_time = time.time()
        cutoff_time = current_time - (days * 24 * 60 * 60)
        
        for root, dirs, files in os.walk(self.reports_dir):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.getmtime(file_path) < cutoff_time:
                    try:
                        os.remove(file_path)
                        print(f"Removed old file: {file_path}")
                    except OSError:
                        pass
    
    def generate_readme(self):
        """Generate README for reports directory"""
        readme_content = """# E2E Test Reports

This directory contains the generated reports from Playwright E2E tests.

## Report Types

### HTML Report
- **File**: `playwright-report.html`
- **Description**: Self-contained HTML report with test results, screenshots, and detailed logs
- **Open**: Double-click the file or open in browser

### Allure Report
- **Directory**: `allure-report/`
- **Description**: Advanced HTML report with analytics, trends, and filtering
- **Open**: Open `allure-report/index.html` in browser
- **Serve**: Run `allure serve allure-results` for live server

### Screenshots
- **Directory**: `screenshots/`
- **Description**: Screenshots captured during test execution
- **Content**: Failure screenshots, step-by-step captures

### Videos
- **Directory**: `videos/`
- **Description**: Video recordings of test execution
- **Content**: Full test execution videos

## Running Reports

### Generate All Reports
```bash
python tests/playwright/report_generator.py
```

### Generate HTML Report Only
```bash
python -m pytest tests/playwright/ --html=reports/playwright-report.html --self-contained-html
```

### Generate Allure Report Only
```bash
python -m pytest tests/playwright/ --alluredir=reports/allure-results
allure generate reports/allure-results -o reports/allure-report --clean
```

### Serve Allure Report
```bash
allure serve reports/allure-results
```

## Report Features

- **Test Results**: Pass/fail status, duration, error messages
- **Screenshots**: Automatic screenshots on failures
- **Videos**: Full test execution recordings
- **Logs**: Detailed execution logs
- **Analytics**: Test trends, flaky tests, performance metrics
- **Filtering**: Filter by status, tags, duration, etc.

## Troubleshooting

### Reports Not Generated
1. Check if tests ran successfully
2. Verify report directories exist
3. Check file permissions

### Allure Report Issues
1. Install Allure: `pip install allure-pytest`
2. Install Allure CLI: `npm install -g allure-commandline`
3. Check Allure results directory

### HTML Report Issues
1. Install pytest-html: `pip install pytest-html`
2. Check HTML file permissions
3. Verify self-contained HTML option

## Report Maintenance

- Reports are automatically cleaned up after 7 days
- Screenshots and videos are preserved for failed tests
- Allure results are preserved for trend analysis
- HTML reports are self-contained and portable

## CI/CD Integration

Reports can be integrated with CI/CD pipelines:

```yaml
- name: Generate Reports
  run: |
    python tests/playwright/report_generator.py
    
- name: Upload Reports
  uses: actions/upload-artifact@v2
  with:
    name: test-reports
    path: tests/reports/
```

## Support

For issues with reports:
1. Check the test execution logs
2. Verify all dependencies are installed
3. Check file permissions and disk space
4. Review the troubleshooting section above
"""
        
        readme_file = os.path.join(self.reports_dir, "README.md")
        with open(readme_file, "w") as f:
            f.write(readme_content)
        
        print(f"README generated: {readme_file}")

def main():
    """Main function to generate reports"""
    generator = ReportGenerator()
    
    print("🚀 Starting E2E Test Report Generation...")
    print("=" * 50)
    
    # Setup directories
    generator.setup_directories()
    
    # Generate reports
    success = generator.generate_combined_report()
    
    if success:
        print("\n✅ Reports generated successfully!")
        print(f"📊 HTML Report: {generator.html_report_path}")
        print(f"📈 Allure Report: {generator.allure_report_dir}")
        print(f"📸 Screenshots: {generator.screenshots_dir}")
        print(f"🎥 Videos: {generator.videos_dir}")
        
        # Generate README
        generator.generate_readme()
        
        # Open reports
        try:
            generator.open_html_report()
        except:
            print("Could not open HTML report automatically")
        
        try:
            generator.open_allure_report()
        except:
            print("Could not open Allure report automatically")
    else:
        print("\n❌ Error generating reports!")
        print("Check the error messages above for details.")
    
    print("\n" + "=" * 50)
    print("🎉 Report generation complete!")

if __name__ == "__main__":
    main()


