#!/usr/bin/env python3
"""
Open Test Reports in Browser
"""
import os
import webbrowser
from pathlib import Path

def open_reports():
    """Open generated test reports in browser"""
    project_root = Path(__file__).parent
    reports_dir = project_root / "tests" / "reports"
    
    # HTML Report
    html_report = reports_dir / "playwright-report.html"
    if html_report.exists():
        webbrowser.open(f"file://{html_report.absolute()}")
        print(f"Opened HTML report: {html_report}")
    else:
        print("HTML report not found")
    
    # Allure Report
    allure_report = reports_dir / "allure-report" / "index.html"
    if allure_report.exists():
        webbrowser.open(f"file://{allure_report.absolute()}")
        print(f"Opened Allure report: {allure_report}")
    else:
        print("Allure report not found")
    
    print("\nReports opened in your default browser!")

if __name__ == "__main__":
    open_reports()


