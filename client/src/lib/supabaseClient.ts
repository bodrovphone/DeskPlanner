import { createClient } from '@supabase/supabase-js';

// Create a single instance of the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase environment variables not configured');
}

// Single shared instance
export const supabaseClient = createClient(supabaseUrl || '', supabaseKey || '');