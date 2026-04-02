import { test, expect } from './fixtures';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sign Up suite — /signup page validation, navigation, and account creation.
 *
 * The final test creates a fresh timestamped account and saves the Supabase
 * auth state to e2e/.auth/signup.json for the `onboarding` project to consume.
 *
 * All tests run unauthenticated (storageState cleared via test.use).
 *
 * Accumulated accounts: bodrovphone+e2e+{timestamp}@gmail.com
 * Cleanup query: SELECT * FROM auth.users WHERE email LIKE 'bodrovphone+e2e+%@gmail.com'
 */

const SIGNUP_AUTH_STATE = path.join(__dirname, '.auth/signup.json');

test.describe('Sign Up', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('page loads with all form fields and submit button', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByText('Create an account')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  });

  test('submit button is disabled when fields are empty', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeDisabled();
  });

  test('shows error when password is shorter than 6 characters', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel('Full Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('abc');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('sign in link points to /login', async ({ page }) => {
    await page.goto('/signup');

    const link = page.getByRole('link', { name: 'Sign in' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });

  test('successful signup redirects to /onboarding and saves auth state', async ({ page }) => {
    const password = process.env.E2E_SIGNUP_PASSWORD;
    if (!password) {
      test.skip(!password, 'Missing E2E_SIGNUP_PASSWORD in .env.test');
      return;
    }

    const timestamp = Date.now();
    const email = `bodrovphone+e2e+${timestamp}@gmail.com`;

    await page.goto('/signup');
    await page.getByLabel('Full Name').fill('E2E Test User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await page.waitForURL('/onboarding', { timeout: 15_000 });
    expect(page.url()).toContain('/onboarding');

    // Persist auth state for the onboarding project
    const authDir = path.dirname(SIGNUP_AUTH_STATE);
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
    await page.context().storageState({ path: SIGNUP_AUTH_STATE });
  });
});
