import { test, expect } from '@playwright/test';

/**
 * Live Results Page Test
 * Verifies the Live Results page renders correctly with the expected header and sample rows.
 */

test.describe('Live Results Page', () => {
  test('should display the Live Results page with correct content', async ({ page }) => {
    // Mock the API response for live results if needed
    await page.route('**/api/**', async route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({})
      });
    });

    // Navigate to the Live Results page
    await test.step('Navigate to Live Results page', async () => {
      await page.goto('/results');
      await expect(page).toHaveTitle(/E-Kalolsavam/);
    });

    // Verify the page content
    await test.step('Verify page content', async () => {
      // Check for the main heading
      const heading = page.locator('h2').filter({ hasText: 'Live Results' });
      await expect(heading).toBeVisible();
      
      // Check for the competition title
      const competitionTitle = page.locator('h3', { hasText: 'Dance Competition Results' });
      await expect(competitionTitle).toBeVisible();
      
      // Check for the live updates section
      await expect(page.getByText('Live Updates')).toBeVisible();
      
      // Check for the last updated text
      await expect(page.getByText(/Last updated:/)).toBeVisible();
      
      // Check for the top 3 results in the live updates
      const liveResults = page.locator('.bg-gray-100.p-4.rounded');
      await expect(liveResults).toContainText('🏆 1st Place: Anjali Kumar - Score: 9.5');
      await expect(liveResults).toContainText('🥈 2nd Place: Ravi Pillai - Score: 9.2');
      await expect(liveResults).toContainText('🥉 3rd Place: Priya Nair - Score: 8.9');
      
      // Check for the "All Participants" section
      const allParticipants = page.locator('h4', { hasText: 'All Participants' });
      await expect(allParticipants).toBeVisible();
      
      // Get all table rows
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(3);
      
      // Verify first place
      const firstPlace = rows.nth(0);
      await expect(firstPlace.locator('td').nth(0)).toHaveText('1');
      await expect(firstPlace.locator('td').nth(1)).toHaveText('Anjali Kumar');
      await expect(firstPlace.locator('td').nth(2)).toHaveText('9.5');
      
      // Verify second place
      const secondPlace = rows.nth(1);
      await expect(secondPlace.locator('td').nth(0)).toHaveText('2');
      await expect(secondPlace.locator('td').nth(1)).toHaveText('Ravi Pillai');
      await expect(secondPlace.locator('td').nth(2)).toHaveText('9.2');
      
      // Verify third place
      const thirdPlace = rows.nth(2);
      await expect(thirdPlace.locator('td').nth(0)).toHaveText('3');
      await expect(thirdPlace.locator('td').nth(1)).toHaveText('Priya Nair');
      await expect(thirdPlace.locator('td').nth(2)).toHaveText('8.9');
    });
  });
});
