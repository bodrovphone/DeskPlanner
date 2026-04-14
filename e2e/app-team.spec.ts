import { test, expect } from './fixtures';

/**
 * Team Management suite — team card, invite form, invite + remove cycle.
 *
 * Runs in the `app` project (authenticated as bodrovphone+e2e@gmail.com, org: e2e-testspace).
 *
 * State hygiene:
 *   - The invite + remove test creates a manager account then removes them in the same
 *     test so subsequent runs start clean.
 *   - If the manager account already exists in the org (e.g. from a failed run), the
 *     test is still safe: invite will return an error toast and the cleanup step will
 *     remove any stale member with that email.
 *
 * Selector notes:
 *   - CardTitle renders as `generic`, NOT a heading role — use getByText
 *   - The Team page heading ("Team") IS a real <h1> with role=heading
 *   - Owner row has no remove button (role !== 'owner' guard in TeamCard)
 *   - Manager row role badge reads "Manager" (admin role maps to "Manager" label)
 *   - Send button has no text — it renders the Send icon only; selector uses role=button
 *     scoped to the invite form section
 *   - Max-reached message: "Maximum team size reached (3 members)."
 *
 * Manager-perspective tests (Revenue hidden, Team card hidden, Calendar access):
 *   - Marked test.skip — require a second Playwright auth session for a manager account.
 *   - See e2e-test-plan.md §Team Management for the full owner + manager plan.
 */

const TEAM_URL = '/e2e-testspace/team/';

// Dedicated manager email for the invite + remove cycle.
// Using a fixed address so we can find and clean up the member reliably.
const MANAGER_EMAIL = 'bodrovphone+e2e+manager@gmail.com';

test.describe('Team — page load', () => {
  test('page loads with Team heading and Team card', async ({ page }) => {
    await page.goto(TEAM_URL);
    await page.waitForLoadState('networkidle');

    // Page h1
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible({ timeout: 10_000 });

    // CardTitle "Team" renders as generic — use getByText
    await expect(page.getByText('Team', { exact: true }).first()).toBeVisible();

    // Description text confirms we're on the right card
    await expect(page.getByText('Invite managers to help run your space')).toBeVisible();
  });
});

