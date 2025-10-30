import { test as base } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

export const test = base.extend<{
  testHelpers: TestHelpers;
}>({
  testHelpers: async ({ page }, use) => {
    const testHelpers = new TestHelpers(page);
    await use(testHelpers);
  },
});

export { expect } from '@playwright/test';


