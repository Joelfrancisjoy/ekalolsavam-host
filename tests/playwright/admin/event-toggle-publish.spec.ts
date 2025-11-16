import { test, expect } from '@playwright/test';

/**
 * Admin: Toggle publish/unpublish of an event from Event Management
 * Preconditions:
 * - Frontend dev server running at http://localhost:3000
 */

test.describe('Admin: Toggle event publish status', () => {
  test('toggles publish and updates Published column immediately', async ({ page, context }) => {
    // In-memory events for stubbing
    const state = {
      events: [
        {
          id: 101,
          name: 'Light Music',
          description: 'Existing event for toggle test',
          category: 'music',
          date: '2025-11-13',
          start_time: '09:00',
          end_time: '10:00',
          venue: 1,
          judges: [2],
          volunteers: [],
          is_published: false,
        },
      ],
      venues: [{ id: 1, name: 'Main Hall' }],
      users: [
        { id: 1, username: 'admin', role: 'admin' },
        { id: 2, username: 'judge1', role: 'judge' },
      ],
    };

    // Seed tokens and stub APIs
    await test.step('Login as admin (seed tokens) and stub APIs', async () => {
      await context.addInitScript(() => {
        window.localStorage.clear();
        window.localStorage.setItem('access_token', 'mock_access_token');
        window.localStorage.setItem('refresh_token', 'mock_refresh_token');
      });

      // Events API including toggle-publish
      await page.route('**/api/events/**', async (route) => {
        const req = route.request();
        const method = req.method();
        const url = new URL(req.url());

        if (method === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS'
          }});
        }

        if (method === 'GET') {
          if (url.pathname.endsWith('/api/events/venues/') || url.pathname.endsWith('/api/events/venues')) {
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(state.venues) });
          }
          if (url.pathname.endsWith('/api/events/') || url.pathname.endsWith('/api/events')) {
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(state.events) });
          }
          // GET event by id
          const getMatch = url.pathname.match(/\/api\/events\/(\d+)\/?$/);
          if (getMatch) {
            const id = Number(getMatch[1]);
            const ev = state.events.find(e => e.id === id);
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(ev || null) });
          }
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([]) });
        }

        if (method === 'PATCH') {
          // toggle-publish endpoint
          const toggleMatch = url.pathname.match(/\/api\/events\/(\d+)\/toggle-publish\/?$/);
          if (toggleMatch) {
            const id = Number(toggleMatch[1]);
            const idx = state.events.findIndex(e => e.id === id);
            if (idx >= 0) {
              state.events[idx] = { ...state.events[idx], is_published: !state.events[idx].is_published };
              return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(state.events[idx]) });
            }
            return route.fulfill({ status: 404, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ detail: 'Not found' }) });
          }
          // regular patch passthrough
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true }) });
        }

        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true }) });
      });

      // Users (judges/volunteers list)
      await page.route('**/api/auth/users/**', async (route) => {
        const url = new URL(route.request().url());
        const role = url.searchParams.get('role');
        const list = role ? state.users.filter(u => u.role === role) : state.users;
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(list) });
      });

      // Token refresh / scores to avoid redirects
      await page.route('**/api/token/refresh/**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ access: 'refreshed' }) }));
      await page.route('**/api/scores/**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([]) }));

      // Go to Admin → Events
      await page.goto('/admin/events');
      await page.locator('div.animate-spin').first().waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
      await expect(page.getByRole('heading', { name: /Event Management/i, level: 2 })).toBeVisible();
    });

    await test.step('Verify initial Published=false and toggle ON', async () => {
      // Locate the row by event name/description and hit the actions publish button
      let row = page.getByRole('row').filter({ hasText: 'Light Music' }).first();
      // The column includes a switch (checkbox) and an actions button with aria-label Toggle publish
      const publishAction = row.getByRole('button', { name: 'Toggle publish' });

      // Assert initial checkbox unchecked (is_published=false)
      const publishedCheckbox = row.locator('input[type="checkbox"].sr-only').first();
      await expect(publishedCheckbox).toHaveJSProperty('checked', false);

      // Click toggle publish
      const waited = page.waitForResponse((res) => res.url().includes('/api/events/101/toggle-publish') && res.request().method() === 'PATCH');
      await publishAction.click();
      await waited;

      // Re-query row and verify checkbox is now checked
      row = page.getByRole('row').filter({ hasText: 'Light Music' }).first();
      await expect(row.locator('input[type="checkbox"].sr-only').first()).toHaveJSProperty('checked', true);
    });

    await test.step('Toggle OFF and verify Published column reverts', async () => {
      let row = page.getByRole('row').filter({ hasText: 'Light Music' }).first();
      const waited = page.waitForResponse((res) => res.url().includes('/api/events/101/toggle-publish') && res.request().method() === 'PATCH');
      await row.getByRole('button', { name: 'Toggle publish' }).click();
      await waited;
      row = page.getByRole('row').filter({ hasText: 'Light Music' }).first();
      await expect(row.locator('input[type="checkbox"].sr-only').first()).toHaveJSProperty('checked', false);
    });
  });
});
