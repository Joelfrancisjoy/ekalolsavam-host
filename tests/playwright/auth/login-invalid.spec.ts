import { test, expect } from '@playwright/test';

/**
 * Auth: Invalid Email/Password Login (Negative)
 * Preconditions:
 * - Frontend dev server running at http://localhost:3000
 * - Works regardless of mock/real backend because login API is stubbed
 */

test.describe('Auth: Invalid email/password (negative)', () => {
  test('shows error and stays on /login without tokens', async ({ page, context }) => {
    await test.step('Navigate to login page', async () => {
      await context.addInitScript(() => window.localStorage.clear());
      await page.route('**/api/auth/login/**', async (route) => {
        const method = route.request().method();
        if (method === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'POST, OPTIONS'
          }});
        }
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ error: 'Invalid email or password' })
        });
      });
      await page.goto('/login');
      await expect(page.locator('form')).toBeVisible();
    });

    await test.step('Enter username (invalid email format for app rules)', async () => {
      // Triggers client-side Gmail validation error
      await page.locator('input[name="username"]').fill('admin@example.com');
    });

    await test.step('Enter invalid password', async () => {
      await page.locator('input[name="password"]').fill('ThisIsTheWrongPassword');
    });

    await test.step('Click Login', async () => {
      await page.locator('button[type="submit"]').click();
    });

    await test.step('Verify error message', async () => {
      const banner = page.locator('p.text-red-700:has-text("Please provide a valid Gmail address")');
      const inlineMsg = page.locator('p.text-red-600:has-text("Please provide a valid Gmail address")');
      let ok = true;
      try {
        await expect(banner).toBeVisible();
      } catch {
        ok = false;
      }
      if (!ok) {
        await expect(inlineMsg).toBeVisible();
      }
    });

    await test.step('Verify no redirection', async () => {
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step('Verify tokens are not stored', async () => {
      const tokens = await page.evaluate(() => ({
        access: localStorage.getItem('access_token'),
        refresh: localStorage.getItem('refresh_token'),
      }));
      expect(tokens.access).toBeFalsy();
      expect(tokens.refresh).toBeFalsy();
    });
  });
});
