import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test for e2e credentials
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const AUTH_STATE = 'e2e/.auth/user.json';
const SIGNUP_AUTH_STATE = 'e2e/.auth/signup.json';

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
    {
      name: 'member-booking',
      testMatch: 'member-booking.spec.ts',
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
      use: {
        // Use auth state saved by the signup test; fall back to empty state if not yet created
        storageState: fs.existsSync(path.resolve(__dirname, SIGNUP_AUTH_STATE))
          ? SIGNUP_AUTH_STATE
          : { cookies: [], origins: [] },
      },
    },

    // Authenticated app suites — depend on auth-setup
    // timeout bumped to 60s: production Supabase round-trips from CI runners
    // are slower than localhost. OrgGate shows a LoadingScreen until org data
    // loads, so the first page render after networkidle can be delayed.
    {
      name: 'app',
      testMatch: 'app-*.spec.ts',
      dependencies: ['auth-setup'],
      use: {
        storageState: AUTH_STATE,
      },
      timeout: 60_000,
    },
  ],
});
