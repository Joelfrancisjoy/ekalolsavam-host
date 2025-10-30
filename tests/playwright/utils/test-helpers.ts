import { Page, expect } from '@playwright/test';

export class TestHelpers {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Screenshot utilities
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `screenshots/${name}.png`, 
      fullPage: true 
    });
  }

  async takeElementScreenshot(selector: string, name: string): Promise<void> {
    const element = this.page.locator(selector);
    await element.screenshot({ 
      path: `screenshots/${name}.png` 
    });
  }

  // Wait utilities
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForElement(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.locator(selector).waitFor({ 
      state: 'visible', 
      timeout 
    });
  }

  async waitForElementToBeHidden(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.locator(selector).waitFor({ 
      state: 'hidden', 
      timeout 
    });
  }

  async waitForText(text: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(`text=${text}`, { timeout });
  }

  // Form utilities
  async fillForm(formData: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(formData)) {
      await this.page.locator(selector).fill(value);
    }
  }

  async clearForm(selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      await this.page.locator(selector).clear();
    }
  }

  async selectDropdownOption(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).selectOption(value);
  }

  async checkCheckbox(selector: string): Promise<void> {
    await this.page.locator(selector).check();
  }

  async uncheckCheckbox(selector: string): Promise<void> {
    await this.page.locator(selector).uncheck();
  }

  // Navigation utilities
  async navigateAndWait(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForNetworkIdle();
  }

  async goBackAndWait(): Promise<void> {
    await this.page.goBack();
    await this.waitForNetworkIdle();
  }

  async refreshAndWait(): Promise<void> {
    await this.page.reload();
    await this.waitForNetworkIdle();
  }

  // Assertion utilities
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

  async expectElementToBeEnabled(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeEnabled();
  }

  async expectElementToBeDisabled(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeDisabled();
  }

  async expectElementToBeChecked(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeChecked();
  }

  async expectElementToBeUnchecked(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeUnchecked();
  }

  // Count utilities
  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  async expectElementCountToBe(selector: string, count: number): Promise<void> {
    await expect(this.page.locator(selector)).toHaveCount(count);
  }

  // Text utilities
  async getText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  async getTexts(selector: string): Promise<string[]> {
    const elements = this.page.locator(selector);
    const count = await elements.count();
    const texts: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = await elements.nth(i).textContent();
      if (text) texts.push(text);
    }
    
    return texts;
  }

  // Click utilities
  async clickElement(selector: string): Promise<void> {
    await this.page.locator(selector).click();
  }

  async clickElementByText(text: string): Promise<void> {
    await this.page.locator(`text=${text}`).click();
  }

  async doubleClickElement(selector: string): Promise<void> {
    await this.page.locator(selector).dblclick();
  }

  async rightClickElement(selector: string): Promise<void> {
    await this.page.locator(selector).click({ button: 'right' });
  }

  // Keyboard utilities
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  // File upload utilities
  async uploadFile(selector: string, filePath: string): Promise<void> {
    await this.page.setInputFiles(selector, filePath);
  }

  // Modal utilities
  async acceptDialog(): Promise<void> {
    this.page.on('dialog', dialog => dialog.accept());
  }

  async dismissDialog(): Promise<void> {
    this.page.on('dialog', dialog => dialog.dismiss());
  }

  async getDialogMessage(): Promise<string> {
    return new Promise((resolve) => {
      this.page.on('dialog', dialog => {
        resolve(dialog.message());
      });
    });
  }

  // Cookie utilities
  async setCookie(name: string, value: string, domain?: string): Promise<void> {
    await this.page.context().addCookies([{
      name,
      value,
      domain: domain || 'localhost',
      path: '/',
    }]);
  }

  async getCookie(name: string): Promise<string | null> {
    const cookies = await this.page.context().cookies();
    const cookie = cookies.find(c => c.name === name);
    return cookie ? cookie.value : null;
  }

  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  // Local storage utilities
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(({ key, value }) => {
      localStorage.setItem(key, value);
    }, { key, value });
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => {
      return localStorage.getItem(key);
    }, key);
  }

  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
  }

  // Session storage utilities
  async setSessionStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(({ key, value }) => {
      sessionStorage.setItem(key, value);
    }, { key, value });
  }

  async getSessionStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => {
      return sessionStorage.getItem(key);
    }, key);
  }

  async clearSessionStorage(): Promise<void> {
    await this.page.evaluate(() => {
      sessionStorage.clear();
    });
  }

  // Performance utilities
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForNetworkIdle();
    return Date.now() - startTime;
  }

  async getPageMetrics(): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
  }> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      };
    });
  }

  // Accessibility utilities
  async checkA11y(): Promise<void> {
    // This would integrate with axe-core or similar accessibility testing
    // For now, we'll just check for basic accessibility attributes
    const images = this.page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      if (!alt) {
        console.warn(`Image at index ${i} is missing alt attribute`);
      }
    }
  }

  // Data utilities
  async generateRandomEmail(): Promise<string> {
    const timestamp = Date.now();
    return `test-${timestamp}@example.com`;
  }

  async generateRandomString(length: number = 8): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateRandomNumber(min: number = 1, max: number = 100): Promise<number> {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}


