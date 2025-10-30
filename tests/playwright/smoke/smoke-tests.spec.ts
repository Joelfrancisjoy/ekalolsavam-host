import { test, expect } from '../fixtures/auth.fixture';
import { testWithData } from '../fixtures/test-data.fixture';

test.describe('Smoke Tests - Critical User Flows', () => {
  test('should complete full user registration and login flow', async ({ page }, { testData }) => {
    // Navigate to registration page
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="username"]', 'smoke_test_user');
    await page.fill('input[name="email"]', 'smoketest@example.com');
    await page.fill('input[name="password"]', 'SmokeTestPass123!');
    await page.fill('input[name="first_name"]', 'Smoke');
    await page.fill('input[name="last_name"]', 'Test');
    await page.selectOption('select[name="role"]', 'student');
    await page.fill('input[name="school"]', 'Test School');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/\/login|\/dashboard/);
    
    // If redirected to login, complete login
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', 'smoketest@example.com');
      await page.fill('input[type="password"]', 'SmokeTestPass123!');
      await page.click('button[type="submit"]');
    }
    
    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard|\/student/);
    await expect(page.locator('h1, h2, .welcome-message')).toBeVisible();
  });

  test('should complete admin login and user management flow', async ({ page }, { testData }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', testData.users.admin.email);
    await page.fill('input[type="password"]', testData.users.admin.password);
    await page.click('button[type="submit"]');
    
    // Should be on admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    
    // Navigate to users management
    await page.click('button:has-text("Users"), a:has-text("Users")');
    await expect(page.locator('.users-list, [data-testid="users-list"]')).toBeVisible();
    
    // Create a new user
    await page.click('button:has-text("Add User"), a:has-text("Add User")');
    await expect(page.locator('form, [data-testid="user-form"]')).toBeVisible();
    
    await page.fill('input[name="username"]', 'smoke_admin_user');
    await page.fill('input[name="email"]', 'smokeadmin@example.com');
    await page.fill('input[name="password"]', 'SmokeAdminPass123!');
    await page.fill('input[name="first_name"]', 'Smoke');
    await page.fill('input[name="last_name"]', 'Admin');
    await page.selectOption('select[name="role"]', 'student');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('.success, .alert-success')).toBeVisible();
  });

  test('should complete event creation and registration flow', async ({ page }, { testData }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', testData.users.admin.email);
    await page.fill('input[type="password"]', testData.users.admin.password);
    await page.click('button[type="submit"]');
    
    // Navigate to events
    await page.goto('/events');
    await expect(page.locator('.events-list, [data-testid="events-list"]')).toBeVisible();
    
    // Create new event
    await page.click('button:has-text("Add Event"), a:has-text("Add Event")');
    await expect(page.locator('form, [data-testid="event-form"]')).toBeVisible();
    
    await page.fill('input[name="name"]', 'Smoke Test Event');
    await page.fill('textarea[name="description"]', 'Test event for smoke testing');
    await page.selectOption('select[name="category"]', 'dance');
    await page.fill('input[name="date"]', '2024-12-25');
    await page.fill('input[name="start_time"]', '10:00');
    await page.fill('input[name="end_time"]', '12:00');
    await page.selectOption('select[name="venue"]', 'Main Auditorium');
    await page.fill('input[name="max_participants"]', '50');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('.success, .alert-success')).toBeVisible();
    
    // Logout and login as student
    await page.click('[data-testid="user-menu"], .user-menu');
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
    
    await page.goto('/login');
    await page.fill('input[type="email"]', testData.users.student.email);
    await page.fill('input[type="password"]', testData.users.student.password);
    await page.click('button[type="submit"]');
    
    // Register for event
    await page.goto('/events');
    await page.click('button:has-text("Register"), a:has-text("Register")');
    
    // Should show success message
    await expect(page.locator('.success, .alert-success')).toBeVisible();
  });

  test('should complete scoring flow', async ({ page }, { testData }) => {
    // Login as judge
    await page.goto('/login');
    await page.fill('input[type="email"]', testData.users.judge.email);
    await page.fill('input[type="password"]', testData.users.judge.password);
    await page.click('button[type="submit"]');
    
    // Navigate to scoring
    await page.goto('/judge');
    await expect(page.locator('.judge-dashboard, [data-testid="judge-section"]')).toBeVisible();
    
    // Find event to score
    await page.click('button:has-text("Score Event"), a:has-text("Score Event")');
    await expect(page.locator('.scoring-form, [data-testid="scoring-form"]')).toBeVisible();
    
    // Submit score
    await page.fill('input[name="criterion1"]', '8.5');
    await page.fill('input[name="criterion2"]', '9.0');
    await page.fill('input[name="criterion3"]', '8.0');
    await page.fill('input[name="criterion4"]', '9.5');
    await page.fill('textarea[name="notes"]', 'Excellent performance');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('.success, .alert-success')).toBeVisible();
  });

  test('should complete volunteer verification flow', async ({ page }, { testData }) => {
    // Login as volunteer
    await page.goto('/login');
    await page.fill('input[type="email"]', testData.users.volunteer.email);
    await page.fill('input[type="password"]', testData.users.volunteer.password);
    await page.click('button[type="submit"]');
    
    // Navigate to volunteer dashboard
    await page.goto('/volunteer');
    await expect(page.locator('.volunteer-dashboard, [data-testid="volunteer-section"]')).toBeVisible();
    
    // Find participant to verify
    await page.click('button:has-text("Verify Participant"), a:has-text("Verify Participant")');
    await expect(page.locator('.verification-form, [data-testid="verification-form"]')).toBeVisible();
    
    // Complete verification
    await page.fill('input[name="chess_number"]', 'CH001');
    await page.selectOption('select[name="status"]', 'verified');
    await page.fill('textarea[name="notes"]', 'Participant verified successfully');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('.success, .alert-success')).toBeVisible();
  });

  test('should complete results viewing flow', async ({ page }, { testData }) => {
    // Navigate to results page
    await page.goto('/results');
    await expect(page.locator('.results-page, [data-testid="results-page"]')).toBeVisible();
    
    // Check if results are displayed
    const results = page.locator('.result-item, [data-testid="result-item"]');
    const resultCount = await results.count();
    
    if (resultCount > 0) {
      await expect(results.first()).toBeVisible();
      
      // Test filtering
      await page.selectOption('select[name="category"]', 'dance');
      await page.click('button:has-text("Filter"), button:has-text("Apply")');
      
      // Results should be filtered
      await expect(page.locator('.result-item, [data-testid="result-item"]')).toBeVisible();
    }
  });

  test('should handle error scenarios gracefully', async ({ page }, { testData }) => {
    // Test invalid login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error, .alert-error')).toBeVisible();
    
    // Test network error
    await page.route('**/api/**', route => route.abort());
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error, .alert-error')).toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }, { testData }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testData.users.student.email);
    await page.fill('input[type="password"]', testData.users.student.password);
    await page.click('button[type="submit"]');
    
    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard|\/student/);
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/\/dashboard|\/student/);
    await expect(page.locator('h1, h2, .welcome-message')).toBeVisible();
  });

  test('should handle multiple browser tabs', async ({ page }, { testData }) => {
    // Login in first tab
    await page.goto('/login');
    await page.fill('input[type="email"]', testData.users.student.email);
    await page.fill('input[type="password"]', testData.users.student.password);
    await page.click('button[type="submit"]');
    
    // Open second tab
    const newPage = await page.context().newPage();
    await newPage.goto('/dashboard');
    
    // Should be logged in in second tab
    await expect(newPage).toHaveURL(/\/dashboard|\/student/);
    await expect(newPage.locator('h1, h2, .welcome-message')).toBeVisible();
    
    // Logout from first tab
    await page.click('[data-testid="user-menu"], .user-menu');
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
    
    // Second tab should also be logged out
    await newPage.waitForLoadState('networkidle');
    await expect(newPage).toHaveURL(/\/login/);
    
    await newPage.close();
  });

  test('should handle form validation errors', async ({ page }, { testData }) => {
    // Test registration with invalid data
    await page.goto('/register');
    
    // Submit form without required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.error, .alert-error')).toBeVisible();
    
    // Test with invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // Should show email validation error
    await expect(page.locator('.error, .alert-error')).toBeVisible();
  });

  test('should handle concurrent user actions', async ({ page }, { testData }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', testData.users.admin.email);
    await page.fill('input[type="password"]', testData.users.admin.password);
    await page.click('button[type="submit"]');
    
    // Open multiple tabs
    const tab1 = await page.context().newPage();
    const tab2 = await page.context().newPage();
    
    await tab1.goto('/admin');
    await tab2.goto('/admin');
    
    // Both tabs should work
    await expect(tab1.locator('.admin-dashboard, [data-testid="admin-section"]')).toBeVisible();
    await expect(tab2.locator('.admin-dashboard, [data-testid="admin-section"]')).toBeVisible();
    
    await tab1.close();
    await tab2.close();
  });
});


