import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TestUser } from '../fixtures/test-data.fixture';

export class LoginPage extends BasePage {
  // Locators
  get usernameInput(): Locator {
    return this.page.locator('input[name="username"], input[type="email"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[name="password"], input[type="password"]');
  }

  get loginButton(): Locator {
    return this.page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  }

  get googleLoginButton(): Locator {
    return this.page.locator('button:has-text("Google"), button:has-text("Sign in with Google")');
  }

  get registerLink(): Locator {
    return this.page.locator('a:has-text("Register"), a:has-text("Sign Up")');
  }

  get forgotPasswordLink(): Locator {
    return this.page.locator('a:has-text("Forgot Password"), a:has-text("Reset Password")');
  }

  get errorMessage(): Locator {
    return this.page.locator('.error, .alert-error, [data-testid="error-message"]');
  }

  get successMessage(): Locator {
    return this.page.locator('.success, .alert-success, [data-testid="success-message"]');
  }

  get languageSelector(): Locator {
    return this.page.locator('select[name="language"], [data-testid="language-selector"]');
  }

  constructor(page: Page) {
    super(page);
  }

  // Actions
  async navigateToLogin(): Promise<void> {
    await this.navigateTo('/login');
    await this.waitForPageLoad();
  }

  async login(username: string, password: string): Promise<void> {
    await this.fillInput('input[name="username"], input[type="email"]', username);
    await this.fillInput('input[name="password"], input[type="password"]', password);
    await this.loginButton.click();
    await this.waitForPageLoad();
  }

  async loginWithUser(user: TestUser): Promise<void> {
    await this.login(user.email, user.password);
  }

  async clickGoogleLogin(): Promise<void> {
    await this.googleLoginButton.click();
    await this.waitForPageLoad();
  }

  async clickRegister(): Promise<void> {
    await this.registerLink.click();
    await this.waitForPageLoad();
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.waitForPageLoad();
  }

  async changeLanguage(language: string): Promise<void> {
    if (await this.languageSelector.isVisible()) {
      await this.selectOption('select[name="language"], [data-testid="language-selector"]', language);
    }
  }

  // Validations
  async expectLoginFormToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('input[name="username"], input[type="email"]');
    await this.expectElementToBeVisible('input[name="password"], input[type="password"]');
    await this.expectElementToBeVisible('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  }

  async expectGoogleLoginToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('button:has-text("Google"), button:has-text("Sign in with Google")');
  }

  async expectErrorMessageToContain(text: string): Promise<void> {
    await this.expectElementToContainText('.error, .alert-error, [data-testid="error-message"]', text);
  }

  async expectSuccessMessageToContain(text: string): Promise<void> {
    await this.expectElementToContainText('.success, .alert-success, [data-testid="success-message"]', text);
  }

  async expectToBeOnLoginPage(): Promise<void> {
    await this.expectUrlToContain('/login');
    await this.expectLoginFormToBeVisible();
  }

  // Form validation
  async expectUsernameFieldToBeRequired(): Promise<void> {
    const usernameField = this.usernameInput;
    await expect(usernameField).toHaveAttribute('required');
  }

  async expectPasswordFieldToBeRequired(): Promise<void> {
    const passwordField = this.passwordInput;
    await expect(passwordField).toHaveAttribute('required');
  }

  async expectLoginButtonToBeDisabled(): Promise<void> {
    await expect(this.loginButton).toBeDisabled();
  }

  async expectLoginButtonToBeEnabled(): Promise<void> {
    await expect(this.loginButton).toBeEnabled();
  }

  // Helper methods
  async clearForm(): Promise<void> {
    await this.usernameInput.clear();
    await this.passwordInput.clear();
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText('.error, .alert-error, [data-testid="error-message"]');
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText('.success, .alert-success, [data-testid="success-message"]');
  }
}


