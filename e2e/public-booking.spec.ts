import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * Public Booking suite — /book/:orgSlug (no auth required).
 *
 * Runs in the `public-booking` Playwright project.
 *
 * Test org: e2e-testspace (public booking enabled in test data).
 * URL: /book/e2e-testspace
 *
 * Pre-requisite: public booking must be enabled on e2e-testspace.
 * Verify via Settings → Public Booking toggle or reset_e2e_test_data RPC.
 *
 * The "successful booking" test creates a real booking — it is cleaned up by
 * the reset_e2e_test_data RPC that runs at the start of each test suite.
 *
 * Selector notes:
 *   - Name and Phone fields use plain <label> + <input>.
 *     Use page.getByLabel() which resolves htmlFor associations.
 *   - "Today" and "Tomorrow" buttons are plain <button> elements.
 *   - "Change dates" (ChevronLeft) goes back to step 1 from step 2.
 *   - Error message renders inside a red div (not a dialog/alert role).
 *   - "You're booked!" is an <h1> heading.
 *   - Step transition is explicit: user clicks "Continue with N date(s)" to move to step 2.
 *     (Previously any selection auto-advanced, which broke multi-date flows.)
 *   - Submit button: "Book Desk" (1 date) or "Book N Days" (N > 1).
 */

const PUBLIC_URL = '/book/e2e-testspace/';

// ── Not found ─────────────────────────────────────────────────────────────────

test.describe('Public Booking — not found', () => {
  test('non-existent org slug shows "Not available" message', async ({ page }) => {
    await page.goto('/book/this-org-does-not-exist-e2e/');
    await expect(page.getByText('Not available')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("This space doesn't have online booking enabled, or doesn't exist."),
    ).toBeVisible();
  });
});

// ── Page load ─────────────────────────────────────────────────────────────────

test.describe('Public Booking — page load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PUBLIC_URL);
    await page.waitForLoadState('networkidle');
    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace — enable it in Settings first');
    }
  });

  test('org name and "Book a desk" subtitle visible in header', { tag: ['@smoke'] }, async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Book a desk')).toBeVisible();
  });

  test('date selection step renders with Today and Tomorrow buttons', async ({ page }) => {
    await expect(page.getByText('When do you want to come?')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toBeVisible();
  });

  test('"Pick more dates" button opens the calendar picker', async ({ page }) => {
    // Label switches to "See available dates" when today+tomorrow are both blocked
    // (e.g. weekend test runs against a Mon–Fri working-days fixture).
    const trigger = page.getByText(/Pick more dates|See available dates/);
    await trigger.click();
    await expect(page.locator('[class*="rdp"]').first()).toBeVisible({ timeout: 5_000 });
    await page.getByText('Done').click();
    await expect(trigger).toBeVisible();
  });
});

// ── Date selection → contact form ─────────────────────────────────────────────

test.describe('Public Booking — date selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PUBLIC_URL);
    await page.waitForLoadState('networkidle');
    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace');
    }
  });

  test('selecting an available date shows Continue button, then reveals form', async ({ page }) => {
    const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
    const isAvailable = await todayBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);

    if (isAvailable) {
      await todayBtn.click();
    } else {
      const tomorrowBtn = page.locator('button').filter({ hasText: /^Tomorrow/ });
      const tomorrowAvailable = await tomorrowBtn.evaluate(
        (el) => !(el as HTMLButtonElement).disabled,
      ).catch(() => false);
      if (!tomorrowAvailable) {
        test.skip(true, 'No available dates today or tomorrow — cannot test date selection');
        return;
      }
      await tomorrowBtn.click();
    }

    const continueBtn = page.getByRole('button', { name: /Continue with \d+ date/ });
    await expect(continueBtn).toBeVisible({ timeout: 5_000 });
    await continueBtn.click();

    await expect(page.getByText('Your details')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder('Your full name')).toBeVisible();
    await expect(page.locator('input[type="tel"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Book Desk' })).toBeVisible();
  });

  test('"Change dates" returns to date selection', async ({ page }) => {
    const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
    const isAvailable = await todayBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);
    if (!isAvailable) {
      test.skip(true, 'Today not available — skip back-button test');
      return;
    }

    await todayBtn.click();
    await page.getByRole('button', { name: /Continue with \d+ date/ }).click();
    await expect(page.getByText('Your details')).toBeVisible({ timeout: 5_000 });

    await page.getByText('Change dates').click();
    await expect(page.getByText('When do you want to come?')).toBeVisible({ timeout: 5_000 });
  });
});

// ── Contact form validation ───────────────────────────────────────────────────

