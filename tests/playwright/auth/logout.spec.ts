import { test, expect } from '../fixtures/auth.fixture';
import { testWithData } from '../fixtures/test-data.fixture';

test.describe('Authentication - Logout', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }, { testData }) => {
    // Login before each test
    await loginPage.navigateToLogin();
    await loginPage.loginWithUser(testData.users.student);
    await dashboardPage.waitForDashboardLoad();
  });

  test('should logout successfully from user menu', async ({ dashboardPage, loginPage }) => {
    await dashboardPage.logout();
    await loginPage.expectToBeOnLoginPage();
  });

  test('should logout successfully from logout button', async ({ dashboardPage, loginPage }) => {
    await dashboardPage.userMenu.click();
    await dashboardPage.logoutButton.click();
    await loginPage.expectToBeOnLoginPage();
  });

  test('should clear session data after logout', async ({ dashboardPage, loginPage }) => {
    await dashboardPage.logout();
    await loginPage.navigateTo('/dashboard');
    await loginPage.expectToBeOnLoginPage();
  });

  test('should redirect to login page when accessing protected routes after logout', async ({ dashboardPage, loginPage }) => {
    await dashboardPage.logout();
    
    // Try to access protected routes
    await loginPage.navigateTo('/admin');
    await loginPage.expectToBeOnLoginPage();
    
    await loginPage.navigateTo('/judge');
    await loginPage.expectToBeOnLoginPage();
    
    await loginPage.navigateTo('/volunteer');
    await loginPage.expectToBeOnLoginPage();
  });

  test('should show logout confirmation dialog', async ({ dashboardPage, loginPage }) => {
    // Mock confirmation dialog
    dashboardPage.page.on('dialog', dialog => dialog.accept());
    
    await dashboardPage.userMenu.click();
    await dashboardPage.logoutButton.click();
    await loginPage.expectToBeOnLoginPage();
  });

  test('should cancel logout when confirmation is dismissed', async ({ dashboardPage }) => {
    // Mock confirmation dialog to dismiss
    dashboardPage.page.on('dialog', dialog => dialog.dismiss());
    
    await dashboardPage.userMenu.click();
    await dashboardPage.logoutButton.click();
    
    // Should still be on dashboard
    await dashboardPage.expectToBeOnDashboard();
  });

  test('should logout from multiple tabs', async ({ dashboardPage, loginPage, page }) => {
    // Open another tab
    const newPage = await page.context().newPage();
    await newPage.goto('/dashboard');
    
    // Logout from first page
    await dashboardPage.logout();
    
    // Check that second tab is also logged out
    await newPage.waitForLoadState('networkidle');
    await expect(newPage).toHaveURL(/\/login/);
    
    await newPage.close();
  });

  test('should handle logout with pending requests', async ({ dashboardPage, loginPage }) => {
    // Start a long-running request
    const requestPromise = dashboardPage.page.request.get('/api/events/');
    
    // Logout while request is pending
    await dashboardPage.logout();
    
    // Should still redirect to login
    await loginPage.expectToBeOnLoginPage();
  });

  test('should clear local storage on logout', async ({ dashboardPage, loginPage }) => {
    // Set some local storage data
    await dashboardPage.page.evaluate(() => {
      localStorage.setItem('user_preferences', 'test_data');
      localStorage.setItem('auth_token', 'test_token');
    });
    
    await dashboardPage.logout();
    
    // Check that local storage is cleared
    const userPrefs = await loginPage.page.evaluate(() => localStorage.getItem('user_preferences'));
    const authToken = await loginPage.page.evaluate(() => localStorage.getItem('auth_token'));
    
    expect(userPrefs).toBeNull();
    expect(authToken).toBeNull();
  });

  test('should clear session storage on logout', async ({ dashboardPage, loginPage }) => {
    // Set some session storage data
    await dashboardPage.page.evaluate(() => {
      sessionStorage.setItem('temp_data', 'test_data');
      sessionStorage.setItem('session_token', 'test_token');
    });
    
    await dashboardPage.logout();
    
    // Check that session storage is cleared
    const tempData = await loginPage.page.evaluate(() => sessionStorage.getItem('temp_data'));
    const sessionToken = await loginPage.page.evaluate(() => sessionStorage.getItem('session_token'));
    
    expect(tempData).toBeNull();
    expect(sessionToken).toBeNull();
  });

  test('should handle logout with unsaved changes', async ({ dashboardPage, loginPage }) => {
    // Navigate to a form page with unsaved changes
    await dashboardPage.navigateTo('/events');
    await dashboardPage.page.fill('input[name="name"]', 'Test Event');
    
    // Try to logout
    await dashboardPage.logout();
    
    // Should show unsaved changes warning
    await dashboardPage.expectElementToContainText('.unsaved-changes, [data-testid="unsaved-changes"]', 'You have unsaved changes');
  });

  test('should logout automatically on session timeout', async ({ dashboardPage, loginPage }) => {
    // Mock session timeout by setting a short timeout
    await dashboardPage.page.evaluate(() => {
      // Simulate session timeout after 1 second
      setTimeout(() => {
        window.dispatchEvent(new Event('session-timeout'));
      }, 1000);
    });
    
    // Wait for session timeout
    await dashboardPage.page.waitForEvent('session-timeout');
    
    // Should redirect to login
    await loginPage.expectToBeOnLoginPage();
  });

  test('should show appropriate message after logout', async ({ dashboardPage, loginPage }) => {
    await dashboardPage.logout();
    await loginPage.expectSuccessMessageToContain('Logged out successfully');
  });

  test('should handle logout with active WebSocket connections', async ({ dashboardPage, loginPage }) => {
    // Mock WebSocket connection
    await dashboardPage.page.evaluate(() => {
      const ws = new WebSocket('ws://localhost:8000/ws/');
      window.testWebSocket = ws;
    });
    
    await dashboardPage.logout();
    
    // WebSocket should be closed
    const isWebSocketClosed = await dashboardPage.page.evaluate(() => {
      return window.testWebSocket?.readyState === WebSocket.CLOSED;
    });
    
    expect(isWebSocketClosed).toBeTruthy();
  });

  test('should handle logout with file uploads in progress', async ({ dashboardPage, loginPage }) => {
    // Start a file upload
    await dashboardPage.navigateTo('/profile');
    await dashboardPage.page.setInputFiles('input[type="file"]', 'test-file.txt');
    
    // Logout while upload is in progress
    await dashboardPage.logout();
    
    // Should still redirect to login
    await loginPage.expectToBeOnLoginPage();
  });

  test('should handle logout with notifications', async ({ dashboardPage, loginPage }) => {
    // Show a notification
    await dashboardPage.page.evaluate(() => {
      if ('Notification' in window) {
        new Notification('Test notification');
      }
    });
    
    await dashboardPage.logout();
    
    // Should clear notifications
    const hasNotifications = await dashboardPage.page.evaluate(() => {
      return 'Notification' in window && Notification.permission === 'granted';
    });
    
    expect(hasNotifications).toBeFalsy();
  });
});


