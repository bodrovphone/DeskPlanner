import { test, expect } from './fixtures';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

/**
 * Open-ended desk contract suite (DES-88).
 *
 * Contract model: on creation we materialize two contiguous monthly blocks
 * on the same desk/client:
 *   - Block 1 (assigned, paid): startDate → startDate + 1mo − 1d
 *   - Block 2 (booked, runway): block1.end + 1 → that + 1mo − 1d
 * Mark as paid flips block 2 → assigned and spawns a fresh booked block 3.
 * End contract truncates all future ongoing rows.
 *
 * Depends on e2e org having monthly_plan_price (migration 20260422000002).
 *
 * Partial-run isolation: the global-setup reset runs once per invocation but
 * a mid-spec failure leaves rows on A-4 that persist into the retry. We
 * re-reset at the start of this file so each run starts from a clean slate.
 */

const CALENDAR_URL = '/e2e-testspace/calendar/';

test.beforeAll(async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
  const email = process.env.E2E_TEST_EMAIL!;
  const password = process.env.E2E_TEST_PASSWORD!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase.auth.signInWithPassword({ email, password });
  await supabase.rpc('reset_e2e_test_data');
});

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

    const availableCell = page.locator('tr').filter({ hasText: 'A-4' }).locator('.desk-available').first();
    await expect(availableCell).toBeVisible({ timeout: 10_000 });
    await availableCell.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Default: day_pass + assigned → no Ongoing toggle visible.
    const ongoingToggle = page.getByLabel('Ongoing', { exact: true });
    await expect(ongoingToggle).not.toBeVisible();

    await page.getByRole('button', { name: 'Monthly' }).click();
    await expect(ongoingToggle).toBeVisible({ timeout: 2_000 });

    await page.getByRole('button', { name: 'Booked' }).click();
    await expect(ongoingToggle).not.toBeVisible();

    await page.getByRole('button', { name: 'Assigned' }).click();
    await expect(ongoingToggle).toBeVisible({ timeout: 2_000 });

    await page.keyboard.press('Escape');
  });

  test('create → mark as paid → end ongoing contract runway', async ({ page }) => {
    await switchToWeekView(page);

    // Desk A-4 is the only desk with zero seeded bookings in the e2e dataset,
    // so a 60-day runway scan comes back conflict-free.
    const availableCell = page.locator('tr').filter({ hasText: 'A-4' }).locator('.desk-available').first();
    await expect(availableCell).toBeVisible({ timeout: 10_000 });
    await availableCell.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Monthly' }).click();
    await page.getByRole('button', { name: 'Assigned' }).click();
    await page.getByLabel('Ongoing', { exact: true }).check();

    await page.getByPlaceholder('Enter name').fill('E2E Ongoing Tenant');
    await page.getByRole('button', { name: 'Book Desk' }).click();
    await expect(page.getByRole('dialog', { name: 'Book Desk' })).not.toBeVisible({ timeout: 20_000 });

    // Scroll forward ~5 weeks — enough to pass block 1 (30 days) and land
    // inside the booked runway (block 2). The name persists in the grid.
    const nextBtn = page.locator('button:has(.lucide-chevron-right)');
    for (let i = 0; i < 5; i++) {
      await nextBtn.click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    await expect(page.getByText('E2E Ongoing Tenant').first()).toBeVisible({ timeout: 10_000 });

    // In this week cells should be orange (booked runway), not blue (assigned).
    const bookedCell = page.locator('.desk-booked').filter({ hasText: 'E2E Ongoing Tenant' }).first();
    await expect(bookedCell).toBeVisible({ timeout: 5_000 });

    // Mark the booked cycle as paid → flips to assigned + spawns new booked block.
    await bookedCell.click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    const markPaidBtn = page.getByRole('button', { name: /Mark as paid/i });
    await expect(markPaidBtn).toBeVisible();
    await markPaidBtn.click();

    // Success toast confirms the flip.
    await expect(page.getByText('Payment recorded', { exact: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('dialog', { name: 'Book Desk' })).not.toBeVisible({ timeout: 10_000 });

    // The previously-booked cell is now assigned (blue) — re-query by status.
    await expect(
      page.locator('.desk-assigned').filter({ hasText: 'E2E Ongoing Tenant' }).first(),
    ).toBeVisible({ timeout: 5_000 });

    // End contract from any ongoing cell.
    const endableCell = page.locator('.desk-cell').filter({ hasText: 'E2E Ongoing Tenant' }).first();
    await endableCell.click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    const endBtn = page.getByRole('button', { name: /End contract/i });
    await expect(endBtn).toBeVisible();
    await endBtn.click();

    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'End contract', exact: true }).last().click();
    await expect(page.getByRole('dialog', { name: 'Book Desk' })).not.toBeVisible({ timeout: 10_000 });
  });
});
