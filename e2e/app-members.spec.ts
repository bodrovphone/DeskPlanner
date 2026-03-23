import { test, expect } from './fixtures';

/**
 * Members suite — member management and booking autocomplete.
 *
 * Runs in the `app` Playwright project (authenticated, test org context).
 * Test org: e2e-testspace
 */

const MEMBERS_URL = '/e2e-testspace/members';
const CALENDAR_URL = '/e2e-testspace/calendar';

test.describe('Members — page load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBERS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('members page renders with heading and add button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Add Member' })).toBeVisible();
  });

  test('members table shows name, contact, and balance columns', async ({ page }) => {
    await expect(page.locator('th', { hasText: 'Name' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('th', { hasText: 'Contact' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Balance' })).toBeVisible();
  });
});

test.describe('Members — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBERS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('add member creates a new row and allows editing name', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Member' }).click();

    // New row should appear with an empty name input focused
    const nameInput = page.locator('tbody tr:first-child input').first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });

    // Type a name
    await nameInput.fill('E2E Test Member');

    // Wait for debounced save
    await page.waitForTimeout(1_500);

    // Toast should confirm save
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 3_000 });
  });

  test('delete member shows confirmation dialog', async ({ page }) => {
    // Click the first delete button
    const deleteBtn = page.locator('tbody tr button').filter({ has: page.locator('.lucide-trash-2') }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.click();

    // Confirmation dialog should appear
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('Delete member')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
  });
});

test.describe('Members — search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBERS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('search filters members by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by name or contact...');
    // Search bar may not show if 0 members — skip if not visible
    if (!(await searchInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    const rowCountBefore = await page.locator('tbody tr').count();

    // Type a query that likely won't match all
    await searchInput.fill('zzzznonexistent');
    await page.waitForTimeout(300);

    // Should show "No members matching" or fewer rows
    const noResults = page.getByText('No members matching');
    const rowCountAfter = await page.locator('tbody tr').count();
    const hasNoResults = await noResults.isVisible().catch(() => false);

    expect(hasNoResults || rowCountAfter < rowCountBefore).toBeTruthy();
  });
});

test.describe('Members — booking autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CALENDAR_URL);
    await page.waitForLoadState('networkidle');
  });

  test('typing in booking modal name field shows autocomplete suggestions', async ({ page }) => {
    // Switch to week view for reliable cell clicks
    await page.getByRole('button', { name: 'Week' }).click();
    await page.waitForTimeout(300);

    // Click an available cell
    const availableCell = page.locator('.desk-available').first();
    await expect(availableCell).toBeVisible({ timeout: 10_000 });
    await availableCell.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Type a name that should match an existing member
    const nameInput = page.getByLabel('Name *');
    await nameInput.fill('E2E');

    // Autocomplete dropdown should appear with suggestions or "Create client" option
    await expect(page.locator('.absolute.z-50')).toBeVisible({ timeout: 3_000 });

    // Close dialog
    await page.keyboard.press('Escape');
  });
});
