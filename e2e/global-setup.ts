import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

/**
 * Playwright globalSetup — runs once before all projects.
 * Resets the e2e test org's bookings to a known state with relative dates.
 */
export default async function globalSetup() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!supabaseUrl || !supabaseKey || !email || !password) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, E2E_TEST_EMAIL, or E2E_TEST_PASSWORD in .env.test');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Sign in so the RPC runs as the test user (RLS context)
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    throw new Error(`Global setup auth failed: ${authError.message}`);
  }

  // Reset test data with relative dates
  const { error: rpcError } = await supabase.rpc('reset_e2e_test_data');
  if (rpcError) {
    throw new Error(`reset_e2e_test_data failed: ${rpcError.message}`);
  }

  console.log('[global-setup] Test data reset to relative dates');
}
