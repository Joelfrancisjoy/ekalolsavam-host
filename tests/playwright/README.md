# Playwright E2E Testing Framework

This directory contains the Playwright-based end-to-end testing framework for the E-Kalolsavam application.

## 🚀 Quick Start

### Prerequisites

1. **Python 3.8+** installed
2. **Node.js 16+** installed (for frontend)
3. **Playwright browsers** installed
4. **Frontend and Backend** services running

### Installation

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements-playwright.txt
   ```

2. **Install Playwright browsers:**
   ```bash
   python -m playwright install
   ```

3. **Start services:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python manage.py runserver
   
   # Terminal 2 - Frontend  
   cd frontend
   npm start
   ```

### Running Tests

#### Option 1: Python Script (Recommended)
```bash
# Run all tests
python run_playwright_tests.py

# Run specific test types
python run_playwright_tests.py --test-type smoke
python run_playwright_tests.py --test-type auth
python run_playwright_tests.py --test-type events

# Run with different browsers
python run_playwright_tests.py --browser firefox
python run_playwright_tests.py --browser webkit

# Run in headless mode
python run_playwright_tests.py --headless

# Run in parallel
python run_playwright_tests.py --parallel

# Open reports after completion
python run_playwright_tests.py --open-reports
```

#### Option 2: Batch Script (Windows)
```cmd
# Run all tests
run_playwright_tests.bat

# Run with options
run_playwright_tests.bat --test-type smoke --browser firefox --headless
```

#### Option 3: Shell Script (Linux/macOS)
```bash
# Make executable (first time only)
chmod +x run_playwright_tests.sh

# Run all tests
./run_playwright_tests.sh

# Run with options
./run_playwright_tests.sh --test-type smoke --browser firefox --headless
```

#### Option 4: Direct Pytest
```bash
# Run all tests
python -m pytest tests/playwright/ -v

# Run specific test files
python -m pytest tests/playwright/test_authentication.py -v

# Run with markers
python -m pytest tests/playwright/ -m smoke -v
python -m pytest tests/playwright/ -m login -v

# Run with HTML report
python -m pytest tests/playwright/ --html=reports/playwright-report.html --self-contained-html

# Run with Allure report
python -m pytest tests/playwright/ --alluredir=reports/allure-results
```

## 📋 Test Structure

### Test Files

- **`test_authentication.py`** - Login/logout functionality
- **`test_registration.py`** - User registration
- **`test_dashboard.py`** - Dashboard functionality
- **`test_events.py`** - Events management
- **`test_smoke_suite.py`** - Critical functionality smoke tests

### Page Objects

- **`pages/base_page.py`** - Base page object with common functionality
- **`pages/login_page.py`** - Login page object
- **`pages/register_page.py`** - Registration page object
- **`pages/dashboard_page.py`** - Dashboard page object
- **`pages/events_page.py`** - Events page object

### Configuration

- **`conftest.py`** - Pytest configuration and fixtures
- **`pytest.ini`** - Pytest settings
- **`allure_config.py`** - Allure reporting configuration

## 🎯 Test Categories

### 🔐 Authentication Tests (`test_authentication.py`)
- **User Login**: Valid/invalid credentials, session management
- **User Logout**: Session termination
- **Google OAuth**: Google login integration
- **Form Validation**: Field validation, error handling
- **Accessibility**: Keyboard navigation, screen readers
- **Responsive Design**: Different viewport sizes

### 📝 Registration Tests (`test_registration.py`)
- **User Registration**: Form submission, validation
- **Password Strength**: Password validation, strength indicators
- **Email Validation**: Email format validation
- **Terms Acceptance**: Required terms and conditions
- **Google Signup**: Google OAuth signup
- **Form Navigation**: Keyboard navigation, tab order

### 🏠 Dashboard Tests (`test_dashboard.py`)
- **Dashboard Loading**: Page load, user info display
- **Navigation**: Menu functionality, routing
- **Events Section**: Events display, search, filter
- **User Profile**: Profile information display
- **Quick Actions**: Dashboard quick actions
- **Responsive Design**: Different screen sizes

