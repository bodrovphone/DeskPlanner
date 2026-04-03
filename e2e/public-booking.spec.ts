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
 *   - Name and Phone fields use plain <label> + <input>, not shadcn Label/Input.
 *     Use page.getByLabel() which resolves htmlFor associations.
 *   - "Today" and "Tomorrow" buttons are plain <button> elements with those exact texts.
 *   - Error message renders inside a red div (not a dialog/alert role).
 *   - "You're booked!" is an <h1> heading.
 */

const PUBLIC_URL = '/book/e2e-testspace';

// ── Not found ─────────────────────────────────────────────────────────────────

test.describe('Public Booking — not found', () => {
  test('non-existent org slug shows "Not available" message', async ({ page }) => {
    await page.goto('/book/this-org-does-not-exist-e2e');
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
    // Guard: skip if public booking is disabled on the test org
    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace — enable it in Settings first');
    }
  });

  test('org name and "Book a desk" subtitle visible in header', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Book a desk')).toBeVisible();
  });

  test('date selection step renders with Today and Tomorrow buttons', async ({ page }) => {
    await expect(page.getByText('When do you want to come?')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toBeVisible();
  });

  test('"Pick another date" button opens the calendar picker', async ({ page }) => {
    await page.getByText('Pick another date').click();
    // Calendar component renders — multiple rdp elements exist, just check first
    await expect(page.locator('[class*="rdp"]').first()).toBeVisible({ timeout: 5_000 });
    // Cancel closes the picker
    await page.getByText('Cancel').click();
    await expect(page.getByText('Pick another date')).toBeVisible();
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

  test('selecting an available date reveals the contact form', async ({ page }) => {
    // Use button locator (not span) so .disabled check works correctly
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

    await expect(page.getByText('Your details')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder('Your full name')).toBeVisible();
    await expect(page.locator('input[type="tel"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Book Desk' })).toBeVisible();
  });

  test('"Change date" returns to date selection', async ({ page }) => {
    const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
    const isAvailable = await todayBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);
    if (!isAvailable) {
      test.skip(true, 'Today not available — skip back-button test');
      return;
    }

    await todayBtn.click();
    await expect(page.getByText('Your details')).toBeVisible({ timeout: 5_000 });

    await page.getByText('Change date').click();
    await expect(page.getByText('When do you want to come?')).toBeVisible({ timeout: 5_000 });
  });
});

// ── Contact form validation ───────────────────────────────────────────────────

test.describe('Public Booking — form validation', () => {
  /**
   * Navigate to the contact form by selecting an available date.
   * Returns true if we reached the form, false if no dates available.
   */
  async function goToContactForm(page: Page): Promise<boolean> {
    const todayBtn = page.locator('button').filter({ hasText: /^Today/ });
    const available = await todayBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);
    if (available) {
      await todayBtn.click();
      await page.getByText('Your details').waitFor({ timeout: 5_000 });
      return true;
    }
    const tomorrowBtn = page.locator('button').filter({ hasText: /^Tomorrow/ });
    const tomorrowAvail = await tomorrowBtn.evaluate(
      (el) => !(el as HTMLButtonElement).disabled,
    ).catch(() => false);
    if (tomorrowAvail) {
      await tomorrowBtn.click();
      await page.getByText('Your details').waitFor({ timeout: 5_000 });
      return true;
    }
    return false;
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
    // Phone input auto-prepends '+', so provide a short sequence to trigger the < 7 digits check
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
  test('fills form and sees confirmation screen', async ({ page }) => {
    await page.goto(PUBLIC_URL);
    await page.waitForLoadState('networkidle');

    const notAvailable = await page.getByText('Not available').isVisible().catch(() => false);
    if (notAvailable) {
      test.skip(true, 'Public booking not enabled on e2e-testspace');
      return;
    }

    // Select an available date
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

    await page.getByText('Your details').waitFor({ timeout: 5_000 });

    await page.getByPlaceholder('Your full name').fill(`E2E Visitor ${Date.now()}`);
    // Valid phone with country code
    await page.locator('input[type="tel"]').first().fill('+359888123456');

    await page.getByRole('button', { name: 'Book Desk' }).click();

    // Success screen
    await expect(page.getByRole('heading', { name: "You're booked!" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
