import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * Member Self-Service Booking suite — /book/:memberId/:orgSlug (no auth required).
 *
 * Runs in the `member-booking` Playwright project.
 *
 * Test org: e2e-testspace (flex plan configured in test data).
 * Test members:
 *   - 99901 "E2E Flex Member"      — flex_active, 10/10 balance
 *   - 99902 "E2E Exhausted Member"  — flex_active, 0/5 balance
 *
 * Pre-requisite: flex plan must be configured on e2e-testspace and test
 * clients must be seeded by the reset_e2e_test_data RPC.
 *
 * The "successful booking" test creates a real booking — it is cleaned up by
 * the reset_e2e_test_data RPC that runs at the start of each test suite.
 *
 * Selector notes:
 *   - No contact form — member is already known from the URL.
 *   - Today/Tomorrow buttons are the same pattern as public-booking.
 *   - "Confirm Booking" is a <button> (not "Book Desk").
 *   - Success heading: "You're in, {name}!" as an <h1>.
 */

const FLEX_MEMBER_ID = '99901';
const EXHAUSTED_MEMBER_ID = '99902';
const ORG_SLUG = 'e2e-testspace';
const MEMBER_URL = `/book/${FLEX_MEMBER_ID}/${ORG_SLUG}/`;
const EXHAUSTED_URL = `/book/${EXHAUSTED_MEMBER_ID}/${ORG_SLUG}/`;

/**
 * Select an available date by clicking Today or Tomorrow.
 * Returns true if a date was selected, false if none available.
 */
async function selectAvailableDate(page: Page): Promise<boolean> {
  const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
  const todayAvail = await todayBtn.evaluate(
    (el) => !(el as HTMLButtonElement).disabled,
  ).catch(() => false);

  if (todayAvail) {
    await todayBtn.click();
    await page.getByRole('button', { name: 'Confirm Booking' }).waitFor({ timeout: 5_000 });
    return true;
  }

  const tomorrowBtn = page.locator('button').filter({ hasText: /^Tomorrow/ });
  const tomorrowAvail = await tomorrowBtn.evaluate(
    (el) => !(el as HTMLButtonElement).disabled,
  ).catch(() => false);

  if (tomorrowAvail) {
    await tomorrowBtn.click();
    await page.getByRole('button', { name: 'Confirm Booking' }).waitFor({ timeout: 5_000 });
    return true;
  }

  return false;
}

// ── Not found ─────────────────────────────────────────────────────────────────

test.describe('Member Booking — not found', () => {
  test('non-existent memberId shows "Not found" page', async ({ page }) => {
    await page.goto(`/book/00000/${ORG_SLUG}/`);
    await expect(page.getByText('Not found')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText('This booking link is invalid or has expired.'),
    ).toBeVisible();
  });
});

// ── Page load ─────────────────────────────────────────────────────────────────

test.describe('Member Booking — page load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBER_URL);
    await page.waitForLoadState('networkidle');
    const notFound = await page.getByText('Not found').isVisible().catch(() => false);
    if (notFound) {
      test.skip(true, 'Flex member not seeded — run reset_e2e_test_data with flex client seed');
    }
  });

  test('header shows org name and welcome message', { tag: ['@smoke'] }, async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Welcome, E2E Flex Member')).toBeVisible();
  });

  test('flex balance bar shows remaining/total days', async ({ page }) => {
    await expect(page.getByText(/\d+\/\d+ days/)).toBeVisible({ timeout: 10_000 });
  });

  test('date selection renders with Today and Tomorrow buttons', async ({ page }) => {
    await expect(page.getByText('Pick a date')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toBeVisible();
  });

  test('"Pick another date" button opens the calendar picker', async ({ page }) => {
    await page.getByText('Pick another date').click();
    await expect(page.locator('[class*="rdp"]').first()).toBeVisible({ timeout: 5_000 });
    await page.getByText('Cancel').click();
    await expect(page.getByText('Pick another date')).toBeVisible();
  });
});

// ── Date selection → confirmation ───────────────────────────────────────────

test.describe('Member Booking — date selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEMBER_URL);
    await page.waitForLoadState('networkidle');
    const notFound = await page.getByText('Not found').isVisible().catch(() => false);
    if (notFound) {
      test.skip(true, 'Flex member not seeded');
    }
  });

  test('selecting an available date shows confirmation step', async ({ page }) => {
    const selected = await selectAvailableDate(page);
    if (!selected) {
      test.skip(true, 'No available dates today or tomorrow — cannot test date selection');
      return;
    }

    await expect(page.getByText('Change date')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm Booking' })).toBeVisible();
  });

  test('"Change date" returns to date selection', async ({ page }) => {
    const selected = await selectAvailableDate(page);
    if (!selected) {
      test.skip(true, 'No available dates — skip back-button test');
      return;
    }

    await page.getByText('Change date').click();
    await expect(page.getByText('Pick a date')).toBeVisible({ timeout: 5_000 });
  });
});

// ── Successful booking ────────────────────────────────────────────────────────

test.describe('Member Booking — successful booking', () => {
  test('confirms booking and sees success screen', { tag: ['@smoke'], timeout: 60_000 }, async ({ page }) => {
    await page.goto(MEMBER_URL);
    await page.waitForLoadState('networkidle');

    const notFound = await page.getByText('Not found').isVisible().catch(() => false);
    if (notFound) {
      test.skip(true, 'Flex member not seeded');
      return;
    }

    const selected = await selectAvailableDate(page);
    if (!selected) {
      test.skip(true, 'No available dates — cannot test successful booking');
      return;
    }

    await page.getByRole('button', { name: 'Confirm Booking' }).click();

    // Success screen — booking write + Supabase round-trip can be slow in production CI
    await expect(page.getByRole('heading', { name: "You're in, E2E Flex Member!" })).toBeVisible({
      timeout: 30_000,
    });

    // Desk assignment shown (e.g. "Your desk at E2E Test Space is reserved.")
    await expect(page.getByText('is reserved.')).toBeVisible();

    // Updated flex balance
    await expect(page.getByText(/days remaining/)).toBeVisible();

    // Book another day button
    await expect(page.getByRole('button', { name: 'Book another day' })).toBeVisible();
  });
});

// ── Zero balance ──────────────────────────────────────────────────────────────

test.describe('Member Booking — zero balance', () => {
  test('exhausted member sees "No flex days remaining" message', async ({ page }) => {
    await page.goto(EXHAUSTED_URL);
    await page.waitForLoadState('networkidle');

    const notFound = await page.getByText('Not found').isVisible().catch(() => false);
    if (notFound) {
      test.skip(true, 'Exhausted member not seeded');
      return;
    }

    await expect(page.getByText('No flex days remaining')).toBeVisible({ timeout: 10_000 });
    // Confirm Booking button should not be present
    await expect(page.getByRole('button', { name: 'Confirm Booking' })).not.toBeVisible();
  });
});