### 🎪 Events Tests (`test_events.py`)
- **Events Display**: Event listing, pagination
- **Event Registration**: Registration process
- **Event Search**: Search functionality, filters
- **Event Details**: View event information
- **Admin Functions**: Create, edit, delete events (admin only)
- **Event Management**: Publish/unpublish events

### 🔥 Smoke Tests (`test_smoke_suite.py`)
- **Application Startup**: Basic application loading
- **Critical Paths**: Login, registration, dashboard
- **Navigation**: Basic navigation between pages
- **Performance**: Page load times, responsiveness
- **Error Handling**: Basic error recovery

## 📊 Test Reports

### HTML Report
- **Location**: `tests/reports/playwright-report.html`
- **Features**: Test results, screenshots, detailed logs
- **Open**: Double-click the file or open in browser

### Allure Report
- **Location**: `tests/reports/allure-report/`
- **Features**: Advanced filtering, analytics, trends
- **Serve**: `allure serve tests/reports/allure-results`
- **Open**: Open `tests/reports/allure-report/index.html`

### Screenshots
- **Location**: `tests/reports/screenshots/`
- **Content**: Failure screenshots, step-by-step captures

### Videos
- **Location**: `tests/reports/videos/`
- **Content**: Full test execution videos

## 🛠️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Frontend application URL |
| `API_BASE_URL` | `http://localhost:8000` | Backend API URL |
| `BROWSER` | `chromium` | Browser to use (chromium/firefox/webkit) |
| `HEADLESS` | `false` | Run in headless mode |
| `SLOW_MO` | `0` | Slow down operations (milliseconds) |

### Test Configuration

Create `.env` file in project root:
```env
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:8000
BROWSER=chromium
HEADLESS=false
SLOW_MO=0
```

## 🎨 Customization

### Adding New Tests

1. **Create test file** in `tests/playwright/` directory
2. **Follow naming convention**: `test_*.py`
3. **Use page objects** from `pages/` directory
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
        await self.click_element(self.CUSTOM_ELEMENT)
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

## 🔧 Troubleshooting

### Common Issues

#### 1. Browser Driver Issues
```bash
# Install/update Playwright browsers
python -m playwright install

# Install specific browser
python -m playwright install chromium
python -m playwright install firefox
python -m playwright install webkit
```

#### 2. Service Connection Issues
```bash
# Check if services are running
curl http://localhost:3000  # Frontend
curl http://localhost:8000  # Backend

# Start services if not running
cd backend && python manage.py runserver
cd frontend && npm start
```

#### 3. Permission Issues (Linux/macOS)
```bash
# Make scripts executable
chmod +x run_playwright_tests.sh
chmod +x tests/playwright/report_generator.py
```

#### 4. Virtual Environment Issues
```bash
# Create virtual environment
cd backend
python -m venv kalenv
source kalenv/bin/activate  # Linux/macOS
kalenv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements-playwright.txt
```

### Debug Mode

```bash
# Run with debug output
python -m pytest tests/playwright/ -v -s --tb=long

# Run single test with debug
python -m pytest tests/playwright/test_authentication.py::TestAuthentication::test_user_login_success -v -s

# Run with slow motion
HEADLESS=false SLOW_MO=1000 python run_playwright_tests.py
```

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: Playwright E2E Tests
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
          pip install -r requirements-playwright.txt
          python -m playwright install
      - name: Start services
        run: |
          cd backend && python manage.py runserver &
          cd frontend && npm start &
          sleep 30
      - name: Run E2E tests
        run: |
          python run_playwright_tests.py --headless --browser chromium
      - name: Upload reports
        uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: tests/reports/
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
- Initial Playwright E2E testing framework setup
- Comprehensive test coverage for all major features
- HTML and Allure reporting
- Cross-browser support (Chromium, Firefox, WebKit)
- CI/CD integration ready
- Page Object Model implementation
- Responsive design testing
- Accessibility testing
- Performance testing

---

**Happy Testing! 🎉**


