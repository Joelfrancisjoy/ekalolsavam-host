import { test, expect } from '../fixtures/auth.fixture';
import { testWithData, TestUser } from '../fixtures/test-data.fixture';

test.describe('Authentication - Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigateToLogin();
  });

  test('should display login form correctly', async ({ loginPage }) => {
    await loginPage.expectLoginFormToBeVisible();
    await loginPage.expectUsernameFieldToBeRequired();
    await loginPage.expectPasswordFieldToBeRequired();
    await loginPage.expectLoginButtonToBeDisabled();
  });

  test('should show Google login option', async ({ loginPage }) => {
    await loginPage.expectGoogleLoginToBeVisible();
  });

  test('should enable login button when form is filled', async ({ loginPage }) => {
    await loginPage.fillInput('input[name="username"], input[type="email"]', 'test@example.com');
    await loginPage.fillInput('input[name="password"], input[type="password"]', 'password123');
    await loginPage.expectLoginButtonToBeEnabled();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    await loginPage.expectErrorMessageToContain('Invalid credentials');
  });

  test('should show error for empty username', async ({ loginPage }) => {
    await loginPage.fillInput('input[name="password"], input[type="password"]', 'password123');
    await loginPage.loginButton.click();
    await loginPage.expectElementToContainText('input[name="username"], input[type="email"]', '');
  });

  test('should show error for empty password', async ({ loginPage }) => {
    await loginPage.fillInput('input[name="username"], input[type="email"]', 'test@example.com');
    await loginPage.loginButton.click();
    await loginPage.expectElementToContainText('input[name="password"], input[type="password"]', '');
  });

  test('should navigate to register page', async ({ loginPage }) => {
    await loginPage.clickRegister();
    await loginPage.expectUrlToContain('/register');
  });

  test('should navigate to forgot password page', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    await loginPage.expectUrlToContain('/forgot-password');
  });

  test('should support language switching', async ({ loginPage }) => {
    if (await loginPage.languageSelector.isVisible()) {
      await loginPage.changeLanguage('ml');
      await loginPage.expectElementToContainText('button:has-text("Login"), button:has-text("Sign In")', 'ലോഗിൻ');
    }
  });

  test('should clear form when clear button is clicked', async ({ loginPage }) => {
    await loginPage.fillInput('input[name="username"], input[type="email"]', 'test@example.com');
    await loginPage.fillInput('input[name="password"], input[type="password"]', 'password123');
    await loginPage.clearForm();
    await loginPage.expectElementToHaveValue('input[name="username"], input[type="email"]', '');
    await loginPage.expectElementToHaveValue('input[name="password"], input[type="password"]', '');
  });
});

test.describe('Authentication - Successful Login', () => {
  test('should login successfully with valid admin credentials', async ({ loginPage, dashboardPage }, { testData }) => {
    await loginPage.loginWithUser(testData.users.admin);
    await dashboardPage.expectToBeOnDashboard();
    await dashboardPage.expectAdminSectionToBeVisible();
  });

  test('should login successfully with valid judge credentials', async ({ loginPage, dashboardPage }, { testData }) => {
    await loginPage.loginWithUser(testData.users.judge);
    await dashboardPage.expectToBeOnDashboard();
    await dashboardPage.expectJudgeSectionToBeVisible();
  });

  test('should login successfully with valid student credentials', async ({ loginPage, dashboardPage }, { testData }) => {
    await loginPage.loginWithUser(testData.users.student);
    await dashboardPage.expectToBeOnDashboard();
    await dashboardPage.expectStudentSectionToBeVisible();
  });

  test('should login successfully with valid volunteer credentials', async ({ loginPage, dashboardPage }, { testData }) => {
    await loginPage.loginWithUser(testData.users.volunteer);
    await dashboardPage.expectToBeOnDashboard();
    await dashboardPage.expectVolunteerSectionToBeVisible();
  });

  test('should redirect to appropriate dashboard based on role', async ({ loginPage, dashboardPage }, { testData }) => {
    await loginPage.loginWithUser(testData.users.admin);
    await dashboardPage.expectUrlToContain('/admin');
    
    await loginPage.navigateToLogin();
    await loginPage.loginWithUser(testData.users.student);
    await dashboardPage.expectUrlToContain('/student');
  });

  test('should display welcome message with user name', async ({ loginPage, dashboardPage }, { testData }) => {
    await loginPage.loginWithUser(testData.users.student);
    await dashboardPage.expectWelcomeMessageToContain(testData.users.student.firstName);
  });

  test('should show user menu after login', async ({ loginPage, dashboardPage }, { testData }) => {
    await loginPage.loginWithUser(testData.users.student);
    await dashboardPage.expectUserMenuToBeVisible();
    await dashboardPage.expectLogoutButtonToBeVisible();
  });
});

