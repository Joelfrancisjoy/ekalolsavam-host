# Playwright Test Setup Guide

## 🚀 Quick Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Install Playwright Browsers
```bash
npm run test:install
```

### Step 3: Start Your Application Servers

**Option A: Manual Setup (Recommended)**
```bash
# Terminal 1 - Backend
cd backend
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm start
```

**Option B: Use Setup Script**
```bash
# Windows
npm run setup:servers

# Linux/macOS
./scripts/setup-servers.sh
```

### Step 4: Verify Setup
```bash
# Test if servers are running
npm run test:setup
```

### Step 5: Run Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:auth
npm run test:events
npm run test:admin
```

## 🔧 Troubleshooting

### Issue: "Timed out waiting for webServer"
**Solution:** Make sure both servers are running:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

### Issue: "No tests found"
**Solution:** Check that your test files are in the correct location:
- Tests should be in `tests/playwright/` directory
- Test files should end with `.spec.ts`

### Issue: "Browser not found"
**Solution:** Install Playwright browsers:
```bash
npm run test:install
```

### Issue: "Port already in use"
**Solution:** Kill processes using ports 3000 and 8000:
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill
lsof -ti:8000 | xargs kill
```

## 📋 Prerequisites

- **Node.js 18+**
- **Python 3.8+**
- **Backend server running on port 8000**
- **Frontend server running on port 3000**

## 🎯 Test Commands

```bash
# Basic commands
npm test                    # Run all tests
npm run test:setup         # Verify setup
npm run test:headed        # Run with visible browser
npm run test:debug         # Run in debug mode

# Specific test suites
npm run test:auth          # Authentication tests
npm run test:events        # Events management tests
npm run test:admin         # Admin functionality tests
npm run test:api           # API validation tests
npm run test:ui            # UI/UX tests
npm run test:smoke         # Smoke tests

# Reports
npm run test:report        # Open Playwright report
npm run allure:generate   # Generate Allure report
npm run allure:open       # Open Allure report
```

## 🐛 Debug Mode

To debug tests:
```bash
npm run test:debug
```

This will:
- Open browser in headed mode
- Pause execution at breakpoints
- Allow step-by-step debugging

## 📊 Reports

After running tests, you can view reports:
- **Playwright Report**: `playwright-report/index.html`
- **Allure Report**: `allure-report/index.html`
- **Screenshots**: `screenshots/` directory
- **Videos**: `test-results/` directory

## 🔄 Continuous Integration

For CI/CD, use the GitHub Actions workflow:
```yaml
# .github/workflows/playwright.yml
# This will automatically start servers and run tests
```

## 📝 Writing Tests

Create new test files in the appropriate directory:
- `tests/playwright/auth/` - Authentication tests
- `tests/playwright/events/` - Events tests
- `tests/playwright/admin/` - Admin tests
- `tests/playwright/api/` - API tests
- `tests/playwright/ui/` - UI tests
- `tests/playwright/smoke/` - Smoke tests

Example test file:
```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('My Feature Tests', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/E-Kalolsavam/);
  });
});
```


