-- Migration: Add operational expenses tracking
-- Date: 2025-11-13
-- Purpose: Store rent, coffee, bills, and other operational costs for profit/loss calculations
-- Run this in Supabase SQL Editor or via CLI

-- Create table for operational expenses
CREATE TABLE IF NOT EXISTS operational_expenses (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'rent',
    'utilities',
    'coffee',
    'supplies',
    'internet',
    'cleaning',
    'maintenance',
    'other'
  )),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'BGN')),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN (
    'monthly',
    'yearly',
    'one-time'
  )),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_operational_expenses_category
  ON operational_expenses(category);

CREATE INDEX IF NOT EXISTS idx_operational_expenses_created_at
  ON operational_expenses(created_at);

CREATE INDEX IF NOT EXISTS idx_operational_expenses_frequency
  ON operational_expenses(frequency);

-- Add RLS (Row Level Security) policies
ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users
-- Note: Adjust this based on your specific authentication setup
CREATE POLICY "Allow authenticated read access" ON operational_expenses
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow insert/update/delete to authenticated users
-- Note: You may want to restrict this to admin users only
CREATE POLICY "Allow authenticated write access" ON operational_expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Optional: Add policy for anonymous read access (if using anon key for public read)
-- Uncomment if you want unauthenticated users to read expenses
-- CREATE POLICY "Allow anonymous read access" ON operational_expenses
--   FOR SELECT
--   TO anon
--   USING (true);

-- Add table and column comments for documentation
COMMENT ON TABLE operational_expenses IS 'Stores operational expenses like rent, utilities, coffee, etc. for profit/loss calculations. Used to track costs against booking revenue.';
COMMENT ON COLUMN operational_expenses.category IS 'Expense category: rent, utilities, coffee, supplies, internet, cleaning, maintenance, or other';
COMMENT ON COLUMN operational_expenses.amount IS 'Expense amount in specified currency. Must be non-negative.';
COMMENT ON COLUMN operational_expenses.currency IS 'Currency code: USD, EUR, or BGN';
COMMENT ON COLUMN operational_expenses.frequency IS 'How often the expense occurs: monthly (recurring), yearly (annual), or one-time (single occurrence)';
COMMENT ON COLUMN operational_expenses.description IS 'Optional notes or description for this expense';

-- Insert some example data (optional - remove in production)
-- Uncomment these to add sample expenses for testing
/*
INSERT INTO operational_expenses (category, amount, currency, frequency, description) VALUES
  ('rent', 2000.00, 'BGN', 'monthly', 'Office space rent'),
  ('utilities', 300.00, 'BGN', 'monthly', 'Electricity and water'),
  ('coffee', 150.00, 'BGN', 'monthly', 'Coffee, tea, and snacks'),
  ('internet', 80.00, 'BGN', 'monthly', 'Internet and phone service'),
  ('cleaning', 200.00, 'BGN', 'monthly', 'Professional cleaning service');
*/

-- Verification queries (uncomment to run)
-- SELECT * FROM operational_expenses ORDER BY category;
-- SELECT category, COUNT(*), SUM(amount) as total FROM operational_expenses GROUP BY category;
