import { test as base, APIRequestContext } from '@playwright/test';
import { ApiHelpers } from '../utils/api-helpers';

export const test = base.extend<{
  apiHelpers: ApiHelpers;
}>({
  apiHelpers: async ({ request }, use) => {
    const apiHelpers = new ApiHelpers(request);
    await use(apiHelpers);
  },
});

export { expect } from '@playwright/test';


