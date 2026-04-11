import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('page loads with correct title', { tag: ['@smoke'] }, async ({ page }) => {
  await expect(page).toHaveTitle(/OhMyDesk/);
});

test('nav Log In and Sign Up buttons are visible and link correctly', { tag: ['@smoke'] }, async ({ page }) => {
  const loginLink = page.locator('nav a[href="/login"]');
  await expect(loginLink).toBeVisible();
  await expect(loginLink).toContainText('Log In');

  const signupLink = page.locator('nav a[href="/signup"]');
  await expect(signupLink).toBeVisible();
  await expect(signupLink).toContainText('Sign Up');
});

test('hero CTAs link to signup and login', { tag: ['@smoke'] }, async ({ page }) => {
  const startFree = page.locator('section a[href="/signup"]').first();
  await expect(startFree).toBeVisible({ timeout: 5_000 });

  const heroLogin = page.locator('section a[href="/login"]').first();
  await expect(heroLogin).toBeVisible({ timeout: 5_000 });
});

test('bottom CTA links to signup', { tag: ['@smoke'] }, async ({ page }) => {
  const cta = page.getByRole('button', { name: /Get Started Free/i });
  await expect(cta).toBeVisible();

  const link = page.locator('a[href="/signup"]', { has: cta });
  await expect(link).toBeVisible();
});
