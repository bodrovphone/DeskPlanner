import { test, expect } from './fixtures';

/**
 * Meeting Rooms suite — minimal smoke coverage.
 *
 * The e2e-testspace org may or may not have meeting rooms configured.
 * Tests handle both states gracefully.
 *
 * Runs in the `app` Playwright project (authenticated, org: e2e-testspace).
 *
 * Implementation notes:
 * - MeetingRoomsPage returns null until currentOrg loads → use waitFor, not isVisible()
 * - isVisible() checks current DOM state immediately (no waiting) — unreliable after networkidle
 * - MeetingRoomHeader chevrons are scoped to their flex container to avoid matching
 *   other chevrons that may appear elsewhere in the layout
 * - "Go to Settings" renders as <a> (Button asChild + Link) — use getByRole('link')
 */

const MEETING_ROOMS_URL = '/e2e-testspace/meeting-rooms/';

/**
 * Wait for the page to settle into one of its two states:
 * - Rooms configured → h1 "Meeting Rooms" visible
 * - No rooms → h2 "No meeting rooms configured" visible
 * Returns true if rooms are configured.
 */
async function waitForPageReady(page: import('@playwright/test').Page): Promise<boolean> {
  const heading = page.getByRole('heading', { name: 'Meeting Rooms', exact: true });
  const emptyState = page.getByText('No meeting rooms configured', { exact: true });

  // Race: whichever state appears first wins
  await Promise.race([
    heading.waitFor({ state: 'visible', timeout: 25_000 }),
    emptyState.waitFor({ state: 'visible', timeout: 25_000 }),
  ]);

  return heading.isVisible();
}

test.describe('Meeting Rooms — page load', { tag: ['@smoke'] }, () => {
  test('page loads — shows meeting rooms or empty state', async ({ page }) => {
    await page.goto(MEETING_ROOMS_URL);
    await page.waitForLoadState('networkidle');

    const hasRooms = await waitForPageReady(page);

    if (hasRooms) {
      await expect(page.getByRole('heading', { name: 'Meeting Rooms', exact: true })).toBeVisible();
      // MeetingRoomHeader: date display button ("Today" / formatted date) is always present
      await expect(page.getByRole('button', { name: /today|mon|tue|wed|thu|fri|sat|sun/i })).toBeVisible();
    } else {
      await expect(page.getByText('No meeting rooms configured', { exact: true })).toBeVisible();
      // "Go to Settings" renders as <a> via Button asChild + Link
      await expect(page.getByRole('link', { name: 'Go to Settings' })).toBeVisible();
    }
  });
});

test.describe('Meeting Rooms — date navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MEETING_ROOMS_URL);
    await page.waitForLoadState('networkidle');
  });

  test('next/prev buttons change the displayed date', async ({ page }) => {
    const hasRooms = await waitForPageReady(page);
    if (!hasRooms) {
      test.skip();
      return;
    }

    // MeetingRoomHeader: the date button shows "Today", "Tomorrow", or a short date.
    // The prev/next chevron buttons are siblings of that date button.
    // Scope to the flex container that holds the date button to avoid ambiguity.
    const navRow = page.locator('div.flex.items-center.gap-2').filter({
      has: page.getByRole('button', { name: /today|tomorrow|mon|tue|wed|thu|fri|sat|sun/i }),
    });

    const prevBtn = navRow.locator('button').nth(0);
    const nextBtn = navRow.locator('button').nth(1);

    await expect(prevBtn).toBeVisible({ timeout: 10_000 });
    await expect(nextBtn).toBeVisible();

    // Capture current date label
    const dateBtn = navRow.getByRole('button', { name: /today|tomorrow|mon|tue|wed|thu|fri|sat|sun/i });
    const labelBefore = await dateBtn.textContent();

    await nextBtn.click();
    await page.waitForTimeout(300);

    // Date label should change after navigating forward
    const labelAfter = await dateBtn.textContent();
    expect(labelAfter).not.toBe(labelBefore);

    // Navigate back — page still renders without error
    await prevBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: 'Meeting Rooms', exact: true })).toBeVisible();
  });
});
