import { test as base } from '@playwright/test';

/**
 * Custom test fixture that blocks analytics requests.
 * Prevents e2e test runs from polluting Umami data.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/ohmydesk-analytics.bodrovphone.workers.dev/**', (route) =>
      route.abort(),
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';