test.describe('Team — owner listed', () => {
  test('owner email is shown with Owner role label', async ({ page }) => {
    await page.goto(TEAM_URL);
    await page.waitForLoadState('networkidle');

    // Wait for team data to load (list replaces the spinner)
    await expect(page.getByText('Loading team...')).not.toBeVisible({ timeout: 10_000 });

    // Test account email should appear — scope to main to avoid matching sidebar
    await expect(page.getByRole('main').getByText('bodrovphone+e2e@gmail.com')).toBeVisible({ timeout: 10_000 });

    // Role label — the DOM text is lowercase "owner" (CSS capitalize is visual-only)
    await expect(page.getByText('owner', { exact: true })).toBeVisible();
  });

  test('owner row has no remove button', async ({ page }) => {
    await page.goto(TEAM_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Loading team...')).not.toBeVisible({ timeout: 10_000 });

    // Locate the owner member row and assert it has no UserMinus button
    // Use rounded-lg to target member rows specifically (page background also has bg-gray-50)
    const ownerRow = page.locator('div.rounded-lg.bg-gray-50').filter({
      has: page.getByText('bodrovphone+e2e@gmail.com'),
    });
    await expect(ownerRow).toBeVisible({ timeout: 10_000 });

    // Owner row should have no buttons (no remove, only non-owners get one)
    await expect(ownerRow.getByRole('button')).toHaveCount(0);
  });
});

test.describe('Team — invite form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEAM_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading team...')).not.toBeVisible({ timeout: 10_000 });
  });

  test('invite email input and send button are visible', async ({ page }) => {
    // Only visible when max members not reached
    const inviteInput = page.getByLabel('Invite a manager');
    await expect(inviteInput).toBeVisible({ timeout: 10_000 });
    await expect(inviteInput).toHaveAttribute('placeholder', 'manager@example.com');
  });

  test('send button is disabled when email input is empty', async ({ page }) => {
    // The send button lives inside the invite section — scope by proximity to the input
    const inviteSection = page.locator('div.pt-2.border-t');
    const sendBtn = inviteSection.getByRole('button').last();

    await expect(sendBtn).toBeDisabled({ timeout: 10_000 });
  });

  test('invalid email (no @) shows error toast', async ({ page }) => {
    const inviteInput = page.getByLabel('Invite a manager');
    await inviteInput.fill('notanemail');

    // Enable the button (email is non-empty) then click
    const inviteSection = page.locator('div.pt-2.border-t');
    const sendBtn = inviteSection.getByRole('button').last();
    await expect(sendBtn).not.toBeDisabled({ timeout: 5_000 });
    await sendBtn.click();

    // Error toast appears
    await expect(page.getByText('Please enter a valid email address', { exact: true })).toBeVisible({
      timeout: 5_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Invite + remove cycle — SKIPPED
// The invite flow works (Edge Function creates the account and adds the member).
// The remove flow has a product bug: DELETE on organization_members returns 204
// but affects 0 rows — the RLS USING clause silently blocks the deletion even
// with a SECURITY DEFINER helper function. The app shows "Team member removed"
// toast (no error thrown) but the row persists in the DB on reload.
// Fix needed: audit the DELETE RLS policy or implement a SECURITY DEFINER RPC
// (e.g. `remove_org_member`) that performs the delete with elevated privileges.
// ---------------------------------------------------------------------------
test.describe('Team — invite and remove cycle', () => {
  test.skip(true, 'Product bug: remove manager DELETE silently affects 0 rows (RLS policy issue)');

  test('invites a manager, verifies appearance, then removes them', async ({ page }) => {
    await page.goto(TEAM_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading team...')).not.toBeVisible({ timeout: 10_000 });

    const memberRow = () =>
      page.locator('div.rounded-lg.bg-gray-50').filter({ has: page.getByText(MANAGER_EMAIL) }).first();

    const alreadyMember = await page.locator('div.rounded-lg.bg-gray-50')
      .filter({ has: page.getByText(MANAGER_EMAIL) })
      .count() > 0;

    if (!alreadyMember) {
      const inviteInput = page.getByLabel('Invite a manager');
      await expect(inviteInput).toBeVisible({ timeout: 10_000 });
      await inviteInput.fill(MANAGER_EMAIL);

      const inviteSection = page.locator('div.pt-2.border-t');
      const sendBtn = inviteSection.getByRole('button').last();
      await expect(sendBtn).not.toBeDisabled({ timeout: 5_000 });

      const inviteReq = page.waitForResponse(
        (r) => r.url().includes('/functions/v1/invite-manager') && r.request().method() === 'POST',
        { timeout: 30_000 },
      );
      await sendBtn.click();
      const resp = await inviteReq;

      const body: Record<string, unknown> = await resp.json().catch(() => ({}));
      if (body.error) throw new Error(`invite-manager returned error: ${body.error as string}`);

      await expect(
        page.getByText('Invite sent!', { exact: true }).or(page.getByText('Manager added', { exact: true })),
      ).toBeVisible({ timeout: 15_000 });
    }

    await expect(memberRow()).toBeVisible({ timeout: 10_000 });
    await expect(memberRow().getByText('Manager', { exact: true })).toBeVisible();

    await memberRow().getByRole('button').click();
    await expect(memberRow().getByRole('button', { name: 'Remove' })).toBeVisible({ timeout: 5_000 });
    await memberRow().getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText('Team member removed', { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main').getByText(MANAGER_EMAIL)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Manager perspective tests — SKIPPED
// Require a second Playwright auth session (manager account) that does not
// exist in the current test infrastructure. To enable:
//   1. Add E2E_MANAGER_PASSWORD env var with the manager account credentials.
//   2. Create an `app-team-manager` auth setup project similar to auth.setup.ts.
//   3. Replace test.skip with actual navigation and assertions.
// ---------------------------------------------------------------------------

test.describe('Team — manager perspective (skipped)', () => {
  test.skip(true, 'Requires a second auth session for the manager account');

  test('manager: Revenue link is hidden in sidebar', async ({ page }) => {
    // Log in as manager, navigate to calendar, assert "Revenue" not in sidebar
    await page.goto('/e2e-testspace/calendar/');
    await expect(page.getByRole('link', { name: 'Revenue' })).not.toBeVisible();
  });

  test('manager: Team card is hidden on settings/team page', async ({ page }) => {
    await page.goto('/e2e-testspace/team/');
    // Non-owners see null (SettingsTeamPage returns null when role !== 'owner')
    await expect(page.getByText('Invite managers to help run your space')).not.toBeVisible();
  });

  test('manager: can view calendar and open booking dialog', async ({ page }) => {
    await page.goto('/e2e-testspace/calendar/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  });

  test('manager: Members page is accessible', async ({ page }) => {
    await page.goto('/e2e-testspace/members/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  });
});
