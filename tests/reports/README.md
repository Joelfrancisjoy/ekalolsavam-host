# E2E Test Reports

This directory contains the generated reports from Playwright E2E tests for the E-Kalolsavam application.

## 📊 Available Reports

### HTML Report
- **File**: `playwright-report.html`
- **Description**: Self-contained HTML report with test results, screenshots, and detailed logs
- **Features**: 
  - Test execution summary
  - Pass/fail status for each test
  - Execution time and duration
  - Screenshots on failures
  - Detailed error messages
- **Open**: Double-click the file or open in browser

### Allure Report
- **Directory**: `allure-report/`
- **File**: `allure-report/index.html`
- **Description**: Advanced HTML report with analytics, trends, and filtering
- **Features**:
  - Test analytics and trends
  - Pass rate statistics
  - Test categorization
  - Advanced filtering options
  - Performance metrics
- **Open**: Open `allure-report/index.html` in browser

### Screenshots
- **Directory**: `screenshots/`
- **Description**: Screenshots captured during test execution
- **Content**: 
  - Failure screenshots
  - Step-by-step captures
  - Visual regression testing images

### Videos
- **Directory**: `videos/`
- **Description**: Video recordings of test execution
- **Content**: 
  - Full test execution videos
  - Failure recordings
  - Performance analysis videos

### Allure Results
- **Directory**: `allure-results/`
- **Description**: Raw Allure test results data
- **Content**: JSON files containing detailed test execution data

## 🚀 How to Generate Reports

### Option 1: Quick Report Generation
```bash
python generate_test_reports.py
```

### Option 2: Run Full Test Suite
```bash
# Run all tests with reports
python run_playwright_tests.py

# Run specific test types
python run_playwright_tests.py --test-type smoke
python run_playwright_tests.py --test-type auth

# Run with different browsers
python run_playwright_tests.py --browser firefox
python run_playwright_tests.py --browser webkit

# Run in headless mode
python run_playwright_tests.py --headless

# Open reports after completion
python run_playwright_tests.py --open-reports
```

### Option 3: Direct Pytest
```bash
# Run tests with HTML report
python -m pytest tests/playwright/ --html=reports/playwright-report.html --self-contained-html

# Run tests with Allure report
python -m pytest tests/playwright/ --alluredir=reports/allure-results
allure generate reports/allure-results -o reports/allure-report --clean
```

## 🌐 Opening Reports

### Automatic Opening
```bash
# Open reports in browser
python open_reports.py
```

### Manual Opening
1. **HTML Report**: Open `playwright-report.html` in your browser
2. **Allure Report**: Open `allure-report/index.html` in your browser

## 📈 Report Features

### HTML Report Features
- ✅ Test execution summary
- 📊 Pass/fail statistics
- ⏱️ Execution timing
- 📸 Screenshots on failures
- 📝 Detailed error logs
- 🔍 Test filtering
- 📱 Responsive design

### Allure Report Features
- 📈 Test analytics and trends
- 📊 Pass rate statistics
- 🏷️ Test categorization
- 🔍 Advanced filtering
- ⏱️ Performance metrics
- 📈 Historical trends
- 🎯 Test insights

## 🛠️ Report Maintenance

### Automatic Cleanup
- Reports are automatically cleaned up after 7 days
- Screenshots and videos are preserved for failed tests
- Allure results are preserved for trend analysis

### Manual Cleanup
```bash
# Clean old reports (Windows)
forfiles /p tests\reports /s /m *.* /d -7 /c "cmd /c del @path"

# Clean old reports (Linux/macOS)
find tests/reports -type f -mtime +7 -delete
```

## 🔧 Troubleshooting

### Reports Not Generated
1. Check if tests ran successfully
2. Verify report directories exist
3. Check file permissions
4. Ensure dependencies are installed

### HTML Report Issues
1. Install pytest-html: `pip install pytest-html`
2. Check HTML file permissions
3. Verify self-contained HTML option

### Allure Report Issues
1. Install Allure: `pip install allure-pytest`
2. Install Allure CLI: `npm install -g allure-commandline`
3. Check Allure results directory

### Screenshots Not Captured
1. Check screenshot directory permissions
2. Verify test failures occurred
3. Check browser configuration

## 📊 Report Structure

```
tests/reports/
├── playwright-report.html          # Main HTML report
├── allure-report/                  # Allure report directory
│   └── index.html                  # Allure report entry point
├── allure-results/                # Raw Allure data
├── screenshots/                    # Test screenshots
│   ├── failure_screenshots/        # Failure captures
│   └── step_screenshots/           # Step-by-step images
└── videos/                        # Test execution videos
    ├── full_execution/             # Complete test videos
    └── failure_recordings/         # Failure videos
```

## 🎯 Best Practices

### Report Analysis
- Review HTML report for immediate test results
- Use Allure report for detailed analytics
- Check screenshots for visual issues
- Analyze videos for performance problems

### Report Sharing
- HTML reports are self-contained and portable
- Allure reports require the full directory structure
- Screenshots and videos can be shared separately
- Use CI/CD integration for automated report generation

### Report Storage
- Store reports in version control (HTML reports)
- Archive Allure results for historical analysis
- Keep screenshots and videos for failed tests
- Clean up old reports regularly

## 🆘 Support

### Getting Help
1. Check the test execution logs
2. Review screenshots for visual issues
3. Analyze videos for performance problems
4. Check the troubleshooting section above

### Reporting Issues
1. Include test logs and screenshots
2. Specify browser and OS versions
3. Provide reproduction steps
4. Include environment details

---

**Happy Testing! 🎉**

*Generated by E-Kalolsavam E2E Testing Framework*


