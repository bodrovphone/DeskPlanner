-- Migration: Add expenses and recurring expenses tables
-- Date: 2025-01-16
-- Purpose: Track individual expenses by date and manage recurring expense templates

-- Create table for individual expenses
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR')),
  category TEXT NOT NULL CHECK (category IN ('rent', 'supplies', 'internet')),
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_expense_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for recurring expense templates
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id BIGSERIAL PRIMARY KEY,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR')),
  category TEXT NOT NULL CHECK (category IN ('rent', 'supplies', 'internet')),
  description TEXT,
  day_of_month INTEGER DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 28),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_id ON expenses(recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated read access
CREATE POLICY "Allow authenticated read access for expenses" ON expenses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access for recurring_expenses" ON recurring_expenses
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow insert/update/delete to authenticated users
CREATE POLICY "Allow authenticated write access for expenses" ON expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated write access for recurring_expenses" ON recurring_expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add table comments
COMMENT ON TABLE expenses IS 'Individual expense records by date for tracking costs against revenue.';
COMMENT ON TABLE recurring_expenses IS 'Templates for recurring expenses that auto-generate monthly expense records.';
