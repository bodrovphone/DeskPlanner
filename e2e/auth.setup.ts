import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_STATE = path.join(__dirname, '.auth/user.json');

/**
 * Auth setup project — logs in with the permanent test account
 * and saves session state for reuse by all `app-*` test suites.
 *
 * Runs once before any authenticated suite via Playwright `dependencies`.
 */
setup('authenticate as test user', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD in .env.test',
    );
  }

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_STATE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Disable Umami analytics for e2e tests
  await page.evaluate(() => localStorage.setItem('umami.disabled', '1'));

  // Fill credentials and submit
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect to the app (calendar page)
  await page.waitForURL('**/*/calendar', { timeout: 15_000 });

  // Save signed-in state
  await page.context().storageState({ path: AUTH_STATE });
});
