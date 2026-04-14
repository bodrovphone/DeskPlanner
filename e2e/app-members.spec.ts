import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * Members suite — member management, flex balance, and booking autocomplete.
 *
 * Runs in the `app` Playwright project (authenticated, test org context).
 * Test org: e2e-testspace
 *
 * Pre-requisite: reset_e2e_test_data RPC seeds two test clients:
 *   - 99901 "E2E Flex Member"      — flex_active, 10/10 balance
 *   - 99902 "E2E Exhausted Member"  — flex_active, 0/5 balance
 *
 * See docs/roadmap/e2e-members-flex.md for the full test plan.
 *
 * Note: member names render as <input value="..."> for inline editing.
 * We use XPath @value to match since CSS [value=] reads the HTML attribute
 * while React sets the DOM property. XPath reads the attribute that React
 * syncs via setAttribute.
 *
 * IMPORTANT: Test ordering matters. Read-only tests (page load, search,
 * flex balance, autocomplete) run first. Mutating tests (CRUD) run last
 * to avoid polluting state for other tests within the same suite run.
 */

const MEMBERS_URL = '/e2e-testspace/members/';
const CALENDAR_URL = '/e2e-testspace/calendar/';

/**
 * Find a table row whose name input contains the given text.
 * Returns a locator for the <tr> element.
 */
function rowByName(page: Page, name: string) {
  return page.locator('tbody tr').filter({
    has: page.locator(`xpath=.//input[@placeholder="Enter name..." and contains(@value, "${name}")]`),
  });
}

// ── Page load ─────────────────────────────────────────────────────────────────

test.describe('Members — page load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBERS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('members page renders with heading and add button', { tag: ['@smoke'] }, async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Add Member' })).toBeVisible();
  });

  test('members table shows Name, Contact, Email, and Flex Balance columns', async ({ page }) => {
    await expect(page.locator('th', { hasText: 'Name' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('th', { hasText: 'Contact' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Email' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Flex Balance' })).toBeVisible();
  });

  test('seeded flex member is visible in the table', async ({ page }) => {
    await expect(rowByName(page, 'E2E Flex Member')).toBeVisible({ timeout: 10_000 });
  });

  test('seeded exhausted member is visible in the table', async ({ page }) => {
    await expect(rowByName(page, 'E2E Exhausted Member')).toBeVisible({ timeout: 10_000 });
  });
});

// ── Search ────────────────────────────────────────────────────────────────────

test.describe('Members — search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBERS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('search filters members by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by name or contact...');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill('E2E Flex Member');
    await page.waitForTimeout(300);

    await expect(rowByName(page, 'E2E Flex Member')).toBeVisible();
    // Exhausted member should be filtered out
    await expect(rowByName(page, 'E2E Exhausted Member')).not.toBeVisible();
  });

  test('non-matching search shows empty state', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by name or contact...');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill('zzzznonexistent');
    await page.waitForTimeout(300);

    await expect(page.getByText('No members matching')).toBeVisible({ timeout: 3_000 });
  });
});

// ── Flex balance ──────────────────────────────────────────────────────────────

test.describe('Members — flex balance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBERS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('active flex member shows balance', { tag: ['@smoke'] }, async ({ page }) => {
    // The flex member row should show the balance as a clickable button (e.g. 10/10 or 9/10)
    const flexMemberRow = rowByName(page, 'E2E Flex Member');
    await expect(flexMemberRow.getByText(/\d+\/10/)).toBeVisible({ timeout: 10_000 });
  });

  test('exhausted member shows 0/5 balance', async ({ page }) => {
    await expect(page.getByText('0/5')).toBeVisible({ timeout: 10_000 });
  });

  test('clicking balance opens reset dialog', async ({ page }) => {
    const flexMemberRow = rowByName(page, 'E2E Flex Member');
    const balanceBtn = flexMemberRow.getByText(/\d+\/10/);
    await expect(balanceBtn).toBeVisible({ timeout: 10_000 });
    await balanceBtn.click();

    await expect(page.getByText('Reset flex plan')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText(/Reset the flex plan for/)).toBeVisible();

    // Cancel to avoid mutating test data
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
  });
});

// ── Booking autocomplete ──────────────────────────────────────────────────────

test.describe('Members — booking autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CALENDAR_URL);
    await page.waitForLoadState('networkidle');
  });

  test('typing member name in booking modal shows autocomplete', async ({ page }) => {
    // Switch to week view for cell access
    await page.getByRole('button', { name: 'Week' }).click();
    await page.waitForTimeout(300);

    const availableCell = page.locator('.desk-available').first();
    await expect(availableCell).toBeVisible({ timeout: 10_000 });
    await availableCell.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Type part of the seeded member name
    const nameInput = page.getByPlaceholder('Enter name');
    await nameInput.fill('E2E Flex');

    // Autocomplete dropdown should appear (either matching member or "Create client" option)
    const dropdown = page.locator('.absolute.z-50');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // Close modal
    await page.keyboard.press('Escape');
  });
});

// ── CRUD (mutating — runs last) ──────────────────────────────────────────────

test.describe('Members — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBERS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('add member creates a new row with focused name input', async ({ page }) => {
    const rowCountBefore = await page.locator('tbody tr').count();

    await page.getByRole('button', { name: 'Add Member' }).click();

    // New row should appear with an empty focused input
    const nameInput = page.getByPlaceholder('Enter name...').first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });

    await nameInput.fill(`E2E Temp ${Date.now()}`);
    // Wait for debounce save
    await page.waitForTimeout(1_500);
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 5_000 });

    // Verify row count increased
    const rowCountAfter = await page.locator('tbody tr').count();
    expect(rowCountAfter).toBeGreaterThan(rowCountBefore);
    // Cleanup happens via reset_e2e_test_data RPC on next test run
  });

  test('delete member shows confirmation dialog and cancel works', async ({ page }) => {
    const deleteBtn = page.locator('button[title="Delete member"]').first();
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.click();

    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('Delete member')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
  });
});
