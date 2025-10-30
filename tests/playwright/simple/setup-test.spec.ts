import { test, expect } from '@playwright/test';

test.describe('Setup Verification', () => {
  test('should connect to frontend server', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/E-Kalolsavam|React App/);
  });

  test('should connect to backend API', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/');
    expect(response.status()).toBeLessThan(500);
  });

  test('should display login page', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await expect(page.locator('input[type="email"], input[name="username"]')).toBeVisible();
  });
});


