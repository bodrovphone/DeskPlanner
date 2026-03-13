import { test, expect } from './fixtures';

/**
 * Login / Returning User suite
 *
 * Tests the /login page flow for unauthenticated users.
 * Note: "already logged in" redirect is tested within the `app` project
 * (which uses saved storageState), so it's a separate test below.
 */

test.describe('Login page', () => {
  // Clear storageState so these tests run unauthenticated
  // (the `app` project injects auth state by default)
  test.use({ storageState: { cookies: [], origins: [] } });
  test('page loads with form visible', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('OhMyDesk', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('bodrovphone+e2e@gmail.com');
    await page.getByLabel('Password').fill('wrong-password-123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Supabase returns "Invalid login credentials"
    await expect(page.getByText('Invalid login credentials')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('successful login redirects to calendar', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(!email || !password, 'Missing test credentials');
      return;
    }

    await page.goto('/login');

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should redirect to /:slug/calendar
    await page.waitForURL('**/*/calendar', { timeout: 15_000 });
    expect(page.url()).toContain('/calendar');
  });

  test('sign up link navigates to /signup', async ({ page }) => {
    await page.goto('/login');

    const signUpLink = page.getByRole('link', { name: 'Sign up' });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute('href', '/signup');
  });
});

test.describe('Already authenticated', () => {
  // This test uses storageState from auth-setup (via the `app` project config)
  test('visiting /login while authenticated redirects to /app', async ({ page }) => {
    await page.goto('/login');

    // PublicOnlyRoute redirects authenticated users to /app,
    // which then redirects to /:slug/calendar
    await page.waitForURL('**/*/calendar', { timeout: 15_000 });
    expect(page.url()).toContain('/calendar');
  });
});
