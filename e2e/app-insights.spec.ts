import { test, expect } from './fixtures';

/**
 * Insights suite — page load, stats cards, next dates panel, date click → booking modal.
 *
 * Runs in the `app` project (authenticated as bodrovphone+e2e@gmail.com, org: e2e-testspace).
 *
 * Relies on seeded data from reset_e2e_test_data():
 *   - Bookings with status "booked" and "assigned" across upcoming dates
 *   - Some assignments expiring within 10 days
 */

const INSIGHTS_URL = '/e2e-testspace/insights/';

test.describe('Insights — page load', () => {
  test('page loads with heading and stats cards', async ({ page }) => {
    await page.goto(INSIGHTS_URL);
    await page.waitForLoadState('networkidle');

    // Page heading
    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();

    // Stats cards — all three labels visible (exact: true to avoid matching "Next Available Dates")
    await expect(page.getByText('Available', { exact: true })).toBeVisible();
    await expect(page.getByText('Booked', { exact: true })).toBeVisible();
    await expect(page.getByText('Assigned', { exact: true })).toBeVisible();

    // Stats label with "weekdays left"
    await expect(page.getByText(/weekdays left/)).toBeVisible();
  });

  test('stats cards show numeric values', async ({ page }) => {
    await page.goto(INSIGHTS_URL);
    await page.waitForLoadState('networkidle');

    // Each stat card has a number (the green/orange/blue value)
    const greenValue = page.locator('.text-green-600').filter({ hasText: /^\d+$/ });
    const orangeValue = page.locator('.text-orange-600').filter({ hasText: /^\d+$/ });
    const blueValue = page.locator('.text-blue-600').filter({ hasText: /^\d+$/ });

    await expect(greenValue).toBeVisible();
    await expect(orangeValue).toBeVisible();
    await expect(blueValue).toBeVisible();
  });
});

test.describe('Insights — next dates panel', () => {
  test('shows Next Available Dates section', async ({ page }) => {
    await page.goto(INSIGHTS_URL);
    await page.waitForLoadState('networkidle');

    // Section heading always visible
    await expect(page.getByText('Next Available Dates')).toBeVisible();

    // Either date buttons (green) or empty state message
    const dateButtons = page.locator('button.bg-green-50');
    const emptyMsg = page.getByText('No available dates found in the next 90 days');

    const hasAvailable = await dateButtons.count() > 0;
    if (hasAvailable) {
      // Date buttons show day format like "Mon, Mar 31"
      await expect(dateButtons.first()).toBeVisible();
      await expect(dateButtons.first()).toContainText(/\w{3}, \w{3} \d+/);
    } else {
      await expect(emptyMsg).toBeVisible();
    }
  });

  test('shows Next Booked Dates section when bookings exist', async ({ page }) => {
    await page.goto(INSIGHTS_URL);
    await page.waitForLoadState('networkidle');

    // Booked section only renders if data exists
    const bookedHeading = page.getByText('Next Booked Dates');
    const bookedButtons = page.locator('button.bg-orange-50');

    const hasBooked = await bookedButtons.count() > 0;
    if (hasBooked) {
      await expect(bookedHeading).toBeVisible();
      // Booked date buttons show person names below the date
      await expect(bookedButtons.first()).toBeVisible();
    }
    // If no booked dates, section is not rendered — that's valid
  });

  test('shows expiring assignments section when assignments exist', async ({ page }) => {
    await page.goto(INSIGHTS_URL);
    await page.waitForLoadState('networkidle');

    const expiringHeading = page.getByText('Assignments Expiring in Next 10 Days');
    const expiringButtons = page.locator('button.bg-red-50');

    const hasExpiring = await expiringButtons.count() > 0;
    if (hasExpiring) {
      await expect(expiringHeading).toBeVisible();
      // Expiring buttons show person name and desk number
      const firstButton = expiringButtons.first();
      await expect(firstButton).toBeVisible();
      await expect(firstButton).toContainText(/Desk \d+/);
    }
    // If no expiring assignments, section is not rendered — that's valid
  });
});

test.describe('Insights — date click opens booking modal', () => {
  test('clicking an available date opens booking dialog', async ({ page }) => {
    await page.goto(INSIGHTS_URL);
    await page.waitForLoadState('networkidle');

    const dateButtons = page.locator('button.bg-green-50');
    const count = await dateButtons.count();

    if (count === 0) {
      test.skip(true, 'No available dates to click');
      return;
    }

    await dateButtons.first().click();

    // Booking modal opens — look for the dialog with "Book Desk" heading
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Book Desk' })).toBeVisible();

    // Close the modal
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
  });

  test('clicking a booked date opens booking dialog with details', async ({ page }) => {
    await page.goto(INSIGHTS_URL);
    await page.waitForLoadState('networkidle');

    const bookedButtons = page.locator('button.bg-orange-50');
    const count = await bookedButtons.count();

    if (count === 0) {
      test.skip(true, 'No booked dates to click');
      return;
    }

    await bookedButtons.first().click();

    // Booking modal opens — for existing bookings it shows "Edit Booking" or the booking details
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Close the modal
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
  });
});
