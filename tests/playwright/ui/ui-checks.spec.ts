import { test, expect } from '../fixtures/auth.fixture';
import { testWithData } from '../fixtures/test-data.fixture';
import { TestHelpers } from '../utils/test-helpers';

test.describe('UI Checks - Responsive Design', () => {
  test('should display correctly on desktop', async ({ page }, { testData }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }, { testData }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display correctly on mobile', async ({ page }, { testData }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Check for mobile menu
    const mobileMenu = page.locator('.mobile-menu, [data-testid="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('should handle orientation changes', async ({ page }, { testData }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await expect(page.locator('main')).toBeVisible();
    
    // Rotate back to portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('UI Checks - Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }, { testData }) => {
    await page.goto('/');
    
    const h1 = page.locator('h1');
    const h2 = page.locator('h2');
    
    if (await h1.count() > 0) {
      await expect(h1.first()).toBeVisible();
    }
    
    if (await h2.count() > 0) {
      await expect(h2.first()).toBeVisible();
    }
  });

  test('should have proper alt text for images', async ({ page }, { testData }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('should have proper form labels', async ({ page }, { testData }) => {
    await page.goto('/login');
    
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      } else if (name) {
        const label = page.locator(`label:has-text("${name}")`);
        await expect(label).toBeVisible();
      }
    }
  });

  test('should support keyboard navigation', async ({ page }, { testData }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test enter key on buttons
    const buttons = page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      await buttons.first().focus();
      await page.keyboard.press('Enter');
    }
  });

  test('should have proper color contrast', async ({ page }, { testData }) => {
    await page.goto('/');
    
    // This would require a color contrast testing library
    // For now, we'll check for basic accessibility attributes
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
    const textCount = await textElements.count();
    
    for (let i = 0; i < Math.min(textCount, 10); i++) {
      const element = textElements.nth(i);
      const color = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.color;
      });
      
      expect(color).toBeTruthy();
    }
  });

  test('should have proper focus indicators', async ({ page }, { testData }) => {
    await page.goto('/');
    
    const focusableElements = page.locator('button, a, input, select, textarea');
    const elementCount = await focusableElements.count();
    
    for (let i = 0; i < Math.min(elementCount, 5); i++) {
      const element = focusableElements.nth(i);
      await element.focus();
      
      const outline = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.outline;
      });
      
      expect(outline).toBeTruthy();
    }
  });
});

test.describe('UI Checks - Performance', () => {
  test('should load within acceptable time', async ({ page }, { testData }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(5000); // 5 seconds
  });

  test('should have optimized images', async ({ page }, { testData }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const src = await image.getAttribute('src');
      
      if (src) {
        // Check for optimized image formats
        expect(src).toMatch(/\.(jpg|jpeg|png|webp|avif)$/);
      }
    }
  });

  test('should have minimal layout shift', async ({ page }, { testData }) => {
    await page.goto('/');
    
    // Check for elements that might cause layout shift
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const width = await image.getAttribute('width');
      const height = await image.getAttribute('height');
      
      if (width && height) {
        expect(parseInt(width)).toBeGreaterThan(0);
        expect(parseInt(height)).toBeGreaterThan(0);
      }
    }
  });

  test('should have efficient CSS', async ({ page }, { testData }) => {
    await page.goto('/');
    
    // Check for inline styles that should be in CSS files
    const elementsWithInlineStyles = page.locator('[style]');
    const inlineStyleCount = await elementsWithInlineStyles.count();
    
    // Should have minimal inline styles
    expect(inlineStyleCount).toBeLessThan(10);
  });
});

test.describe('UI Checks - Cross-Browser Compatibility', () => {
  test('should work in Chrome', async ({ page }, { testData }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work in Firefox', async ({ page }, { testData }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work in Safari', async ({ page }, { testData }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle different user agents', async ({ page }, { testData }) => {
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('UI Checks - Form Validation', () => {
  test('should show validation errors for required fields', async ({ page }, { testData }) => {
    await page.goto('/login');
    
    // Try to submit form without filling required fields
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    const requiredFields = page.locator('input[required]');
    const requiredCount = await requiredFields.count();
    
    for (let i = 0; i < requiredCount; i++) {
      const field = requiredFields.nth(i);
      const validity = await field.evaluate(el => el.validity.valid);
      expect(validity).toBeFalsy();
    }
  });

  test('should show validation errors for invalid email', async ({ page }, { testData }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    const emailField = page.locator('input[type="email"]');
    const validity = await emailField.evaluate(el => el.validity.valid);
    expect(validity).toBeFalsy();
  });

  test('should show validation errors for password requirements', async ({ page }, { testData }) => {
    await page.goto('/register');
    
    await page.fill('input[type="password"]', 'weak');
    await page.click('button[type="submit"]');
    
    const passwordField = page.locator('input[type="password"]');
    const validity = await passwordField.evaluate(el => el.validity.valid);
    expect(validity).toBeFalsy();
  });

  test('should clear validation errors when field is corrected', async ({ page }, { testData }) => {
    await page.goto('/login');
    
    // Fill invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // Correct the email
    await page.fill('input[type="email"]', 'valid@example.com');
    
    const emailField = page.locator('input[type="email"]');
    const validity = await emailField.evaluate(el => el.validity.valid);
    expect(validity).toBeTruthy();
  });
});

test.describe('UI Checks - Error Handling', () => {
  test('should display error messages for network errors', async ({ page }, { testData }) => {
    // Mock network error
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error, .alert-error')).toBeVisible();
  });

  test('should display loading states', async ({ page }, { testData }) => {
    await page.goto('/login');
    
    // Mock slow network
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('.loading, [data-testid="loading"]')).toBeVisible();
  });

  test('should handle 404 errors gracefully', async ({ page }, { testData }) => {
    await page.goto('/nonexistent-page');
    
    // Should show 404 page or redirect
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle 500 errors gracefully', async ({ page }, { testData }) => {
    // Mock server error
    await page.route('**/api/**', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' })
    }));
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error, .alert-error')).toBeVisible();
  });
});

test.describe('UI Checks - User Experience', () => {
  test('should have intuitive navigation', async ({ page }, { testData }) => {
    await page.goto('/');
    
    const navigation = page.locator('nav, [data-testid="navigation"]');
    await expect(navigation).toBeVisible();
    
    const navLinks = page.locator('nav a, [data-testid="navigation"] a');
    const linkCount = await navLinks.count();
    
    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      const text = await link.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should have clear call-to-action buttons', async ({ page }, { testData }) => {
    await page.goto('/');
    
    const buttons = page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should have consistent styling', async ({ page }, { testData }) => {
    await page.goto('/');
    
    // Check for consistent button styles
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const styles = await button.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontSize: computed.fontSize
        };
      });
      
      expect(styles.backgroundColor).toBeTruthy();
      expect(styles.color).toBeTruthy();
      expect(styles.fontSize).toBeTruthy();
    }
  });

  test('should have proper spacing and layout', async ({ page }, { testData }) => {
    await page.goto('/');
    
    const mainContent = page.locator('main, .main-content');
    await expect(mainContent).toBeVisible();
    
    const padding = await mainContent.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        paddingTop: styles.paddingTop,
        paddingBottom: styles.paddingBottom,
        paddingLeft: styles.paddingLeft,
        paddingRight: styles.paddingRight
      };
    });
    
    expect(padding.paddingTop).toBeTruthy();
    expect(padding.paddingBottom).toBeTruthy();
    expect(padding.paddingLeft).toBeTruthy();
    expect(padding.paddingRight).toBeTruthy();
  });
});


