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
 *   - Today/Tomorrow buttons are in a 2-column grid.
 *   - Confirm button label: "Confirm N Day Booking" or "Confirm N Days Booking".
 *   - Success heading: "You're in, {name}!" as an <h1>.
 *   - Multi-date: UI is single-step; Today + Tomorrow can both be selected.
 */

const FLEX_MEMBER_ID = '99901';
const EXHAUSTED_MEMBER_ID = '99902';
const ORG_SLUG = 'e2e-testspace';
const MEMBER_URL = `/book/${FLEX_MEMBER_ID}/${ORG_SLUG}/`;
const EXHAUSTED_URL = `/book/${EXHAUSTED_MEMBER_ID}/${ORG_SLUG}/`;

/**
 * Select an available date by clicking Today or Tomorrow.
 * Returns the date label clicked, or null if none available.
 */
async function selectAvailableDate(page: Page): Promise<string | null> {
  const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
  const todayAvail = await todayBtn.evaluate(
    (el) => !(el as HTMLButtonElement).disabled,
  ).catch(() => false);

  if (todayAvail) {
    await todayBtn.click();
    await page.getByRole('button', { name: /Confirm \d+ Days? Booking/ }).waitFor({ timeout: 5_000 });
    return 'Today';
  }

  const tomorrowBtn = page.locator('button').filter({ hasText: /^Tomorrow/ });
  const tomorrowAvail = await tomorrowBtn.evaluate(
    (el) => !(el as HTMLButtonElement).disabled,
  ).catch(() => false);

  if (tomorrowAvail) {
    await tomorrowBtn.click();
    await page.getByRole('button', { name: /Confirm \d+ Days? Booking/ }).waitFor({ timeout: 5_000 });
    return 'Tomorrow';
  }

  return null;
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
    await expect(page.getByText('Pick your dates')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toBeVisible();
  });

  test('"Pick more dates" button opens the calendar picker', async ({ page }) => {
    await page.getByText('Pick more dates').click();
    await expect(page.locator('[class*="rdp"]').first()).toBeVisible({ timeout: 5_000 });
    await page.getByText('Done').click();
    await expect(page.getByText('Pick more dates')).toBeVisible();
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

  test('selecting an available date shows confirm button', async ({ page }) => {
    const selected = await selectAvailableDate(page);
    if (!selected) {
      test.skip(true, 'No available dates today or tomorrow — cannot test date selection');
      return;
    }

    await expect(page.getByRole('button', { name: /Confirm \d+ Days? Booking/ })).toBeVisible();
  });

  test('selected date can be deselected via ✕ button', async ({ page }) => {
    const selected = await selectAvailableDate(page);
    if (!selected) {
      test.skip(true, 'No available dates — skip deselect test');
      return;
    }

    await page.locator('button').filter({ hasText: '✕' }).first().click();
    await expect(page.getByText('Pick your dates')).toBeVisible({ timeout: 5_000 });
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

    await page.getByRole('button', { name: /Confirm \d+ Days? Booking/ }).click();

    await expect(page.getByRole('heading', { name: "You're in, E2E Flex Member!" })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText(/is reserved\.|are reserved\./)).toBeVisible();
    await expect(page.getByText(/days remaining/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Book another day' })).toBeVisible();
  });
});

// ── Multi-day booking ─────────────────────────────────────────────────────────

test.describe('Member Booking — multi-day booking', () => {
  test('books two days at once and sees success with both', { timeout: 60_000 }, async ({ page }) => {
    await page.goto(MEMBER_URL);
    await page.waitForLoadState('networkidle');

    const notFound = await page.getByText('Not found').isVisible().catch(() => false);
    if (notFound) {
      test.skip(true, 'Flex member not seeded');
      return;
    }

    const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
    const tomorrowBtn = page.locator('button').filter({ hasText: /^Tomorrow/ });

    const todayAvail = await todayBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);
    const tomorrowAvail = await tomorrowBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);

    if (!todayAvail || !tomorrowAvail) {
      test.skip(true, 'Need both Today and Tomorrow available for multi-day test');
      return;
    }

    await todayBtn.click();
    await tomorrowBtn.click();

    const confirmBtn = page.getByRole('button', { name: /Confirm 2 Days Booking/ });
    await expect(confirmBtn).toBeEnabled({ timeout: 5_000 });
    await confirmBtn.click();

    await expect(page.getByRole('heading', { name: "You're in, E2E Flex Member!" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('2 desks')).toBeVisible();
    await expect(page.getByText(/days remaining/)).toBeVisible();
  });
});

// ── Flex balance accounting ──────────────────────────────────────────────────

test.describe('Member Booking — flex balance accounting', () => {
  test('balance decrements by number of dates booked and persists across reload', { timeout: 60_000 }, async ({ page }) => {
    await page.goto(MEMBER_URL);
    await page.waitForLoadState('networkidle');

    const notFound = await page.getByText('Not found').isVisible().catch(() => false);
    if (notFound) {
      test.skip(true, 'Flex member not seeded');
      return;
    }

    // Read initial balance from the header bar (e.g. "10/10 days")
    const balanceBar = page.getByText(/^\d+\/\d+ days$/).first();
    await expect(balanceBar).toBeVisible({ timeout: 10_000 });
    const initialText = (await balanceBar.textContent()) ?? '';
    const match = initialText.match(/^(\d+)\/(\d+) days$/);
    if (!match) {
      test.skip(true, `Could not parse initial balance: ${initialText}`);
      return;
    }
    const initialRemaining = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);

    // Book two days (Today + Tomorrow) — requires both to be available
    const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
    const tomorrowBtn = page.locator('button').filter({ hasText: /^Tomorrow/ });
    const todayAvail = await todayBtn.evaluate((el) => !(el as HTMLButtonElement).disabled).catch(() => false);
    const tomorrowAvail = await tomorrowBtn.evaluate((el) => !(el as HTMLButtonElement).disabled).catch(() => false);
    if (!todayAvail || !tomorrowAvail) {
      test.skip(true, 'Need both Today and Tomorrow available for balance accounting test');
      return;
    }
    if (initialRemaining < 2) {
      test.skip(true, `Need at least 2 flex days remaining, have ${initialRemaining}`);
      return;
    }

    await todayBtn.click();
    await tomorrowBtn.click();
    await page.getByRole('button', { name: /Confirm 2 Days Booking/ }).click();

    // Success screen shows the new balance (initial - 2)
    await expect(page.getByRole('heading', { name: "You're in, E2E Flex Member!" })).toBeVisible({ timeout: 30_000 });
    const expectedRemaining = initialRemaining - 2;
    await expect(page.getByText(`${expectedRemaining}/${total} days remaining`)).toBeVisible({ timeout: 10_000 });

    // Reload and confirm the balance persisted in the DB (header bar shows the new value)
    await page.goto(MEMBER_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(`${expectedRemaining}/${total} days`).first()).toBeVisible({ timeout: 10_000 });
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
    await expect(page.getByRole('button', { name: /Confirm \d+ Days? Booking/ })).not.toBeVisible();
  });
});