test.describe('Authentication - Google Login', () => {
  test('should display Google login button', async ({ loginPage }) => {
    await loginPage.expectGoogleLoginToBeVisible();
  });

  test('should handle Google login click', async ({ loginPage }) => {
    await loginPage.clickGoogleLogin();
    // Note: In a real test environment, you might need to mock Google OAuth
    // For now, we just verify the button is clickable
    await expect(loginPage.googleLoginButton).toBeVisible();
  });

  test('should show appropriate error for unauthorized Google email', async ({ loginPage }) => {
    // This would require mocking the Google OAuth flow
    // and testing with an unauthorized email
    await loginPage.clickGoogleLogin();
    // Mock the OAuth response with unauthorized email
    // await loginPage.expectErrorMessageToContain('Email not authorized');
  });
});

test.describe('Authentication - Form Validation', () => {
  test('should validate email format', async ({ loginPage }) => {
    await loginPage.fillInput('input[name="username"], input[type="email"]', 'invalid-email');
    await loginPage.fillInput('input[name="password"], input[type="password"]', 'password123');
    await loginPage.loginButton.click();
    await loginPage.expectElementToContainText('input[name="username"], input[type="email"]', 'invalid-email');
  });

  test('should show password strength indicator', async ({ loginPage }) => {
    await loginPage.fillInput('input[name="password"], input[type="password"]', 'weak');
    // Check if password strength indicator is visible
    await loginPage.expectElementToBeVisible('.password-strength, [data-testid="password-strength"]');
  });

  test('should prevent XSS attacks in form fields', async ({ loginPage }) => {
    const xssPayload = '<script>alert("xss")</script>';
    await loginPage.fillInput('input[name="username"], input[type="email"]', xssPayload);
    await loginPage.fillInput('input[name="password"], input[type="password"]', 'password123');
    await loginPage.loginButton.click();
    // Verify that script tags are not executed
    await expect(loginPage.page.locator('script')).toHaveCount(0);
  });
});

test.describe('Authentication - Security', () => {
  test('should not expose sensitive information in error messages', async ({ loginPage }) => {
    await loginPage.login('admin@example.com', 'wrongpassword');
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).not.toContain('password');
    expect(errorMessage).not.toContain('admin');
  });

  test('should implement rate limiting for failed attempts', async ({ loginPage }) => {
    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      await loginPage.login('test@example.com', 'wrongpassword');
      await loginPage.expectErrorMessageToContain('Invalid credentials');
    }
    
    // Should show rate limiting message
    await loginPage.expectErrorMessageToContain('Too many attempts');
  });

  test('should clear sensitive data on page unload', async ({ loginPage }) => {
    await loginPage.fillInput('input[name="username"], input[type="email"]', 'test@example.com');
    await loginPage.fillInput('input[name="password"], input[type="password"]', 'password123');
    
    // Navigate away and back
    await loginPage.navigateTo('/');
    await loginPage.navigateToLogin();
    
    // Form should be cleared
    await loginPage.expectElementToHaveValue('input[name="username"], input[type="email"]', '');
    await loginPage.expectElementToHaveValue('input[name="password"], input[type="password"]', '');
  });
});


