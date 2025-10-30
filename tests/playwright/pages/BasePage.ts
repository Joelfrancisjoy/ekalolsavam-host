import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common locators
  get header(): Locator {
    return this.page.locator('header');
  }

  get footer(): Locator {
    return this.page.locator('footer');
  }

  get loadingSpinner(): Locator {
    return this.page.locator('[data-testid="loading-spinner"]');
  }

  get errorMessage(): Locator {
    return this.page.locator('[data-testid="error-message"]');
  }

  get successMessage(): Locator {
    return this.page.locator('[data-testid="success-message"]');
  }

  // Common actions
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLoadingToComplete(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  async waitForElement(selector: string, timeout: number = 5000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  async clickElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.click();
  }

  async fillInput(selector: string, value: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.fill(value);
  }

  async selectOption(selector: string, value: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.selectOption(value);
  }

  async getText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return await element.textContent() || '';
  }

  async isVisible(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    return await element.isVisible();
  }

  async isEnabled(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    return await element.isEnabled();
  }

  // Navigation
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  // Assertions
  async expectUrlToContain(text: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(text));
  }

  async expectElementToBeVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementToBeHidden(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async expectElementToContainText(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async expectElementToHaveValue(selector: string, value: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveValue(value);
  }
}


