# E-Kalolsavam Playwright E2E Test Suite

A comprehensive end-to-end testing suite for the E-Kalolsavam application using Playwright with TypeScript.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Python 3.8+**
- **Chrome/Firefox/Safari** browsers
- **Backend and Frontend** services running

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npm run test:install
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

4. **Run tests:**
   ```bash
   # Run all tests
   npm test
   
   # Run specific test suites
   npm run test:auth
   npm run test:events
   npm run test:admin
   npm run test:api
   npm run test:ui
   npm run test:smoke
   ```

## 📋 Test Structure

### Test Categories

- **🔐 Authentication Tests** (`tests/playwright/auth/`)
  - Login/logout functionality
  - Google OAuth integration
  - Form validation
  - Security checks

- **🎪 Events Management Tests** (`tests/playwright/events/`)
  - Event CRUD operations
  - Event registration
  - Search and filtering
  - Pagination

- **👨‍💼 Admin Functionality Tests** (`tests/playwright/admin/`)
  - User management
  - Google emails management
  - Dashboard functionality
  - Bulk operations

- **🔌 API Validation Tests** (`tests/playwright/api/`)
  - REST API endpoints
  - Authentication flows
  - Error handling
  - Performance testing

- **🎨 UI/UX Tests** (`tests/playwright/ui/`)
  - Responsive design
  - Accessibility checks
  - Cross-browser compatibility
  - Performance metrics

- **💨 Smoke Tests** (`tests/playwright/smoke/`)
  - Critical user flows
  - End-to-end scenarios
  - Integration testing

### Page Object Model

The test suite uses a robust Page Object Model structure:

```
tests/playwright/
├── pages/           # Page object models
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── EventsPage.ts
│   └── AdminPage.ts
├── fixtures/        # Test fixtures
│   ├── auth.fixture.ts
│   ├── test-data.fixture.ts
│   └── api.fixture.ts
├── utils/          # Helper utilities
│   ├── api-helpers.ts
│   └── test-helpers.ts
└── [test-suites]/  # Test specifications
```

## 🛠️ Configuration

### Playwright Configuration

The `playwright.config.ts` file includes:

- **Multi-browser testing** (Chrome, Firefox, Safari)
- **Mobile viewport testing**
- **Parallel test execution**
- **Retry logic for flaky tests**
- **Screenshot and video capture**
- **Trace collection for debugging**

### Test Data

Test data is managed through fixtures in `tests/playwright/fixtures/test-data.fixture.ts`:

```typescript
const testData = {
  users: {
    admin: { username: 'admin_user', email: 'admin@kalolsavam.com', ... },
    judge: { username: 'judge_user', email: 'judge@kalolsavam.com', ... },
    student: { username: 'student_user', email: 'student@kalolsavam.com', ... },
    volunteer: { username: 'volunteer_user', email: 'volunteer@kalolsavam.com', ... }
  },
  events: [...],
  venues: [...]
};
```

## 🎯 Running Tests

### Command Line Options

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:auth      # Authentication tests
npm run test:events     # Events management tests
npm run test:admin      # Admin functionality tests
npm run test:api        # API validation tests
npm run test:ui         # UI/UX tests
npm run test:smoke      # Smoke tests

# Run with different options
npm run test:headed     # Run in headed mode (visible browser)
npm run test:debug      # Run in debug mode
npm run test:ui         # Run with UI mode
```

### Scripts

Use the provided scripts for easy test execution:

```bash
# Linux/macOS
./scripts/run-tests.sh [test-suite]

# Windows
scripts\run-tests.bat [test-suite]
```

## 📊 Reporting

### Playwright Report

- **HTML Report**: `playwright-report/index.html`
- **Screenshots**: Captured on test failures
- **Videos**: Recorded for failed tests
- **Traces**: Available for debugging

### Allure Report

- **Allure Report**: `allure-report/index.html`
- **Test categorization**
- **Trend analysis**
- **Environment information**

### Generate Reports

```bash
# Generate Allure report
npm run allure:generate

# Open Allure report
npm run allure:open

# Serve Allure report
npm run allure:serve
```

## 🔧 CI/CD Integration

### GitHub Actions

The test suite includes a comprehensive GitHub Actions workflow (`.github/workflows/playwright.yml`) that:

- **Runs on multiple triggers** (push, PR, schedule)
- **Tests on multiple browsers** (Chrome, Firefox, Safari)
- **Generates and uploads reports**
- **Handles artifacts and screenshots**

### Local CI

```bash
# Run tests with CI configuration
npx playwright test --config=playwright.config.ts
```

## 🐛 Debugging

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Run specific test in debug mode
npx playwright test tests/playwright/auth/login.spec.ts --debug
```

### Trace Viewer

```bash
# Open trace viewer
npx playwright show-trace trace.zip
```

### Screenshots and Videos

- **Screenshots**: `screenshots/` directory
- **Videos**: `test-results/` directory
- **Traces**: `test-results/` directory

## 📝 Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Feature Tests', () => {
  test('should perform action', async ({ page, loginPage }) => {
    await loginPage.navigateToLogin();
    await loginPage.login('user@example.com', 'password');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### Using Page Objects

```typescript
import { LoginPage } from '../pages/LoginPage';

test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigateToLogin();
  await loginPage.login('user@example.com', 'password');
  await loginPage.expectToBeOnLoginPage();
});
```

### Using Fixtures

```typescript
import { testWithData } from '../fixtures/test-data.fixture';

test('should create user', async ({ page }, { testData }) => {
  await page.goto('/admin');
  // Use testData.users.admin
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Browser not found**: Run `npm run test:install`
2. **Port conflicts**: Ensure ports 3000 and 8000 are available
3. **Database issues**: Check database connection and migrations
4. **Timeout errors**: Increase timeout in `playwright.config.ts`

### Debug Commands

```bash
# Check browser installation
npx playwright install --dry-run

# Run single test file
npx playwright test tests/playwright/auth/login.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run with specific test name
npx playwright test --grep "should login successfully"
```

## 📚 Best Practices

### Test Organization

- **Group related tests** in describe blocks
- **Use descriptive test names**
- **Keep tests independent**
- **Use proper cleanup**

### Page Objects

- **Encapsulate page interactions**
- **Use meaningful method names**
- **Handle dynamic content**
- **Implement proper waits**

### Data Management

- **Use test fixtures** for data
- **Clean up test data**
- **Use unique identifiers**
- **Mock external dependencies**

## 🤝 Contributing

1. **Follow the existing structure**
2. **Add tests for new features**
3. **Update documentation**
4. **Run tests before committing**

## 📄 License

This test suite is part of the E-Kalolsavam project and follows the same licensing terms.


