import { test, expect } from './fixtures';

/**
 * Revenue suite — dashboard stats, expenses CRUD, chart.
 *
 * Runs in the `app` project (authenticated as bodrovphone+e2e@gmail.com, org: e2e-testspace).
 *
 * State hygiene:
 *   - Expenses created during tests are deleted within the same test.
 *
 * Selector notes (from ARIA snapshot):
 *   - Stats labels ("Net Profit", "Occupancy") appear both in chart checkboxes
 *     and stats cards — use .first() to avoid strict mode violations
 *   - Category selector is a Radix combobox, not a native select
 *   - Amount inputs render as spinbutton role
 *   - Expense modal is a dialog with heading "Add Expense"
 */

const REVENUE_URL = '/e2e-testspace/revenue';

test.describe('Revenue — page load', () => {
  test('dashboard loads with heading and stats cards', async ({ page }) => {
    await page.goto(REVENUE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Revenue Dashboard' })).toBeVisible({ timeout: 10_000 });

    // Stats cards render (use .first() — labels also appear as chart checkbox labels)
    await expect(page.getByText('Net Profit').first()).toBeVisible();
    await expect(page.getByText('Desk Revenue').first()).toBeVisible();
    await expect(page.getByText('Occupancy').first()).toBeVisible();
  });

  test('stats cards display currency values', async ({ page }) => {
    await page.goto(REVENUE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Revenue Dashboard' })).toBeVisible({ timeout: 10_000 });

    // Values should contain the EUR symbol (€) since test org uses EUR
    await expect(page.getByText('€').first()).toBeVisible();
  });
});

test.describe('Revenue — expenses', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REVENUE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Revenue Dashboard' })).toBeVisible({ timeout: 10_000 });
  });

  test('add and delete expense', async ({ page }) => {
    // Use unique description to avoid conflicts with leftover data from previous runs
    const desc = `E2E expense ${Date.now()}`;

    // Click "Add Expense" button
    await page.getByRole('button', { name: /Add Expense/ }).click();

    // Modal opens (dialog role)
    const dialog = page.getByRole('dialog', { name: 'Add Expense' });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill amount
    await dialog.getByRole('spinbutton', { name: /Amount/ }).fill('42.50');

    // Select category via Radix combobox
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: /Rent/ }).click();

    // Set date to today
    const today = new Date().toISOString().split('T')[0];
    await dialog.getByLabel('Date *').fill(today);

    // Description
    await dialog.getByLabel('Description (Optional)').fill(desc);

    // Submit
    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Expand the expenses list (collapsed by default)
    await page.getByRole('button', { name: /Expenses \(/ }).click();

    // Our expense should appear
    await expect(page.getByText(desc)).toBeVisible({ timeout: 10_000 });

    // Delete: the trash button is in the same row as our expense description.
    // Row structure: [icon + date/category/desc] [amount + edit-btn + delete-btn]
    // Navigate from desc text up to the row, then find the last button (delete/trash).
    const row = page.getByText(desc).locator('..').locator('..').locator('..');
    await row.locator('button').last().click();

    // Expense removed
    await expect(page.getByText(desc)).not.toBeVisible({ timeout: 5_000 });
  });

  test('recurring expenses modal opens', async ({ page }) => {
    await page.getByRole('button', { name: /Recurring/ }).click();

    // Modal opens with title
    const dialog = page.getByRole('dialog', { name: 'Manage Recurring Expenses' });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Form fields visible (spinbuttons for Amount and Day of Month)
    await expect(dialog.getByRole('spinbutton', { name: /Amount/ })).toBeVisible();
    await expect(dialog.getByRole('spinbutton', { name: /Day of Month/ })).toBeVisible();

    // Close modal
    await dialog.getByRole('button', { name: 'Close' }).first().click();
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Revenue — chart', () => {
  test('revenue chart renders', async ({ page }) => {
    await page.goto(REVENUE_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Revenue Dashboard' })).toBeVisible({ timeout: 10_000 });

    // Chart card has title containing "Revenue Trend"
    await expect(page.getByText('Revenue Trend').first()).toBeVisible();
  });
});
