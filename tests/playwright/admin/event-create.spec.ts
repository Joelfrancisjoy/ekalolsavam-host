import { test, expect } from '@playwright/test';

/**
 * Admin: Create a new event via Event Management
 * Preconditions:
 * - Frontend dev server running at http://localhost:3000
 */

test.describe('Admin: Event creation', () => {
  test('creates event and shows it in the Events list', async ({ page, context }) => {
    const createdEvents: any[] = [];
    // Login as admin (seed tokens; works regardless of backend)
    await test.step('Login as admin', async () => {
      await context.addInitScript(() => {
        window.localStorage.clear();
        window.localStorage.setItem('access_token', 'mock_access_token');
        window.localStorage.setItem('refresh_token', 'mock_refresh_token');
        try { window.localStorage.setItem('last_login_payload', JSON.stringify({ user: { role: 'admin', username: 'admin' } })); } catch {}
      });
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
          if (url.pathname.endsWith('/api/events/venues/')) {
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ id: 1, name: 'Main Hall' }]) });
          }
          if (url.pathname.endsWith('/api/events/') || url.pathname.endsWith('/api/events')) {
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(createdEvents) });
          }
          // Other GETs return empty
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([]) });
        }
        if (method === 'POST') {
          if (url.pathname.endsWith('/api/events/') || url.pathname.endsWith('/api/events')) {
            const payload = (() => { try { return req.postDataJSON(); } catch { return {}; } })();
            const id = createdEvents.length + 1;
            const ev = { id, ...payload };
            createdEvents.push(ev);
            return route.fulfill({ status: 201, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(ev) });
          }
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true }) });
        }
        if (method === 'PATCH') {
          const m = url.pathname.match(/\/api\/events\/(\d+)\//);
          if (m) {
            const id = Number(m[1]);
            const payload = (() => { try { return req.postDataJSON(); } catch { return {}; } })();
            const idx = createdEvents.findIndex(e => e.id === id);
            if (idx >= 0) createdEvents[idx] = { ...createdEvents[idx], ...payload };
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(createdEvents[idx] || { id, ...payload }) });
          }
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true }) });
        }
        if (method === 'DELETE') {
          return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true }) });
      });
      await page.route('**/api/auth/users/**', async (route) => {
        const req = route.request();
        const method = req.method();
        const url = new URL(req.url());
        if (method === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET, OPTIONS'
          }});
        }
        const list = [
          { id: 1, username: 'admin', role: 'admin' },
          { id: 2, username: 'judge1', role: 'judge' },
          { id: 3, username: 'judge2', role: 'judge' },
          { id: 4, username: 'vol1', role: 'volunteer' }
        ];
        const role = url.searchParams.get('role');
        const data = role ? list.filter(u => u.role === role) : list;
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
      });
      // Backend stubs to avoid axios 401 redirects from scoreService and refresh
      await page.route('**/api/scores/**', async (route) => {
        const method = route.request().method();
        if (method === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'GET, POST, OPTIONS'
          }});
        }
        if (method === 'GET') {
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([]) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true }) });
      });
      await page.route('**/api/token/refresh/**', async (route) => {
        const method = route.request().method();
        if (method === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'POST, OPTIONS'
          }});
        }
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ access: 'refreshed_token' }) });
      });
      // Ensure we are at /admin; recover if redirected to /login
      await page.goto('/admin');
      if ((await page.url()).endsWith('/login')) {
        await page.evaluate(() => {
          localStorage.setItem('access_token', 'mock_access_token');
          localStorage.setItem('refresh_token', 'mock_refresh_token');
        });
        await page.goto('/admin');
      }
      await expect(page).toHaveURL(/\/admin/);
    });

    // Navigate to Event Management (direct route to avoid ambiguous tile click)
    await test.step('Open Event Management', async () => {
      // Attempt direct route
      await page.goto('/admin/events');
      await page.locator('div.animate-spin').first().waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});

      const newEventBtn = page.getByRole('button', { name: /New Event/i }).or(page.locator('button:has-text("New Event")'));
      const eventHeadingByRole = page.getByRole('heading', { name: /Event Management/i });
      const eventHeadingByText = page.locator('h2:has-text("Event Management")');

      let onEvents = false;
      try {
        await Promise.race([
          eventHeadingByRole.waitFor({ state: 'visible', timeout: 5000 }),
          eventHeadingByText.waitFor({ state: 'visible', timeout: 5000 }),
          newEventBtn.waitFor({ state: 'visible', timeout: 5000 })
        ]);
        onEvents = true;
      } catch {
        onEvents = false;
      }

      if (!onEvents) {
        // Fallback via dashboard tile
        await page.goto('/admin');
        if ((await page.url()).endsWith('/login')) {
          await page.evaluate(() => {
            localStorage.setItem('access_token', 'mock_access_token');
            localStorage.setItem('refresh_token', 'mock_refresh_token');
          });
          await page.goto('/admin');
        }
        await expect(page).toHaveURL(/\/admin$/);
        await page.getByText('Event Management', { exact: false }).first().click();
        await page.locator('div.animate-spin').first().waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
      }

      await expect(newEventBtn).toBeVisible({ timeout: 20000 });
    });

    // Open Create form
    await test.step('Open Create Event form', async () => {
      await page.getByRole('button', { name: /New Event/i }).click();
      await expect(page.getByRole('heading', { name: /Create New Event/i })).toBeVisible({ timeout: 20000 });
    });

    // Fill the form
    const uniqueDesc = `E2E Auto ${Date.now()}`;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    await test.step('Fill required fields', async () => {
      // Category -> Music
      await page.getByRole('button', { name: /Music/i }).click();

      // Name
      await page.locator('select[name="name"]').selectOption({ label: 'Light Music' });

      // Description
      await page.locator('textarea[name="description"]').fill(uniqueDesc);

      // Date/Time
      await page.locator('input[name="date"]').fill(dateStr);
      await page.locator('input[name="start_time"]').fill('10:00');
      await page.locator('input[name="end_time"]').fill('11:00');

      // Venue
      await page.locator('select[name="venue"]').selectOption('1');

      // Judges (first multi-select on page)
      const judgesSelect = page.locator('select[multiple]').first();
      await judgesSelect.selectOption('2');

      // Max participants
      await page.locator('input[name="max_participants"]').fill('50');

      // Publish checkbox
      const publish = page.locator('input[name="is_published"]');
      if (!(await publish.isChecked())) {
        await publish.check();
      }
    });

    // Submit and verify
    await test.step('Submit and verify success', async () => {
      await page.locator('form').getByRole('button', { name: /Create Event/i }).click();
      await expect(page.getByText('Event created successfully', { exact: false })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Verify event appears in list', async () => {
      await expect(page.getByText(uniqueDesc, { exact: false })).toBeVisible({ timeout: 10000 });
    });
  });
});
