import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Navigation locators
  get navigationMenu(): Locator {
    return this.page.locator('nav, [data-testid="navigation"]');
  }

  get userMenu(): Locator {
    return this.page.locator('[data-testid="user-menu"], .user-menu');
  }

  get logoutButton(): Locator {
    return this.page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout-button"]');
  }

  get profileButton(): Locator {
    return this.page.locator('button:has-text("Profile"), a:has-text("Profile"), [data-testid="profile-button"]');
  }

  // Dashboard content locators
  get welcomeMessage(): Locator {
    return this.page.locator('h1, h2, .welcome-message, [data-testid="welcome-message"]');
  }

  get userInfo(): Locator {
    return this.page.locator('.user-info, [data-testid="user-info"]');
  }

  get notifications(): Locator {
    return this.page.locator('.notifications, [data-testid="notifications"]');
  }

  get notificationCount(): Locator {
    return this.page.locator('.notification-count, [data-testid="notification-count"]');
  }

  // Role-specific sections
  get studentSection(): Locator {
    return this.page.locator('[data-testid="student-section"], .student-dashboard');
  }

  get judgeSection(): Locator {
    return this.page.locator('[data-testid="judge-section"], .judge-dashboard');
  }

  get adminSection(): Locator {
    return this.page.locator('[data-testid="admin-section"], .admin-dashboard');
  }

  get volunteerSection(): Locator {
    return this.page.locator('[data-testid="volunteer-section"], .volunteer-dashboard');
  }

  // Quick actions
  get quickActions(): Locator {
    return this.page.locator('.quick-actions, [data-testid="quick-actions"]');
  }

  get registerEventButton(): Locator {
    return this.page.locator('button:has-text("Register Event"), a:has-text("Register Event")');
  }

  get viewEventsButton(): Locator {
    return this.page.locator('button:has-text("View Events"), a:has-text("View Events")');
  }

  get viewResultsButton(): Locator {
    return this.page.locator('button:has-text("View Results"), a:has-text("View Results")');
  }

  get qrCodeButton(): Locator {
    return this.page.locator('button:has-text("QR Code"), a:has-text("QR Code")');
  }

  get feedbackButton(): Locator {
    return this.page.locator('button:has-text("Feedback"), a:has-text("Feedback")');
  }

  constructor(page: Page) {
    super(page);
  }

  // Navigation actions
  async navigateToDashboard(): Promise<void> {
    await this.navigateTo('/dashboard');
    await this.waitForPageLoad();
  }

  async navigateToStudentDashboard(): Promise<void> {
    await this.navigateTo('/student');
    await this.waitForPageLoad();
  }

  async navigateToJudgeDashboard(): Promise<void> {
    await this.navigateTo('/judge');
    await this.waitForPageLoad();
  }

  async navigateToAdminDashboard(): Promise<void> {
    await this.navigateTo('/admin');
    await this.waitForPageLoad();
  }

  async navigateToVolunteerDashboard(): Promise<void> {
    await this.navigateTo('/volunteer');
    await this.waitForPageLoad();
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.waitForPageLoad();
  }

  async openProfile(): Promise<void> {
    await this.userMenu.click();
    await this.profileButton.click();
    await this.waitForPageLoad();
  }

  // Quick action methods
  async clickRegisterEvent(): Promise<void> {
    await this.registerEventButton.click();
    await this.waitForPageLoad();
  }

  async clickViewEvents(): Promise<void> {
    await this.viewEventsButton.click();
    await this.waitForPageLoad();
  }

  async clickViewResults(): Promise<void> {
    await this.viewResultsButton.click();
    await this.waitForPageLoad();
  }

  async clickQRCode(): Promise<void> {
    await this.qrCodeButton.click();
    await this.waitForPageLoad();
  }

  async clickFeedback(): Promise<void> {
    await this.feedbackButton.click();
    await this.waitForPageLoad();
  }

  // Validations
  async expectToBeOnDashboard(): Promise<void> {
    await this.expectUrlToContain('/dashboard|/student|/judge|/admin|/volunteer');
    await this.expectElementToBeVisible('h1, h2, .welcome-message, [data-testid="welcome-message"]');
  }

  async expectWelcomeMessageToContain(text: string): Promise<void> {
    await this.expectElementToContainText('h1, h2, .welcome-message, [data-testid="welcome-message"]', text);
  }

  async expectUserInfoToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('.user-info, [data-testid="user-info"]');
  }

  async expectNavigationMenuToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('nav, [data-testid="navigation"]');
  }

  async expectUserMenuToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('[data-testid="user-menu"], .user-menu');
  }

  async expectLogoutButtonToBeVisible(): Promise<void> {
    await this.userMenu.click();
    await this.expectElementToBeVisible('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout-button"]');
  }

  // Role-specific validations
  async expectStudentSectionToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('[data-testid="student-section"], .student-dashboard');
  }

  async expectJudgeSectionToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('[data-testid="judge-section"], .judge-dashboard');
  }

  async expectAdminSectionToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('[data-testid="admin-section"], .admin-dashboard');
  }

  async expectVolunteerSectionToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('[data-testid="volunteer-section"], .volunteer-dashboard');
  }

  // Notification methods
  async expectNotificationsToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('.notifications, [data-testid="notifications"]');
  }

  async getNotificationCount(): Promise<number> {
    const countText = await this.getText('.notification-count, [data-testid="notification-count"]');
    return parseInt(countText) || 0;
  }

  async expectNotificationCountToBe(count: number): Promise<void> {
    const actualCount = await this.getNotificationCount();
    expect(actualCount).toBe(count);
  }

  // Helper methods
  async getWelcomeMessage(): Promise<string> {
    return await this.getText('h1, h2, .welcome-message, [data-testid="welcome-message"]');
  }

  async getUserInfo(): Promise<string> {
    return await this.getText('.user-info, [data-testid="user-info"]');
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.isVisible('[data-testid="user-menu"], .user-menu');
  }

  async waitForDashboardLoad(): Promise<void> {
    await this.waitForPageLoad();
    await this.expectElementToBeVisible('h1, h2, .welcome-message, [data-testid="welcome-message"]');
  }
}


