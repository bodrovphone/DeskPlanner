import { test, expect } from './fixtures';

/**
 * Waiting List suite — page load, add entry, verify display, delete entry, empty state.
 *
 * Runs in the `app` project (authenticated as bodrovphone+e2e@gmail.com, org: e2e-testspace).
 *
 * State hygiene:
 *   - Entries created during tests are deleted within the same test.
 *   - Uses Date.now() in names to avoid collisions across retries.
 */

const WAITING_LIST_URL = '/e2e-testspace/waiting-list/';

test.describe('Waiting List — page load', () => {
  test('page loads with heading and add button', async ({ page }) => {
    await page.goto(WAITING_LIST_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Waiting List' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Person' })).toBeVisible();
  });
});

test.describe('Waiting List — add and delete entry', () => {
  test('adds an entry, verifies it appears, then deletes it', async ({ page }) => {
    await page.goto(WAITING_LIST_URL);
    await page.waitForLoadState('networkidle');

    const uniqueName = `E2E Waiter ${Date.now()}`;
    const dates = 'Apr 1-5, 2026';
    const contact = 'e2e@test.com';
    const notes = 'Prefers window seat';

    // Open modal
    await page.getByRole('button', { name: 'Add Person' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Add to Waiting List' })).toBeVisible();

    // Fill form
    await page.getByLabel('Name *').fill(uniqueName);
    await page.getByLabel('Preferred Dates *').fill(dates);
    await page.getByLabel('Contact Info').fill(contact);
    await page.getByLabel('Notes').fill(notes);

    // Submit
    await page.getByRole('button', { name: 'Add to List' }).click();

    // Dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });

    // Toast confirms — wait for it to appear then disappear to avoid strict mode issues
    await expect(page.getByText('Added to Waiting List', { exact: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Added to Waiting List', { exact: true })).not.toBeVisible({ timeout: 10_000 });

    // Entry appears in the list
    await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible();

    // Delete the entry — target the specific entry card (border + rounded-lg + p-4 + bg-gray-50)
    const entryCard = page.locator('div.p-4.bg-gray-50').filter({ has: page.getByRole('heading', { name: uniqueName }) });
    await entryCard.getByRole('button').click();

    // Toast confirms removal
    await expect(page.getByText('Removed from Waiting List', { exact: true })).toBeVisible({ timeout: 5_000 });

    // Entry is gone
    await expect(page.getByRole('heading', { name: uniqueName })).not.toBeVisible();
  });
});

test.describe('Waiting List — empty state', () => {
  test('shows empty state message when no entries exist', async ({ page }) => {
    await page.goto(WAITING_LIST_URL);
    await page.waitForLoadState('networkidle');

    // If entries exist from other sources, this test is informational.
    // Check that either entries render OR the empty state shows.
    const emptyMsg = page.getByText('No one on the waiting list yet');
    const entryCards = page.locator('.border.rounded-lg').filter({ has: page.locator('.lucide-user') });

    // One of the two must be visible
    const hasEntries = await entryCards.count() > 0;
    if (!hasEntries) {
      await expect(emptyMsg).toBeVisible();
      await expect(page.getByText('Add people who are interested in booking desks')).toBeVisible();
    }
  });
});

test.describe('Waiting List — modal validation', () => {
  test('Add to List button is disabled when required fields are empty', async ({ page }) => {
    await page.goto(WAITING_LIST_URL);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Add Person' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Both required fields empty → button disabled
    await expect(page.getByRole('button', { name: 'Add to List' })).toBeDisabled();

    // Fill only name → still disabled
    await page.getByLabel('Name *').fill('Test');
    await expect(page.getByRole('button', { name: 'Add to List' })).toBeDisabled();

    // Clear name, fill only dates → still disabled
    await page.getByLabel('Name *').clear();
    await page.getByLabel('Preferred Dates *').fill('Next week');
    await expect(page.getByRole('button', { name: 'Add to List' })).toBeDisabled();

    // Fill both → enabled
    await page.getByLabel('Name *').fill('Test');
    await expect(page.getByRole('button', { name: 'Add to List' })).toBeEnabled();

    // Cancel without saving
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
