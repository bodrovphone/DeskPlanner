import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('page loads with correct title', { tag: ['@smoke'] }, async ({ page }) => {
  await expect(page).toHaveTitle(/OhMyDesk/);
});

test('nav Log In and Sign Up buttons are visible and link correctly', { tag: ['@smoke'] }, async ({ page }) => {
  // MarketingNav labels (case-sensitive): "Log in" and "Start Free"
  const loginLink = page.locator('nav a[href="/login/"]');
  await expect(loginLink).toBeVisible();
  await expect(loginLink).toContainText('Log in');

  const signupLink = page.locator('nav a[href="/signup/"]');
  await expect(signupLink).toBeVisible();
  await expect(signupLink).toContainText('Start Free');
});

test('hero CTA links to signup', { tag: ['@smoke'] }, async ({ page }) => {
  // The hero section has a signup CTA; the nav has the login link
  const startFree = page.locator('section a[href="/signup/"]').first();
  await expect(startFree).toBeVisible({ timeout: 5_000 });

  // Login link is in the nav, not in a section
  const navLogin = page.locator('a[href="/login/"]').first();
  await expect(navLogin).toBeVisible({ timeout: 5_000 });
});

test('bottom CTA links to signup', { tag: ['@smoke'] }, async ({ page }) => {
  const cta = page.getByRole('button', { name: /Get Started Free/i });
  await expect(cta).toBeVisible();

  const link = page.locator('a[href="/signup/"]', { has: cta });
  await expect(link).toBeVisible();
});
