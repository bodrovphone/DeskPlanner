import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * Onboarding suite — the 5-step wizard for new accounts.
 *
 * Depends on the `signup` project: the last test in signup.spec.ts creates a
 * fresh account and saves auth state to e2e/.auth/signup.json, which the
 * `onboarding` project in playwright.config.ts loads as storageState.
 *
 * If E2E_SIGNUP_PASSWORD is missing (signup tests skipped), these tests are
 * also skipped via the beforeAll guard.
 *
 * Steps: 0 Space Info → 1 Rooms & Desks → 2 Meeting Rooms → 3 Currency → 4 Notifications
 */

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Fill Step 0 (Space Info) with a unique name and wait for slug availability,
 * then optionally click Next to advance to step 1.
 */
async function fillStep0(page: Page, advance = false) {
  await page.getByLabel('Space Name').fill(`E2E Onboard ${Date.now()}`);
  await expect(page.getByText('This URL is available')).toBeVisible({ timeout: 10_000 });
  if (advance) {
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Set up rooms & desks')).toBeVisible({ timeout: 5_000 });
  }
}

/** Advance from step 1 (Rooms & Desks) to step 2 (Meeting Rooms). */
async function advanceStep1(page: Page) {
  await expect(page.getByText('Set up rooms & desks')).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Meeting rooms', { exact: true })).toBeVisible({ timeout: 5_000 });
}

/** Advance from step 2 (Meeting Rooms) to step 3 (Currency). */
async function advanceStep2(page: Page) {
  await expect(page.getByText('Meeting rooms', { exact: true })).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Choose your currency')).toBeVisible({ timeout: 5_000 });
}

// ── Step 0: Space Info ────────────────────────────────────────────────────────

test.describe('Onboarding — Step 0: Space Info', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_SIGNUP_PASSWORD) {
      test.skip(true, 'Missing E2E_SIGNUP_PASSWORD — signup suite was not run');
    }
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
  });

  test('space name input and URL preview are visible', async ({ page }) => {
    await expect(page.getByLabel('Space Name')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Your space URL')).toBeVisible();
  });

  test('slug auto-generates from space name', async ({ page }) => {
    await page.getByLabel('Space Name').fill('My Test Hub');
    // Slug is shown inside the URL preview element
    await expect(page.getByText('my-test-hub')).toBeVisible({ timeout: 3_000 });
  });

  test('shows "This URL is available" for a unique slug', async ({ page }) => {
    await page.getByLabel('Space Name').fill(`E2E Space ${Date.now()}`);
    await expect(page.getByText('This URL is available')).toBeVisible({ timeout: 10_000 });
  });

  test('Next button is disabled until slug is confirmed available', async ({ page }) => {
    // No name filled yet — Next must be disabled
    await expect(page.getByRole('button', { name: 'Next' }).first()).toBeDisabled();
  });

  test('Next advances to Rooms & Desks (Step 1)', async ({ page }) => {
    await fillStep0(page, true);
    await expect(page.getByText('Set up rooms & desks')).toBeVisible();
  });
});

// ── Step 1: Rooms & Desks ─────────────────────────────────────────────────────

test.describe('Onboarding — Step 1: Rooms & Desks', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_SIGNUP_PASSWORD) {
      test.skip(true, 'Missing E2E_SIGNUP_PASSWORD — signup suite was not run');
    }
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    await fillStep0(page, true);
  });

  test('rooms & desks card renders with room count selector and room inputs', async ({ page }) => {
    // Number of Rooms selector (Radix Select — renders as combobox)
    await expect(page.getByRole('combobox')).toBeVisible();
    // Room name inputs and desk count inputs rendered per room
    await expect(page.getByPlaceholder('Room 1')).toBeVisible();
  });

  test('working days toggles are visible', async ({ page }) => {
    // Day toggle buttons are rendered for Mon–Sun
    await expect(page.getByText('Mon')).toBeVisible();
    await expect(page.getByText('Fri')).toBeVisible();
  });

  test('Back returns to Space Info', async ({ page }) => {
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByLabel('Space Name')).toBeVisible({ timeout: 5_000 });
  });

  test('Next advances to Meeting Rooms (Step 2)', async ({ page }) => {
    await advanceStep1(page);
    await expect(page.getByText('Meeting rooms', { exact: true })).toBeVisible();
  });
});

// ── Step 2: Meeting Rooms ─────────────────────────────────────────────────────

test.describe('Onboarding — Step 2: Meeting Rooms', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_SIGNUP_PASSWORD) {
      test.skip(true, 'Missing E2E_SIGNUP_PASSWORD — signup suite was not run');
    }
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    await fillStep0(page, true);
    await advanceStep1(page);
  });

  test('meeting rooms choice card renders with two options', async ({ page }) => {
    await expect(page.getByText('No, desks only')).toBeVisible();
    await expect(page.getByText('Yes, I have meeting rooms')).toBeVisible();
  });

  test('selecting "Yes" reveals meeting room name and rate inputs', async ({ page }) => {
    await page.getByText('Yes, I have meeting rooms').click();
    await expect(page.getByPlaceholder('Meeting Room 1')).toBeVisible({ timeout: 3_000 });
  });

  test('Next advances to Currency (Step 3)', async ({ page }) => {
    await advanceStep2(page);
    await expect(page.getByText('Choose your currency')).toBeVisible();
  });
});

// ── Step 3: Currency ──────────────────────────────────────────────────────────

test.describe('Onboarding — Step 3: Currency', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_SIGNUP_PASSWORD) {
      test.skip(true, 'Missing E2E_SIGNUP_PASSWORD — signup suite was not run');
    }
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    await fillStep0(page, true);
    await advanceStep1(page);
    await advanceStep2(page);
  });

  test('currency buttons and price input are visible', async ({ page }) => {
    // Currency buttons — use role to avoid matching label text like "Euro" or "US Dollar"
    await expect(page.getByRole('button', { name: /USD/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /EUR/ })).toBeVisible();
    // Price input renders as spinbutton
    await expect(page.getByRole('spinbutton')).toBeVisible();
  });

  test('"Create Space" button is visible and enabled', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Create Space' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Space' })).toBeEnabled();
  });
});

// ── Full flow ─────────────────────────────────────────────────────────────────

test.describe('Onboarding — Full flow', () => {
  test('completing onboarding creates space and redirects to /:slug/calendar', async ({ page }) => {
    if (!process.env.E2E_SIGNUP_PASSWORD) {
      test.skip(true, 'Missing E2E_SIGNUP_PASSWORD — signup suite was not run');
    }

    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    // Step 0: fill space name with unique slug
    const spaceName = `E2E Finish ${Date.now()}`;
    await page.getByLabel('Space Name').fill(spaceName);
    await expect(page.getByText('This URL is available')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 1: Rooms & Desks — default config is fine
    await expect(page.getByText('Set up rooms & desks')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: Meeting Rooms — skip (default "No, desks only")
    await expect(page.getByText('Meeting rooms', { exact: true })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Currency — default EUR is fine, click "Create Space"
    await expect(page.getByText('Choose your currency')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Create Space' }).click();

    // Step 4: Notifications — skip Telegram
    await expect(page.getByText('Connect Telegram notifications')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Skip for now' }).click();

    // Should land on /:slug/calendar
    await page.waitForURL('**/*/calendar', { timeout: 15_000 });
    expect(page.url()).toContain('/calendar');
  });
});
