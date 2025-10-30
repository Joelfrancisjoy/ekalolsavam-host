"""
Allure Configuration for Playwright E2E Tests
"""
import os
import json
from datetime import datetime

class AllureConfig:
    """Allure configuration and utilities"""
    
    def __init__(self):
        self.results_dir = "tests/reports/allure-results"
        self.report_dir = "tests/reports/allure-report"
        self.screenshots_dir = "tests/reports/screenshots"
        self.videos_dir = "tests/reports/videos"
        
    def setup_directories(self):
        """Create necessary directories for Allure reporting"""
        directories = [
            self.results_dir,
            self.report_dir,
            self.screenshots_dir,
            self.videos_dir
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    def create_allure_properties(self):
        """Create allure.properties file"""
        properties = {
            "allure.results.directory": self.results_dir,
            "allure.link.issue.pattern": "https://github.com/your-repo/issues/{}",
            "allure.link.tms.pattern": "https://github.com/your-repo/issues/{}",
            "allure.link.custom.pattern": "https://github.com/your-repo/commit/{}",
            "allure.link.custom.link": "https://github.com/your-repo/commit/{}"
        }
        
        properties_file = os.path.join(self.results_dir, "allure.properties")
        with open(properties_file, "w") as f:
            for key, value in properties.items():
                f.write(f"{key}={value}\n")
    
    def create_environment_properties(self):
        """Create environment.properties file"""
        environment = {
            "Browser": os.getenv("BROWSER", "chromium"),
            "Headless": os.getenv("HEADLESS", "false"),
            "Base URL": os.getenv("BASE_URL", "http://localhost:3000"),
            "API URL": os.getenv("API_BASE_URL", "http://localhost:8000"),
            "Test Environment": os.getenv("TEST_ENV", "local"),
            "Test Date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Python Version": os.getenv("PYTHON_VERSION", "3.9+"),
            "Playwright Version": "1.40.0"
        }
        
        env_file = os.path.join(self.results_dir, "environment.properties")
        with open(env_file, "w") as f:
            for key, value in environment.items():
                f.write(f"{key}={value}\n")
    
    def create_categories_json(self):
        """Create categories.json for Allure report"""
        categories = [
            {
                "name": "Test Failures",
                "matchedStatuses": ["failed"]
            },
            {
                "name": "Test Errors",
                "matchedStatuses": ["broken"]
            },
            {
                "name": "Test Skipped",
                "matchedStatuses": ["skipped"]
            },
            {
                "name": "Test Passed",
                "matchedStatuses": ["passed"]
            }
        ]
        
        categories_file = os.path.join(self.results_dir, "categories.json")
        with open(categories_file, "w") as f:
            json.dump(categories, f, indent=2)
    
    def create_executor_json(self):
        """Create executor.json for Allure report"""
        executor = {
            "name": "Playwright E2E Tests",
            "type": "playwright",
            "url": "https://github.com/your-repo",
            "buildName": f"Build {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "buildUrl": "https://github.com/your-repo/actions",
            "reportUrl": "https://github.com/your-repo/actions",
            "reportName": "E-Kalolsavam E2E Test Report"
        }
        
        executor_file = os.path.join(self.results_dir, "executor.json")
        with open(executor_file, "w") as f:
            json.dump(executor, f, indent=2)
    
    def create_launch_json(self):
        """Create launch.json for Allure report"""
        launch = {
            "name": "E-Kalolsavam E2E Test Launch",
            "description": "End-to-end tests for E-Kalolsavam application",
            "start": int(datetime.now().timestamp() * 1000),
            "stop": int(datetime.now().timestamp() * 1000),
            "tags": ["e2e", "playwright", "kalolsavam"]
        }
        
        launch_file = os.path.join(self.results_dir, "launch.json")
        with open(launch_file, "w") as f:
            json.dump(launch, f, indent=2)
    
    def setup_allure_environment(self):
        """Setup complete Allure environment"""
        self.setup_directories()
        self.create_allure_properties()
        self.create_environment_properties()
        self.create_categories_json()
        self.create_executor_json()
        self.create_launch_json()
    
    def generate_report(self):
        """Generate Allure report"""
        import subprocess
        
        # Generate report
        cmd = ["allure", "generate", self.results_dir, "-o", self.report_dir, "--clean"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"Allure report generated successfully at: {self.report_dir}")
            return True
        else:
            print(f"Error generating Allure report: {result.stderr}")
            return False
    
    def serve_report(self, port=8080):
        """Serve Allure report"""
        import subprocess
        
        cmd = ["allure", "serve", self.results_dir, "--port", str(port)]
        subprocess.run(cmd)
    
    def open_report(self):
        """Open Allure report in browser"""
        import webbrowser
        import os
        
        report_file = os.path.join(self.report_dir, "index.html")
        if os.path.exists(report_file):
            webbrowser.open(f"file://{os.path.abspath(report_file)}")
        else:
            print("Report not found. Please generate the report first.")

# Global instance
allure_config = AllureConfig()


