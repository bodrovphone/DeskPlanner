import { test, expect } from './fixtures';

/**
 * Settings suite — organization config, rooms, notifications, public booking.
 *
 * Runs in the `app` project (authenticated as bodrovphone+e2e@gmail.com, org: e2e-testspace).
 *
 * State hygiene:
 *   - Tests that mutate org settings (name, public booking) restore the original
 *     value within the same test so subsequent runs start from a known state.
 *   - Room changes are tested at the staging level only (no Save) to avoid
 *     permanently adding rooms that the reset_e2e_test_data RPC doesn't clean up.
 *
 * Selector notes (from ARIA snapshot):
 *   - CardTitle renders as `generic`, NOT a heading role — use getByText
 *   - Currency buttons are "US Dollar" / "Euro", not "USD" / "EUR"
 *   - Desk count inputs are role=spinbutton, not input[type="number"]
 *   - Public booking toggle is already enabled in e2e test data
 *   - Shareable link textbox has no label — use readonly input filter
 */

// Settings was split into separate sub-routes
const SETTINGS_ORG_URL = '/e2e-testspace/organization/';
const SETTINGS_ROOMS_URL = '/e2e-testspace/rooms/';
const SETTINGS_NOTIFICATIONS_URL = '/e2e-testspace/notifications/';
const SETTINGS_INTEGRATIONS_URL = '/e2e-testspace/integrations/';

test.describe('Settings — page load', { tag: ['@smoke'] }, () => {
  test('all settings sub-pages load without errors', async ({ page }) => {
    // Settings is split into separate routes — verify each loads
    for (const [url, heading] of [
      [SETTINGS_ORG_URL, 'Organization'],
      [SETTINGS_ROOMS_URL, 'Rooms'],
      [SETTINGS_NOTIFICATIONS_URL, 'Notifications'],
      [SETTINGS_INTEGRATIONS_URL, 'Integrations'],
    ] as [string, string][]) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe('Settings — organization card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SETTINGS_ORG_URL);
    await page.waitForLoadState('networkidle');
  });

  test('space name field is editable, slug is disabled', async ({ page }) => {
    const nameInput = page.getByLabel('Space Name');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await expect(nameInput).not.toBeDisabled();

    // Slug is read-only
    const slugInput = page.locator('input[disabled]').first();
    await expect(slugInput).toBeVisible();
    await expect(slugInput).toHaveValue('e2e-testspace');
    await expect(slugInput).toBeDisabled();
  });

  test('currency buttons are visible and clickable', async ({ page }) => {
    // Currency buttons show full names, not codes
    await expect(page.getByRole('button', { name: 'US Dollar' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Euro' })).toBeVisible();

    // Clicking a currency button changes selection
    await page.getByRole('button', { name: 'US Dollar' }).click();
    await page.getByRole('button', { name: 'Euro' }).click(); // restore
  });
});

test.describe('Settings — working days', () => {
  test('toggling a day enables/disables it and activates Save button', async ({ page }) => {
    await page.goto(SETTINGS_ORG_URL);
    await page.waitForLoadState('networkidle');

    // Sat is off by default (DEFAULT_WORKING_DAYS = [1,2,3,4,5])
    const satBtn = page.getByRole('button', { name: 'Sat' });
    await expect(satBtn).toBeVisible({ timeout: 10_000 });

    // Save Changes should be disabled before any change (first Save button = org card)
    const saveBtn = page.locator('button', { hasText: 'Save Changes' }).first();
    await expect(saveBtn).toBeDisabled();

    // Toggle Sat on
    await satBtn.click();
    await expect(saveBtn).not.toBeDisabled();

    // Toggle Sat back off (restore state without saving)
    await satBtn.click();
    await expect(saveBtn).toBeDisabled();
  });
});

test.describe('Settings — save organization changes', () => {
  test('editing org name enables Save, save persists, state restored', async ({ page }) => {
    await page.goto(SETTINGS_ORG_URL);
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByLabel('Space Name');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });

    // Read original name so we can restore it
    const originalName = await nameInput.inputValue();

    const saveBtn = page.locator('button', { hasText: 'Save Changes' }).first();

    // Change name → Save should enable
    await nameInput.fill(originalName + ' Edited');
    await expect(saveBtn).not.toBeDisabled();

    // Click Save and wait for the PATCH to complete
    await saveBtn.scrollIntoViewIfNeeded();
    const patch1 = page.waitForResponse(
      r => r.url().includes('/rest/v1/organizations') && r.request().method() === 'PATCH',
      { timeout: 20_000 }
    );
    await saveBtn.click();
    const resp1 = await patch1;
    expect(resp1.status()).toBeLessThan(300);

    // Reload to get fresh DB state — proves the save persisted and avoids React Query timing
    await page.reload();
    await page.waitForLoadState('networkidle');
    const nameInputAfter = page.getByLabel('Space Name');
    await expect(nameInputAfter).toBeVisible({ timeout: 10_000 });
    await expect(nameInputAfter).toHaveValue(originalName + ' Edited');

    // Restore original name
    await nameInputAfter.fill(originalName);
    const saveBtnAfter = page.locator('button', { hasText: 'Save Changes' }).first();
    await expect(saveBtnAfter).not.toBeDisabled();
    await saveBtnAfter.scrollIntoViewIfNeeded();
    const patch2 = page.waitForResponse(
      r => r.url().includes('/rest/v1/organizations') && r.request().method() === 'PATCH',
      { timeout: 20_000 }
    );
    await saveBtnAfter.click();
    const resp2 = await patch2;
    expect(resp2.status()).toBeLessThan(300);
  });
});

test.describe('Settings — rooms & desks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SETTINGS_ROOMS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('room names and desk count inputs are visible', async ({ page }) => {
    // Rooms & Desks card text is visible
    await expect(page.getByText('Rooms & Desks', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Desk count inputs render as spinbutton role (not input[type="number"])
    const deskCountInput = page.getByRole('spinbutton').first();
    await expect(deskCountInput).toBeVisible();
  });

  test('clicking Add Room shows the new room form', async ({ page }) => {
    const addRoomBtn = page.getByRole('button', { name: 'Add Room' });
    await expect(addRoomBtn).toBeVisible({ timeout: 10_000 });
    await addRoomBtn.click();

    // Form appears with name + desks inputs
    await expect(page.getByPlaceholder('e.g. Open Space')).toBeVisible();
    // exact: true to avoid matching "Add Meeting Room" button (substring match is default)
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('staging a new room shows pending entry without saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Room' }).click();

    const nameInput = page.getByPlaceholder('e.g. Open Space');
    await nameInput.fill('Test Room E2E');

    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // Pending room appears with "will be created on save" label
    await expect(page.getByText('Test Room E2E')).toBeVisible();
    await expect(page.getByText('New — will be created on save')).toBeVisible();

    // Cancel the pending room via the X button inside the entry row.
    // Structure: entry-row > [name-cell("Test Room E2E"), desks-cell > button(X)]
    // Navigate: text("Test Room E2E") → parent(name-cell) → parent(entry-row) → button
    const cancelPendingBtn = page.getByText('Test Room E2E', { exact: true })
      .locator('..') // name-cell
      .locator('..') // entry-row containing both name and the X button
      .getByRole('button');
    await cancelPendingBtn.click();
    await expect(page.getByText('New — will be created on save')).not.toBeVisible();
  });
});

