import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

// Extend basic test by providing "loginPage" and "dashboardPage" fixtures
export const test = base.extend<{
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
}>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect } from '@playwright/test';


