import { test, expect } from './fixtures';

/**
 * Open-ended desk contract suite (DES-88).
 *
 * Depends on the e2e org having monthly_plan_price configured (handled by
 * reset_e2e_test_data — see migration 20260422000002).
 *
 * Two tests share the same e2e dataset reset (done once by global-setup), so
 * the create/materialize/end flow is bundled into a single test to avoid
 * cross-test conflicts on desk A-4 (the only conflict-free slot across the
 * 90-day ongoing horizon).
 */

const CALENDAR_URL = '/e2e-testspace/calendar/';

async function switchToWeekView(page: import('@playwright/test').Page) {
  const weekBtn = page.getByRole('button', { name: 'Week' });
  await weekBtn.waitFor({ state: 'visible', timeout: 40_000 });
  await weekBtn.click();
  await page.waitForTimeout(300);
}

test.describe('Calendar — ongoing contracts', { tag: ['@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CALENDAR_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Ongoing checkbox only appears when plan=monthly and status=assigned', async ({ page }) => {
    await switchToWeekView(page);

    // Desk A-4 has zero seeded bookings in the e2e dataset.
    const availableCell = page.locator('tr').filter({ hasText: 'A-4' }).locator('.desk-available').first();
    await expect(availableCell).toBeVisible({ timeout: 10_000 });
    await availableCell.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Default: day_pass + assigned → no Ongoing toggle visible.
    const ongoingToggle = page.getByLabel(/Ongoing — no end date/i);
    await expect(ongoingToggle).not.toBeVisible();

    // Switch to Monthly plan → toggle appears.
    await page.getByRole('button', { name: 'Monthly' }).click();
    await expect(ongoingToggle).toBeVisible({ timeout: 2_000 });

    // Switch status to Booked → toggle hides (status must be assigned).
    await page.getByRole('button', { name: 'Booked' }).click();
    await expect(ongoingToggle).not.toBeVisible();

    // Back to assigned → visible again.
    await page.getByRole('button', { name: 'Assigned' }).click();
    await expect(ongoingToggle).toBeVisible({ timeout: 2_000 });

    await page.keyboard.press('Escape');
  });

  test('create → materialize → end an ongoing contract', async ({ page }) => {
    await switchToWeekView(page);

    // Desk A-4 is the only desk with zero seeded bookings, so the 90-day
    // ongoing horizon scan comes back conflict-free.
    const availableCell = page.locator('tr').filter({ hasText: 'A-4' }).locator('.desk-available').first();
    await expect(availableCell).toBeVisible({ timeout: 10_000 });
    await availableCell.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Monthly' }).click();
    await page.getByRole('button', { name: 'Assigned' }).click();
    await page.getByLabel(/Ongoing — no end date/i).check();
    await expect(page.getByText('Until further notice')).toBeVisible();

    await page.getByPlaceholder('Enter name').fill('E2E Ongoing Tenant');
    await page.getByRole('button', { name: 'Book Desk' }).click();
    await expect(page.getByRole('dialog', { name: 'Book Desk' })).not.toBeVisible({ timeout: 20_000 });

    // Scroll two weeks forward — the tenant name must still render, proving
    // the horizon-materialized rows exist beyond the initially-visible week.
    const nextBtn = page.locator('button:has(.lucide-chevron-right)');
    await nextBtn.click();
    await page.waitForTimeout(300);
    await nextBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('E2E Ongoing Tenant').first()).toBeVisible({ timeout: 10_000 });

    // Re-open the assigned cell and end the contract.
    const assignedCell = page.locator('.desk-assigned').filter({ hasText: 'E2E Ongoing Tenant' }).first();
    await assignedCell.click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    const endBtn = page.getByRole('button', { name: /End contract/i });
    await expect(endBtn).toBeVisible();
    await endBtn.click();

    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'End contract', exact: true }).last().click();

    await expect(page.getByRole('dialog', { name: 'Book Desk' })).not.toBeVisible({ timeout: 10_000 });
  });
});
