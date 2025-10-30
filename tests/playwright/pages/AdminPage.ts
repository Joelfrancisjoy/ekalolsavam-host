import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  // Navigation tabs
  get adminTabs(): Locator {
    return this.page.locator('.admin-tabs, [data-testid="admin-tabs"]');
  }

  get usersTab(): Locator {
    return this.page.locator('button:has-text("Users"), a:has-text("Users"), [data-testid="users-tab"]');
  }

  get eventsTab(): Locator {
    return this.page.locator('button:has-text("Events"), a:has-text("Events"), [data-testid="events-tab"]');
  }

  get scoresTab(): Locator {
    return this.page.locator('button:has-text("Scores"), a:has-text("Scores"), [data-testid="scores-tab"]');
  }

  get volunteersTab(): Locator {
    return this.page.locator('button:has-text("Volunteers"), a:has-text("Volunteers"), [data-testid="volunteers-tab"]');
  }

  get googleEmailsTab(): Locator {
    return this.page.locator('button:has-text("Google Emails"), a:has-text("Google Emails"), [data-testid="google-emails-tab"]');
  }

  get reportsTab(): Locator {
    return this.page.locator('button:has-text("Reports"), a:has-text("Reports"), [data-testid="reports-tab"]');
  }

  // Users management
  get usersList(): Locator {
    return this.page.locator('.users-list, [data-testid="users-list"]');
  }

  get userRows(): Locator {
    return this.page.locator('.user-row, [data-testid="user-row"]');
  }

  get addUserButton(): Locator {
    return this.page.locator('button:has-text("Add User"), a:has-text("Add User")');
  }

  get editUserButton(): Locator {
    return this.page.locator('button:has-text("Edit"), a:has-text("Edit User")');
  }

  get deleteUserButton(): Locator {
    return this.page.locator('button:has-text("Delete"), a:has-text("Delete User")');
  }

  get userSearchInput(): Locator {
    return this.page.locator('input[placeholder*="Search users"], [data-testid="user-search"]');
  }

  get userRoleFilter(): Locator {
    return this.page.locator('select[name="role"], [data-testid="role-filter"]');
  }

  // User form
  get userForm(): Locator {
    return this.page.locator('form, [data-testid="user-form"]');
  }

  get usernameInput(): Locator {
    return this.page.locator('input[name="username"], [data-testid="username"]');
  }

  get emailInput(): Locator {
    return this.page.locator('input[name="email"], [data-testid="email"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[name="password"], [data-testid="password"]');
  }

  get firstNameInput(): Locator {
    return this.page.locator('input[name="first_name"], [data-testid="first-name"]');
  }

  get lastNameInput(): Locator {
    return this.page.locator('input[name="last_name"], [data-testid="last-name"]');
  }

  get roleSelect(): Locator {
    return this.page.locator('select[name="role"], [data-testid="role-select"]');
  }

  get schoolInput(): Locator {
    return this.page.locator('input[name="school"], [data-testid="school"]');
  }

  get specializationInput(): Locator {
    return this.page.locator('input[name="specialization"], [data-testid="specialization"]');
  }

  get isActiveCheckbox(): Locator {
    return this.page.locator('input[name="is_active"], [data-testid="is-active"]');
  }

  get isStaffCheckbox(): Locator {
    return this.page.locator('input[name="is_staff"], [data-testid="is-staff"]');
  }

  get isSuperuserCheckbox(): Locator {
    return this.page.locator('input[name="is_superuser"], [data-testid="is-superuser"]');
  }

  get saveUserButton(): Locator {
    return this.page.locator('button[type="submit"], button:has-text("Save User")');
  }

  get cancelUserButton(): Locator {
    return this.page.locator('button:has-text("Cancel"), a:has-text("Cancel")');
  }

  // Google emails management
  get googleEmailsList(): Locator {
    return this.page.locator('.google-emails-list, [data-testid="google-emails-list"]');
  }

  get addEmailButton(): Locator {
    return this.page.locator('button:has-text("Add Email"), a:has-text("Add Email")');
  }

  get emailInput(): Locator {
    return this.page.locator('input[name="email"], input[type="email"], [data-testid="email-input"]');
  }

  get saveEmailButton(): Locator {
    return this.page.locator('button:has-text("Save"), button:has-text("Add Email")');
  }

  get deleteEmailButton(): Locator {
    return this.page.locator('button:has-text("Delete"), a:has-text("Delete Email")');
  }

  // Statistics and reports
  get statisticsCards(): Locator {
    return this.page.locator('.statistics-cards, [data-testid="statistics-cards"]');
  }

  get totalUsersCard(): Locator {
    return this.page.locator('[data-testid="total-users"], .stat-card:has-text("Total Users")');
  }

  get totalEventsCard(): Locator {
    return this.page.locator('[data-testid="total-events"], .stat-card:has-text("Total Events")');
  }

  get totalParticipantsCard(): Locator {
    return this.page.locator('[data-testid="total-participants"], .stat-card:has-text("Total Participants")');
  }

  get activeEventsCard(): Locator {
    return this.page.locator('[data-testid="active-events"], .stat-card:has-text("Active Events")');
  }

  // Bulk actions
  get selectAllCheckbox(): Locator {
    return this.page.locator('input[type="checkbox"][data-testid="select-all"]');
  }

  get bulkActionSelect(): Locator {
    return this.page.locator('select[name="bulk-action"], [data-testid="bulk-action"]');
  }

  get applyBulkActionButton(): Locator {
    return this.page.locator('button:has-text("Apply"), button:has-text("Execute")');
  }

  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async navigateToAdmin(): Promise<void> {
    await this.navigateTo('/admin');
    await this.waitForPageLoad();
  }

  async clickUsersTab(): Promise<void> {
    await this.usersTab.click();
    await this.waitForPageLoad();
  }

  async clickEventsTab(): Promise<void> {
    await this.eventsTab.click();
    await this.waitForPageLoad();
  }

  async clickScoresTab(): Promise<void> {
    await this.scoresTab.click();
    await this.waitForPageLoad();
  }

  async clickVolunteersTab(): Promise<void> {
    await this.volunteersTab.click();
    await this.waitForPageLoad();
  }

  async clickGoogleEmailsTab(): Promise<void> {
    await this.googleEmailsTab.click();
    await this.waitForPageLoad();
  }

  async clickReportsTab(): Promise<void> {
    await this.reportsTab.click();
    await this.waitForPageLoad();
  }

  // User management actions
  async searchUsers(searchTerm: string): Promise<void> {
    await this.fillInput('input[placeholder*="Search users"], [data-testid="user-search"]', searchTerm);
    await this.page.keyboard.press('Enter');
    await this.waitForPageLoad();
  }

  async filterUsersByRole(role: string): Promise<void> {
    await this.selectOption('select[name="role"], [data-testid="role-filter"]', role);
    await this.waitForPageLoad();
  }

  async clickAddUser(): Promise<void> {
    await this.addUserButton.click();
    await this.waitForPageLoad();
  }

  async clickEditUser(): Promise<void> {
    await this.editUserButton.first().click();
    await this.waitForPageLoad();
  }

  async clickDeleteUser(): Promise<void> {
    await this.deleteUserButton.first().click();
    await this.waitForPageLoad();
  }

  async fillUserForm(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    school?: string;
    specialization?: string;
    isActive?: boolean;
    isStaff?: boolean;
    isSuperuser?: boolean;
  }): Promise<void> {
    await this.fillInput('input[name="username"], [data-testid="username"]', userData.username);
    await this.fillInput('input[name="email"], [data-testid="email"]', userData.email);
    await this.fillInput('input[name="password"], [data-testid="password"]', userData.password);
    await this.fillInput('input[name="first_name"], [data-testid="first-name"]', userData.firstName);
    await this.fillInput('input[name="last_name"], [data-testid="last-name"]', userData.lastName);
    await this.selectOption('select[name="role"], [data-testid="role-select"]', userData.role);
    
    if (userData.school) {
      await this.fillInput('input[name="school"], [data-testid="school"]', userData.school);
    }
    
    if (userData.specialization) {
      await this.fillInput('input[name="specialization"], [data-testid="specialization"]', userData.specialization);
    }
    
    if (userData.isActive !== undefined) {
      const checkbox = this.isActiveCheckbox;
      if (userData.isActive) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    }
    
    if (userData.isStaff !== undefined) {
      const checkbox = this.isStaffCheckbox;
      if (userData.isStaff) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    }
    
    if (userData.isSuperuser !== undefined) {
      const checkbox = this.isSuperuserCheckbox;
      if (userData.isSuperuser) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    }
  }

  async saveUser(): Promise<void> {
    await this.saveUserButton.click();
    await this.waitForPageLoad();
  }

  async cancelUserForm(): Promise<void> {
    await this.cancelUserButton.click();
    await this.waitForPageLoad();
  }

  // Google emails management
  async clickAddEmail(): Promise<void> {
    await this.addEmailButton.click();
    await this.waitForPageLoad();
  }

  async addGoogleEmail(email: string): Promise<void> {
    await this.fillInput('input[name="email"], input[type="email"], [data-testid="email-input"]', email);
    await this.saveEmailButton.click();
    await this.waitForPageLoad();
  }

  async clickDeleteEmail(): Promise<void> {
    await this.deleteEmailButton.first().click();
    await this.waitForPageLoad();
  }

  // Bulk actions
  async selectAllUsers(): Promise<void> {
    await this.selectAllCheckbox.check();
  }

  async selectBulkAction(action: string): Promise<void> {
    await this.selectOption('select[name="bulk-action"], [data-testid="bulk-action"]', action);
  }

  async applyBulkAction(): Promise<void> {
    await this.applyBulkActionButton.click();
    await this.waitForPageLoad();
  }

  // Validations
  async expectToBeOnAdminPage(): Promise<void> {
    await this.expectUrlToContain('/admin');
    await this.expectElementToBeVisible('.admin-tabs, [data-testid="admin-tabs"]');
  }

  async expectUsersTabToBeActive(): Promise<void> {
    await this.expectElementToBeVisible('.users-list, [data-testid="users-list"]');
  }

  async expectEventsTabToBeActive(): Promise<void> {
    await this.expectElementToBeVisible('.events-list, [data-testid="events-list"]');
  }

  async expectGoogleEmailsTabToBeActive(): Promise<void> {
    await this.expectElementToBeVisible('.google-emails-list, [data-testid="google-emails-list"]');
  }

  async expectUserFormToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('form, [data-testid="user-form"]');
  }

  async expectStatisticsCardsToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible('.statistics-cards, [data-testid="statistics-cards"]');
  }

  async expectTotalUsersToBe(count: number): Promise<void> {
    const card = this.totalUsersCard;
    await expect(card).toContainText(count.toString());
  }

  async expectTotalEventsToBe(count: number): Promise<void> {
    const card = this.totalEventsCard;
    await expect(card).toContainText(count.toString());
  }

  async expectUserToBeVisible(username: string): Promise<void> {
    await this.expectElementToContainText('.user-row, [data-testid="user-row"]', username);
  }

  async expectEmailToBeVisible(email: string): Promise<void> {
    await this.expectElementToContainText('.google-emails-list, [data-testid="google-emails-list"]', email);
  }

  // Helper methods
  async getUserCount(): Promise<number> {
    const userRows = this.page.locator('.user-row, [data-testid="user-row"]');
    return await userRows.count();
  }

  async getEmailCount(): Promise<number> {
    const emailRows = this.page.locator('.email-row, [data-testid="email-row"]');
    return await emailRows.count();
  }

  async waitForAdminPageLoad(): Promise<void> {
    await this.waitForPageLoad();
    await this.expectToBeOnAdminPage();
  }
}