test.describe('Settings — notifications card', () => {
  test('Notifications card renders with connect or connected state', async ({ page }) => {
    await page.goto(SETTINGS_NOTIFICATIONS_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible({ timeout: 10_000 });

    // Either shows "Connect Telegram" button (not connected) or "Connected" badge
    const isConnected = await page.getByText('Connected', { exact: true }).isVisible();
    if (isConnected) {
      await expect(page.getByRole('button', { name: 'Send Test' })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'Connect Telegram' })).toBeVisible();
    }
  });
});

test.describe('Settings — public booking card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SETTINGS_INTEGRATIONS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('public booking toggle is visible', async ({ page }) => {
    // Toggle renders as role=switch
    const toggle = page.getByRole('switch', { name: 'Enable public booking' });
    await expect(toggle).toBeVisible({ timeout: 10_000 });
  });

  test('enabling public booking shows shareable link and amber warning (no Telegram)', async ({ page }) => {
    const toggle = page.getByRole('switch', { name: 'Enable public booking' });
    await expect(toggle).toBeVisible({ timeout: 10_000 });

    const wasEnabled = await toggle.isChecked();

    // Ensure it's enabled for this test
    if (!wasEnabled) {
      await toggle.click();
    }

    // Shareable link is a readonly textbox containing /book/
    await expect(page.locator('input[readonly]').filter({ hasValue: /\/book\// })).toBeVisible({ timeout: 5_000 });

    // Amber warning shown when Telegram not connected
    const telegramConnected = await page.getByText('Connected', { exact: true }).first().isVisible();
    if (!telegramConnected) {
      await expect(page.getByText('Without Telegram connected')).toBeVisible();
    }

    // Restore original state
    if (!wasEnabled) {
      await toggle.click();
      const saveBtn = page.locator('div').filter({ hasText: 'Public Booking Page' }).getByRole('button', { name: 'Save Changes' }).last();
      await saveBtn.click();
      await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe('Settings — Stripe integration card', () => {
  test('Stripe card is visible and not "Coming soon"', async ({ page }) => {
    await page.goto(SETTINGS_INTEGRATIONS_URL);
    await page.waitForLoadState('networkidle');

    const stripeCard = page.getByTestId('stripe-integration-card');
    await expect(stripeCard).toBeVisible({ timeout: 10_000 });
    await expect(stripeCard).not.toContainText('Coming soon');
    // The card should show "Stripe" title text
    await expect(stripeCard.getByText('Stripe')).toBeVisible();
  });

  test('Stripe card shows key input fields for admin', async ({ page }) => {
    await page.goto(SETTINGS_INTEGRATIONS_URL);
    await page.waitForLoadState('networkidle');

    const stripeCard = page.getByTestId('stripe-integration-card');
    // Should show Secret Key and Publishable Key inputs when not connected
    await expect(stripeCard.getByLabel('Secret Key')).toBeVisible({ timeout: 10_000 });
    await expect(stripeCard.getByLabel('Publishable Key')).toBeVisible();
    await expect(stripeCard.getByRole('button', { name: 'Connect' })).toBeVisible();
  });
});