test.describe('Public Booking — form validation', () => {
  async function goToContactForm(page: Page): Promise<boolean> {
    const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
    const available = await todayBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);
    if (available) {
      await todayBtn.click();
    } else {
      const tomorrowBtn = page.locator('button').filter({ hasText: /^Tomorrow/ });
      const tomorrowAvail = await tomorrowBtn.evaluate(
        (el) => !(el as HTMLButtonElement).disabled,
      ).catch(() => false);
      if (!tomorrowAvail) return false;
      await tomorrowBtn.click();
    }
    await page.getByRole('button', { name: /Continue with \d+ date/ }).click();
    await page.getByText('Your details').waitFor({ timeout: 5_000 });
    return true;
  }

  test.beforeEach(async ({ page }) => {
    await page.goto(PUBLIC_URL);
    await page.waitForLoadState('networkidle');
    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace');
    }
  });

  test('shows error for invalid phone (too few digits)', async ({ page }) => {
    const reached = await goToContactForm(page as Page);
    if (!reached) {
      test.skip(true, 'No available dates — cannot test form validation');
      return;
    }

    await page.getByPlaceholder('Your full name').fill('E2E Validator');
    await page.locator('input[type="tel"]').first().fill('+4');
    await page.getByRole('button', { name: 'Book Desk' }).click();

    await expect(
      page.getByText('Please enter a valid phone number with country code'),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('shows error for too-short phone number', async ({ page }) => {
    const reached = await goToContactForm(page as Page);
    if (!reached) {
      test.skip(true, 'No available dates — cannot test form validation');
      return;
    }

    await page.getByPlaceholder('Your full name').fill('E2E Validator');
    await page.locator('input[type="tel"]').first().fill('+123');
    await page.getByRole('button', { name: 'Book Desk' }).click();

    await expect(
      page.getByText('Please enter a valid phone number with country code'),
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ── Successful booking ────────────────────────────────────────────────────────

test.describe('Public Booking — successful booking', () => {
  test('fills form and sees confirmation screen', { tag: ['@smoke'] }, async ({ page }) => {
    await page.goto(PUBLIC_URL);
    await page.waitForLoadState('networkidle');

    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace');
      return;
    }

    const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
    const todayAvail = await todayBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);

    if (todayAvail) {
      await todayBtn.click();
    } else {
      const tomorrowBtn = page.locator('button').filter({ hasText: /^Tomorrow/ });
      const tomorrowAvail = await tomorrowBtn.evaluate(
        (el) => !(el as HTMLButtonElement).disabled,
      ).catch(() => false);
      if (!tomorrowAvail) {
        test.skip(true, 'No available dates — cannot test successful booking');
        return;
      }
      await tomorrowBtn.click();
    }

    await page.getByRole('button', { name: /Continue with \d+ date/ }).click();
    await page.getByText('Your details').waitFor({ timeout: 5_000 });
    await page.getByPlaceholder('Your full name').fill(`E2E Visitor ${Date.now()}`);
    await page.locator('input[type="tel"]').first().fill('+359888123456');
    await page.getByRole('button', { name: 'Book Desk' }).click();

    await expect(page.getByRole('heading', { name: "You're booked!" })).toBeVisible({
      timeout: 15_000,
    });
  });
});

// ── Multi-day booking ─────────────────────────────────────────────────────────

test.describe('Public Booking — multi-day booking', () => {
  test('books two days at once and sees success with both listed', { timeout: 60_000 }, async ({ page }) => {
    await page.goto(PUBLIC_URL);
    await page.waitForLoadState('networkidle');

    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace');
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

    await expect(page.getByRole('button', { name: 'Continue with 2 dates' })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Continue with 2 dates' }).click();

    await page.getByText('Your details').waitFor({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Book 2 Days' })).toBeVisible();

    await page.getByPlaceholder('Your full name').fill(`E2E Multi Visitor ${Date.now()}`);
    await page.locator('input[type="tel"]').first().fill('+359888123456');
    await page.getByRole('button', { name: 'Book 2 Days' }).click();

    await expect(page.getByRole('heading', { name: "You're booked!" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('2 desks')).toBeVisible();
  });
});

// ── Payment URL params ──────────────────────────────────────────────────────

test.describe('Public Booking — payment return params', () => {
  test('?payment=cancelled shows cancellation banner and form is accessible', async ({ page }) => {
    await page.goto(`${PUBLIC_URL}?payment=cancelled`);
    await page.waitForLoadState('networkidle');

    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace');
      return;
    }

    await expect(page.getByText('Payment was cancelled')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('When do you want to come?')).toBeVisible();
  });

  test('?payment=success shows confirmation screen', async ({ page }) => {
    await page.goto(`${PUBLIC_URL}?payment=success`);
    await page.waitForLoadState('networkidle');

    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace');
      return;
    }

    await expect(page.getByRole('heading', { name: "You're booked!" })).toBeVisible({
      timeout: 10_000,
    });
  });
});
