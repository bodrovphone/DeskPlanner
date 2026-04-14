import { test, expect } from './fixtures';

/**
 * Plans settings suite — minimal smoke coverage.
 *
 * Route: /:orgSlug/plans  (SettingsPlansPage)
 * Contains: Day Pass card + Flex Plan card.
 * SettingsPlansPage returns null until currentOrg loads — use longer timeouts.
 *
 * Runs in the `app` Playwright project (authenticated, org: e2e-testspace).
 */

const PLANS_URL = '/e2e-testspace/plans/';

test.describe('Plans — page load', { tag: ['@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLANS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('plans page renders with heading and both plan cards', async ({ page }) => {
    // SettingsPlansPage renders null until currentOrg loads
    await expect(page.getByRole('heading', { name: 'Plans' })).toBeVisible({ timeout: 25_000 });

    // Day Pass card
    await expect(page.getByText('Day Pass')).toBeVisible();

    // Flex Plan card
    await expect(page.getByText('Flex Plan')).toBeVisible();
  });
});

test.describe('Plans — day pass card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLANS_URL);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: 'Plans' }).waitFor({ state: 'visible', timeout: 25_000 });
  });

  test('day pass price input is editable', async ({ page }) => {
    // DayPassPlanCard renders a price input (spinbutton role = number input)
    const priceInput = page.getByRole('spinbutton').first();
    await expect(priceInput).toBeVisible({ timeout: 10_000 });
    await expect(priceInput).not.toBeDisabled();
  });
});

test.describe('Plans — flex plan card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLANS_URL);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: 'Plans' }).waitFor({ state: 'visible', timeout: 25_000 });
  });

  test('flex plan card shows days and price fields', async ({ page }) => {
    const flexCard = page.locator('div').filter({ has: page.getByText('Flex Plan') }).first();
    await expect(flexCard).toBeVisible({ timeout: 10_000 });

    // Both spinbutton inputs (days + price) should be in the card
    const inputs = flexCard.getByRole('spinbutton');
    await expect(inputs.first()).toBeVisible();
  });
});
