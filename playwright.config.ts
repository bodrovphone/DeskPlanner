import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test for e2e credentials
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const AUTH_STATE = 'e2e/.auth/user.json';

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://ohmydesk.app',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    // No auth needed
    {
      name: 'landing',
      testMatch: 'landing.spec.ts',
    },
    {
      name: 'public-booking',
      testMatch: 'public-booking.spec.ts',
    },

    // Auth setup — logs in and saves session state
    {
      name: 'auth-setup',
      testMatch: 'auth.setup.ts',
    },

    // Sign up + onboarding (creates fresh account each run)
    {
      name: 'signup',
      testMatch: 'signup.spec.ts',
    },
    {
      name: 'onboarding',
      testMatch: 'onboarding.spec.ts',
      dependencies: ['signup'],
    },

    // Authenticated app suites — depend on auth-setup
    {
      name: 'app',
      testMatch: 'app-*.spec.ts',
      dependencies: ['auth-setup'],
      use: {
        storageState: AUTH_STATE,
      },
    },
  ],
});
