# E-Kalolsavam E2E Testing Guide

## Overview

This guide provides comprehensive instructions for running end-to-end (E2E) tests for the E-Kalolsavam application using Selenium WebDriver and pytest.

## 🚀 Quick Start

### Prerequisites

1. **Python 3.8+** installed
2. **Node.js 16+** installed
3. **Chrome/Firefox** browser installed
4. **Frontend and Backend** services running

### Installation

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements-test.txt
   ```

2. **Start services:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python manage.py runserver
   
   # Terminal 2 - Frontend  
   cd frontend
   npm start
   ```

3. **Run tests:**
   ```bash
   # Windows
   run_tests.bat
   
   # Linux/macOS
   ./run_tests.sh
   
   # Or use Python directly
   python run_tests.py
   ```

## 📋 Test Categories

### 🔐 Authentication Tests (`test_authentication.py`)
- **User Registration**: Form validation, successful registration
- **User Login**: Valid/invalid credentials, session management
- **Google OAuth**: Google login/signup integration
- **Logout**: Session termination
- **Password Validation**: Form validation rules

### 🎪 Events Management Tests (`test_events.py`)
- **Event Listing**: Display events, pagination
- **Event Registration**: Registration process, validation
- **Event Search**: Search functionality, filters
- **Event Details**: View event information
- **Admin Event Management**: Add/edit/delete events

### 📊 Dashboard Tests (`test_dashboard.py`)
- **Dashboard Loading**: Page load, user info display
- **Navigation**: Menu functionality, routing
- **Responsive Design**: Different screen sizes
- **User Profile**: Profile access and management
- **Notifications**: Notification display

### 👨‍💼 Admin Functionality Tests (`test_admin_functionality.py`)
- **Admin Access**: Role-based access control
- **User Management**: User listing, editing, deletion
- **Event Management**: Admin event operations
- **Score Management**: Admin score operations
- **Admin Dashboard**: Admin panel functionality

### 🏆 Scoring System Tests (`test_scoring_system.py`)
- **Score Submission**: Form submission, validation
- **Score History**: Historical score display
- **Score Export**: Export functionality
- **Score Criteria**: Criteria display and validation
- **Admin Score Management**: Admin score operations

## 🛠️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Frontend application URL |
| `API_BASE_URL` | `http://localhost:8000` | Backend API URL |
| `BROWSER` | `chrome` | Browser to use (chrome/firefox) |
| `HEADLESS` | `false` | Run in headless mode |

### Test Configuration

Create `.env` file in project root:
```env
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:8000
BROWSER=chrome
HEADLESS=false
```

## 🎯 Running Tests

### Basic Commands

```bash
# Run all tests
python run_tests.py

# Run specific test categories
python run_tests.py --test-type smoke
python run_tests.py --test-type auth
python run_tests.py --test-type events
python run_tests.py --test-type admin

# Run with different browsers
python run_tests.py --browser firefox
python run_tests.py --browser chrome

# Run in headless mode
python run_tests.py --headless

# Run in parallel
python run_tests.py --parallel
```

### Advanced Options

```bash
# Run specific test files
python -m pytest tests/test_authentication.py -v

# Run with markers
python -m pytest tests/ -m smoke -v
python -m pytest tests/ -m admin -v

# Run with coverage
python -m pytest tests/ --cov=backend --cov-report=html

# Run with specific browser options
BROWSER=firefox HEADLESS=true python run_tests.py
```

## 📊 Test Reports

### HTML Report
- **Location**: `tests/reports/report.html`
- **Features**: Test results, screenshots, detailed logs
- **Open**: Open in browser for interactive viewing

### Allure Report
- **Location**: `tests/reports/allure-report/`
- **Features**: Advanced filtering, analytics, trends
- **Serve**: `allure serve tests/reports/allure-results`

### Screenshots
- **Location**: `tests/reports/screenshots/`
- **Content**: Failure screenshots, step-by-step captures

## 🔧 Troubleshooting

### Common Issues

#### 1. Browser Driver Issues
```bash
# Install/update ChromeDriver
pip install --upgrade webdriver-manager

# Install/update GeckoDriver
pip install --upgrade webdriver-manager
```

#### 2. Service Connection Issues
```bash
# Check if services are running
curl http://localhost:3000  # Frontend
curl http://localhost:8000/api/  # Backend

# Start services if not running
cd backend && python manage.py runserver
cd frontend && npm start
```

#### 3. Permission Issues (Linux/macOS)
```bash
# Make scripts executable
chmod +x run_tests.sh
chmod +x tests/report_generator.py
```

#### 4. Virtual Environment Issues
```bash
# Create virtual environment
cd backend
python -m venv kalenv
source kalenv/bin/activate  # Linux/macOS
kalenv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt
```

### Debug Mode

```bash
# Run with debug output
python -m pytest tests/ -v -s --tb=long

# Run single test with debug
python -m pytest tests/test_authentication.py::TestAuthentication::test_user_login_success -v -s
```

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements-test.txt
      - name: Start services
        run: |
          cd backend && python manage.py runserver &
          cd frontend && npm start &
          sleep 30
      - name: Run E2E tests
        run: |
          python run_tests.py --headless --browser chrome
      - name: Upload reports
        uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: tests/reports/
```

## 🎨 Customization

### Adding New Tests

1. **Create test file** in `tests/` directory
2. **Follow naming convention**: `test_*.py`
3. **Use page objects** from `tests/utils/page_objects.py`
4. **Add markers** for test categorization
5. **Include proper fixtures** and setup

### Custom Page Objects

```python
class CustomPage(BasePage):
    """Custom page object"""
    
    # Locators
    CUSTOM_ELEMENT = (By.ID, "custom-element")
    
    def custom_action(self):
        """Custom action method"""
        self.click_element(self.CUSTOM_ELEMENT)
        return self
```

### Custom Test Data

```python
@pytest.fixture
def custom_test_data():
    """Custom test data fixture"""
    return {
        'custom_field': 'custom_value',
        'another_field': 'another_value'
    }
```

## 📚 Best Practices

### Test Design
- **Use Page Object Model** for maintainable tests
- **Keep tests independent** and isolated
- **Use descriptive test names** and documentation
- **Handle flaky elements** with proper waits
- **Clean up after tests** (logout, clear data)

### Performance
- **Use headless mode** for CI/CD
- **Run tests in parallel** when possible
- **Optimize wait times** and timeouts
- **Use appropriate browser options**

### Maintenance
- **Update selectors** when UI changes
- **Review and refactor** tests regularly
- **Keep dependencies updated**
- **Monitor test execution time**

## 🆘 Support

### Getting Help
1. **Check logs** in test output
2. **Review screenshots** in reports
3. **Verify service status** and configuration
4. **Check browser compatibility**

### Reporting Issues
1. **Include test logs** and screenshots
2. **Specify browser and OS** versions
3. **Provide reproduction steps**
4. **Include environment details**

## 📝 Changelog

### Version 1.0.0
- Initial E2E testing framework setup
- Comprehensive test coverage for all major features
- HTML and Allure reporting
- Cross-browser support
- CI/CD integration ready

---

**Happy Testing! 🎉**



