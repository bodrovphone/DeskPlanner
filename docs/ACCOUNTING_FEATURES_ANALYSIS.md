# Accounting Features Analysis & Implementation Plan

**Project:** DeskPlanner
**Date:** 2025-11-13
**Purpose:** Analysis and roadmap for implementing accounting and financial tracking features

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Required Changes](#required-changes)
3. [Database Schema Changes](#database-schema-changes)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Technical Specifications](#technical-specifications)

---

## Current State Analysis

### 1. Price Field Implementation

**Location:** `shared/schema.ts:16`
```typescript
price: z.number().optional(), // Daily price for the booking
```

**Current Behavior:**
- Schema defines price as `number` (✓ correct type)
- Price is **optional** for all bookings (❌ needs change)
- No validation distinguishing paid vs unpaid bookings

**UI Implementation:** `client/src/components/BookingModal.tsx`
```typescript
// Line 41: State stored as string (requires parsing)
const [price, setPrice] = useState('');

// Line 82: Parsed to number before saving
const parsedPrice = parseFloat(price);

// Line 276: Input field uses type="number" (✓ correct)
<Input id="price" type="number" ... />

// Line 145-146: Validation requires price for ALL bookings (❌ needs change)
price.trim() && !isNaN(parseFloat(price)) && parseFloat(price) >= 0
```

**Problems:**
1. Price is required for both "booked" (unpaid) and "assigned" (paid) bookings
2. No conditional validation based on booking status
3. Users must enter price even for non-paid reservations

### 2. Booking Status Types

**Location:** `shared/schema.ts:3`, `BookingModal.tsx:236-260`

Two booking statuses exist:
- **"booked"**: Reserved but not paid (line 246-248)
- **"assigned"**: Paid and confirmed (line 250-258)

**Current Issue:** Price validation doesn't distinguish between these types.

### 3. Database Configuration

**Database:** Supabase (PostgreSQL)
**Storage Type:** Hybrid (localStorage + Supabase sync)

**Configuration Files:**
- `.env.example` - Environment variables template
- `client/src/lib/supabaseClient.ts` - Supabase client initialization
- `client/src/lib/supabaseDataStore.ts` - Data access layer

**Database Table Structure (Inferred from SupabaseDataStore):**

Table: `desk_bookings`
```sql
-- Current structure (inferred from mapToDatabase function, line 384-400)
{
  id: INTEGER (PRIMARY KEY),
  desk_id: TEXT,
  date: TEXT,        -- YYYY-MM-DD format
  start_date: TEXT,  -- YYYY-MM-DD format
  end_date: TEXT,    -- YYYY-MM-DD format
  status: TEXT,      -- 'available' | 'booked' | 'assigned'
  person_name: TEXT,
  title: TEXT,
  price: ??? ,       -- ⚠️ TYPE UNCLEAR - could be TEXT or NUMERIC
  currency: TEXT,    -- 'USD' | 'EUR' | 'BGN'
  created_at: TIMESTAMP
}
```

**Critical Unknown:** The actual database column type for `price` is not confirmed. Could be:
- `TEXT` (bad - would need migration)
- `NUMERIC` (good - correct type)
- `REAL` / `DOUBLE PRECISION` (acceptable)

### 4. Statistics & Revenue Tracking

**Current Stats:** `client/src/lib/supabaseDataStore.ts:205-241`

The `getDeskStats()` function only tracks:
- Available desks count
- Assigned (paid) bookings count
- Booked (unpaid) bookings count

**No financial metrics tracked:**
- ❌ Total revenue
- ❌ Revenue per month
- ❌ Revenue per booking status
- ❌ Average booking price
- ❌ Operational expenses
- ❌ Profit/loss calculations

### 5. Settings & Configuration

**Location:** `shared/schema.ts:30-34`, `client/src/lib/settings.ts`

Current `AppSettings` schema:
```typescript
export const appSettingsSchema = z.object({
  currency: currencySchema.default("USD"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

**Missing:** No support for operational expenses configuration (rent, coffee, bills, etc.)

### 6. Migration Infrastructure

**Status:** ❌ **No migration system exists**

Search Results:
- No `/supabase/` directory found
- No migration files (`.sql`) found
- No schema management utilities detected

**Implications:**
- Database schema changes must be created manually
- No version control for database structure
- Migration files need to be created for the user to run

---

## Required Changes

### Priority 1: Critical Data Integrity

#### 1.1 Price Field Validation
**File:** `client/src/components/BookingModal.tsx:145-147`

**Current:**
```typescript
const isValidForm = personName.trim() &&
  price.trim() && !isNaN(parseFloat(price)) && parseFloat(price) >= 0 &&
  startDate && endDate && startDate <= endDate;
```

**Required Change:**
```typescript
const isValidForm = personName.trim() &&
  // Price required only for "assigned" (paid) bookings
  (status === 'booked' || (price.trim() && !isNaN(parseFloat(price)) && parseFloat(price) >= 0)) &&
  startDate && endDate && startDate <= endDate;
```

**Rationale:**
- "booked" status = unpaid reservation → price optional
- "assigned" status = paid booking → price required

#### 1.2 Schema Update
**File:** `shared/schema.ts:16-17`

**Option A: Keep Simple (Recommended)**
```typescript
price: z.number().optional(),
currency: currencySchema.optional(),
```
- Validation handled in UI
- Flexibility for future changes
- Backward compatible

**Option B: Add Custom Validation**
```typescript
price: z.number().optional(),
currency: currencySchema.optional(),
}).refine((data) => {
  // If status is 'assigned', price must be provided and > 0
  if (data.status === 'assigned') {
    return data.price != null && data.price >= 0;
  }
  return true;
}, {
  message: "Price is required for paid (assigned) bookings",
  path: ["price"],
});
```
- Validation at schema level
- More robust
- Requires schema change everywhere booking is created

**Recommendation:** Start with Option A (UI validation), migrate to Option B later.

### Priority 2: Database Schema Verification & Migration

#### 2.1 Verify Current Database Schema
**Action Required:** Run this SQL query in Supabase SQL Editor:

```sql
-- Check current column types for desk_bookings table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'desk_bookings'
ORDER BY ordinal_position;
```

**Expected Results to Check:**
- Is `price` column type `NUMERIC`, `DOUBLE PRECISION`, or `TEXT`?
- Is `price` nullable (`YES`)?

#### 2.2 Create Supabase Migration Directory Structure

**Directory Structure to Create:**
```
/home/user/DeskPlanner/
├── supabase/
│   └── migrations/
│       ├── 20250113000001_ensure_price_numeric.sql
│       └── 20250113000002_add_operational_expenses.sql
```

#### 2.3 Migration: Ensure Price is Numeric
**File:** `supabase/migrations/20250113000001_ensure_price_numeric.sql`

```sql
-- Migration: Ensure price column is NUMERIC type
-- Date: 2025-11-13
-- Purpose: Convert price from TEXT to NUMERIC if needed for accounting features

-- Step 1: Check if column is already numeric
DO $$
BEGIN
  -- Only alter if the column is not already numeric/double precision
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'desk_bookings'
      AND column_name = 'price'
      AND data_type NOT IN ('numeric', 'double precision', 'real')
  ) THEN

    -- Step 2: Create a temporary column
    ALTER TABLE desk_bookings
    ADD COLUMN price_numeric NUMERIC(10, 2);

    -- Step 3: Migrate data (handle NULL and invalid values)
    UPDATE desk_bookings
    SET price_numeric = CASE
      WHEN price IS NULL THEN NULL
      WHEN price ~ '^[0-9]+\.?[0-9]*$' THEN price::NUMERIC(10, 2)
      ELSE NULL
    END;

    -- Step 4: Drop old column and rename new one
    ALTER TABLE desk_bookings DROP COLUMN price;
    ALTER TABLE desk_bookings RENAME COLUMN price_numeric TO price;

    -- Step 5: Add check constraint (price must be non-negative)
    ALTER TABLE desk_bookings
    ADD CONSTRAINT price_non_negative CHECK (price IS NULL OR price >= 0);

    RAISE NOTICE 'Price column converted to NUMERIC(10, 2)';
  ELSE
    RAISE NOTICE 'Price column is already numeric type, no migration needed';
  END IF;
END $$;

-- Step 6: Add comment for documentation
COMMENT ON COLUMN desk_bookings.price IS 'Booking price in selected currency. Required for assigned (paid) bookings, optional for booked (unpaid) reservations.';
```

**Migration Features:**
- ✅ Safe: Checks if migration is needed
- ✅ Handles NULL values
- ✅ Handles invalid text data (sets to NULL)
- ✅ Uses NUMERIC(10, 2) for precise decimal values (up to 99,999,999.99)
- ✅ Adds constraint to prevent negative prices
- ✅ Idempotent (can run multiple times safely)

**To Run:** User must execute in Supabase SQL Editor or via CLI:
```bash
supabase db push
# or
psql <connection_string> -f supabase/migrations/20250113000001_ensure_price_numeric.sql
```

### Priority 3: Operational Expenses Schema

#### 3.1 Update AppSettings Schema
**File:** `shared/schema.ts:30-43`

**Add New Schema:**
```typescript
// New schema for operational expenses
export const operationalExpenseSchema = z.object({
  id: z.string(),
  category: z.enum(['rent', 'utilities', 'coffee', 'supplies', 'internet', 'cleaning', 'maintenance', 'other']),
  amount: z.number().min(0),
  currency: currencySchema,
  frequency: z.enum(['monthly', 'yearly', 'one-time']), // For future prorated calculations
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Update AppSettings to include expenses
export const appSettingsSchema = z.object({
  currency: currencySchema.default("USD"),
  operationalExpenses: z.array(operationalExpenseSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Export type
export type OperationalExpense = z.infer<typeof operationalExpenseSchema>;
```

**Backward Compatibility:** Using `.default([])` ensures existing data without expenses still works.

#### 3.2 Create Database Table for Operational Expenses
**File:** `supabase/migrations/20250113000002_add_operational_expenses.sql`

```sql
-- Migration: Add operational expenses tracking
-- Date: 2025-11-13
-- Purpose: Store rent, coffee, bills, and other operational costs

-- Create table
CREATE TABLE IF NOT EXISTS operational_expenses (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('rent', 'utilities', 'coffee', 'supplies', 'internet', 'cleaning', 'maintenance', 'other')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'BGN')),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'yearly', 'one-time')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX idx_operational_expenses_category ON operational_expenses(category);
CREATE INDEX idx_operational_expenses_created_at ON operational_expenses(created_at);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (adjust based on your auth setup)
CREATE POLICY "Allow authenticated read access" ON operational_expenses
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert/update/delete to authenticated users (adjust as needed)
CREATE POLICY "Allow authenticated write access" ON operational_expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE operational_expenses IS 'Stores operational expenses like rent, utilities, coffee, etc. for profit/loss calculations';
```

### Priority 4: UI Components for Expense Management

#### 4.1 Create OperationalExpensesModal Component
**File:** `client/src/components/OperationalExpensesModal.tsx` (NEW)

**Component Structure:**
```typescript
interface OperationalExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
}

// Features:
// - List all expenses with category icons
// - Add new expense form
// - Edit existing expenses
// - Delete expenses
// - Show total monthly expenses
// - Currency conversion display
```

**Key Features:**
- Form to add/edit expenses
- Category selector with icons (rent 🏢, coffee ☕, etc.)
- Amount input (numeric only)
- Frequency selector (monthly/yearly/one-time)
- List view of all expenses
- Delete confirmation
- Total calculation displayed prominently

#### 4.2 Add Data Store Methods
**File:** `client/src/lib/supabaseDataStore.ts` (ADD)

**New Methods Required:**
```typescript
async saveOperationalExpense(expense: OperationalExpense): Promise<void>
async getOperationalExpenses(): Promise<OperationalExpense[]>
async deleteOperationalExpense(id: string): Promise<void>
async bulkUpdateOperationalExpenses(expenses: OperationalExpense[]): Promise<void>
```

**File:** `client/src/lib/localStorage.ts` (ADD)
- Same interface for localStorage fallback

---

## Implementation Roadmap

### Phase 1: Data Integrity (Week 1)
**Goal:** Ensure price data is correctly typed and validated

**Tasks:**
1. ✅ Create `ACCOUNTING_FEATURES_ANALYSIS.md` (this file)
2. ⏳ Verify current database schema for `price` column type
3. ⏳ Create `/supabase/migrations/` directory
4. ⏳ Create migration: `20250113000001_ensure_price_numeric.sql`
5. ⏳ **USER ACTION REQUIRED:** Run migration in Supabase
6. ⏳ Update BookingModal validation logic (make price required only for "assigned")
7. ⏳ Test booking creation with both statuses
8. ⏳ Update UI help text to clarify when price is required

**Estimated Effort:** 4-6 hours
**Risk Level:** Low (backward compatible)

### Phase 2: Operational Expenses (Week 2)
**Goal:** Add ability to track operational costs

**Tasks:**
1. ⏳ Update `shared/schema.ts` with `operationalExpenseSchema`
2. ⏳ Create migration: `20250113000002_add_operational_expenses.sql`
3. ⏳ **USER ACTION REQUIRED:** Run migration in Supabase
4. ⏳ Add data store methods for expenses (SupabaseDataStore, LocalStorage)
5. ⏳ Create `OperationalExpensesModal.tsx` component
6. ⏳ Add "Operational Expenses" button to calendar page header
7. ⏳ Implement expense CRUD operations
8. ⏳ Add validation and error handling
9. ⏳ Test with multiple currencies

**Estimated Effort:** 8-12 hours
**Risk Level:** Medium (new feature, requires careful UX)

### Phase 3: Revenue Calculations (Week 3)
**Goal:** Calculate and display revenue metrics

**Tasks:**
1. ⏳ Create utility functions for revenue calculations
   - `calculateRevenueForDateRange(startDate, endDate, bookings)`
   - `calculateMonthlyRevenue(month, year, bookings)`
   - `calculateAveragePrice(bookings)`
2. ⏳ Add revenue stats to `getDeskStats()` function
3. ⏳ Create `RevenueStatsCard` component
4. ⏳ Display revenue on calendar page:
   - Total revenue for current view (week/month)
   - Breakdown by status (assigned vs booked)
   - Average booking price
5. ⏳ Handle multi-currency scenarios (convert or group by currency)
6. ⏳ Add unit tests for calculation functions

**Estimated Effort:** 6-10 hours
**Risk Level:** Low (pure calculations, no data changes)

### Phase 4: Profit/Loss Reporting (Week 4)
**Goal:** Show financial performance over time

**Tasks:**
1. ⏳ Create `FinancialReportModal.tsx` component
2. ⏳ Implement date range selector (month/quarter/year)
3. ⏳ Calculate metrics:
   - Total revenue
   - Total operational expenses
   - Gross profit (revenue - expenses)
   - Profit margin percentage
4. ⏳ Add visualization (chart/graph using Recharts library)
5. ⏳ Export functionality (CSV/PDF)
6. ⏳ Add "Financial Report" button to calendar page
7. ⏳ Handle edge cases (no data, negative profit, etc.)

**Estimated Effort:** 12-16 hours
**Risk Level:** Medium (complex calculations and UI)

### Phase 5: Advanced Features (Future)
**Goal:** Enhanced financial tracking and forecasting

**Potential Features:**
- Revenue forecasting based on trends
- Occupancy rate analysis
- Per-desk profitability analysis
- Recurring expense automation
- Tax calculation support
- Multi-workspace comparison
- Historical trend charts
- Budget vs. actual comparison
- Expense categorization insights
- Export to accounting software (QuickBooks, Xero)

**Estimated Effort:** 20-40 hours (depends on features selected)
**Risk Level:** Medium-High (depends on complexity)

---

## Technical Specifications

### Price Field Requirements

**Type:** `NUMERIC(10, 2)`
**Range:** 0 to 99,999,999.99 (10 digits total, 2 decimal places)
**Validation:**
- Must be non-negative (>= 0)
- Required for `status === 'assigned'`
- Optional for `status === 'booked'`
- NULL allowed for available desks

**UI Display:**
- Currency symbol prefix ($ € лв)
- Two decimal places (15.00)
- Thousand separators for large amounts (1,250.50)

### Operational Expenses Requirements

**Categories:**
1. **Rent** - Monthly office/space rent
2. **Utilities** - Electricity, water, gas, heating
3. **Coffee** - Coffee, tea, snacks for clients
4. **Supplies** - Office supplies, printer paper, etc.
5. **Internet** - Internet and phone services
6. **Cleaning** - Cleaning services
7. **Maintenance** - Repairs and maintenance
8. **Other** - Miscellaneous expenses

**Frequency Types:**
- **Monthly** - Recurring monthly expense (default)
- **Yearly** - Annual expense (e.g., insurance, licenses)
- **One-time** - Single occurrence (e.g., furniture purchase)

**Data Model:**
```typescript
{
  id: string;                    // Unique identifier
  category: ExpenseCategory;     // One of the 8 categories
  amount: number;                // Amount in specified currency
  currency: Currency;            // USD, EUR, or BGN
  frequency: ExpenseFrequency;   // monthly, yearly, or one-time
  description?: string;          // Optional notes
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### Revenue Calculation Formulas

#### Total Revenue (Simple)
```typescript
totalRevenue = Σ (booking.price where booking.status === 'assigned')
```

#### Monthly Revenue
```typescript
monthlyRevenue = Σ (booking.price where booking.status === 'assigned'
                    AND booking.startDate >= monthStart
                    AND booking.endDate <= monthEnd)
```

#### Average Booking Price
```typescript
avgPrice = totalRevenue / countOf(bookings where status === 'assigned')
```

#### Monthly Operational Expenses
```typescript
monthlyExpenses = Σ (expense.amount where expense.frequency === 'monthly')
                + Σ (expense.amount / 12 where expense.frequency === 'yearly')
                + Σ (expense.amount where expense.frequency === 'one-time'
                     AND expense.createdAt in currentMonth)
```

#### Gross Profit
```typescript
grossProfit = monthlyRevenue - monthlyExpenses
```

#### Profit Margin
```typescript
profitMargin = (grossProfit / monthlyRevenue) * 100
// Return as percentage (e.g., 25.5%)
```

### Currency Handling

**Current Currencies:** USD, EUR, BGN

**Approach for Multi-Currency Reporting:**

**Option 1: Group by Currency (Recommended for MVP)**
```typescript
{
  USD: { revenue: 1500, expenses: 800, profit: 700 },
  EUR: { revenue: 1200, expenses: 600, profit: 600 },
  BGN: { revenue: 2000, expenses: 1000, profit: 1000 }
}
```
- No conversion needed
- No API dependencies
- User sees breakdown per currency
- Simple and accurate

**Option 2: Convert to Base Currency (Future Enhancement)**
```typescript
// Requires exchange rate API (e.g., exchangerate-api.com)
totalRevenue = (revenue_USD * rate_USD_to_BGN)
             + (revenue_EUR * rate_EUR_to_BGN)
             + revenue_BGN
```
- Single unified view
- Requires exchange rate API key
- Historical rates needed for accurate reporting
- Adds complexity and API dependency

**Recommendation:** Start with Option 1, add Option 2 in Phase 5.

---

## Database Schema Reference

### Current Tables

#### desk_bookings
```sql
CREATE TABLE desk_bookings (
  id BIGINT PRIMARY KEY,
  desk_id TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD format (legacy)
  start_date TEXT NOT NULL,     -- YYYY-MM-DD format
  end_date TEXT NOT NULL,       -- YYYY-MM-DD format
  status TEXT NOT NULL,         -- 'available' | 'booked' | 'assigned'
  person_name TEXT,
  title TEXT,
  price NUMERIC(10, 2),         -- After migration
  currency TEXT,                -- 'USD' | 'EUR' | 'BGN'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_desk_bookings_desk_id ON desk_bookings(desk_id);
CREATE INDEX idx_desk_bookings_date ON desk_bookings(date);
CREATE INDEX idx_desk_bookings_status ON desk_bookings(status);
```

#### waiting_list_entries
```sql
CREATE TABLE waiting_list_entries (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  preferred_dates TEXT,
  contact_info TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### app_settings
```sql
CREATE TABLE app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### New Tables (After Phase 2)

#### operational_expenses
```sql
CREATE TABLE operational_expenses (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('rent', 'utilities', 'coffee', 'supplies', 'internet', 'cleaning', 'maintenance', 'other')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EUR', 'BGN')),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'yearly', 'one-time')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_operational_expenses_category ON operational_expenses(category);
CREATE INDEX idx_operational_expenses_created_at ON operational_expenses(created_at);
```

---

## Testing Checklist

### Phase 1 Testing
- [ ] Verify price column is NUMERIC after migration
- [ ] Create "booked" booking without price (should work)
- [ ] Create "assigned" booking without price (should fail validation)
- [ ] Create "assigned" booking with price (should work)
- [ ] Edit existing booking, change status from "booked" to "assigned" (should require price)
- [ ] Test with prices: 0, 0.50, 15.00, 999.99, 10000.00
- [ ] Test with negative price (should fail)
- [ ] Test with non-numeric input (should fail)

### Phase 2 Testing
- [ ] Add expense in each category
- [ ] Edit existing expense
- [ ] Delete expense
- [ ] Add expense with each frequency type
- [ ] Test with all currency types
- [ ] Add expense with very large amount (99999999.99)
- [ ] Add expense with description over 500 characters
- [ ] Test with localStorage vs. Supabase storage
- [ ] Test expense list sorting and filtering

### Phase 3 Testing
- [ ] Verify revenue calculation for single day
- [ ] Verify revenue calculation for week view
- [ ] Verify revenue calculation for month view
- [ ] Test with multi-day bookings spanning multiple months
- [ ] Test with mixed currencies (should group by currency)
- [ ] Test with zero bookings (should show $0)
- [ ] Test with only "booked" (unpaid) bookings (should show $0)
- [ ] Test average price calculation
- [ ] Test with overlapping bookings on same desk

### Phase 4 Testing
- [ ] Generate report for current month
- [ ] Generate report for past month with no data
- [ ] Generate report for date range spanning multiple months
- [ ] Verify profit calculation (revenue - expenses)
- [ ] Test with negative profit scenario
- [ ] Test with zero revenue, only expenses
- [ ] Test profit margin calculation
- [ ] Export report to CSV
- [ ] Test chart/graph rendering with various data sets
- [ ] Test with very large numbers

---

## Known Issues & Considerations

### 1. Price Column Type Uncertainty
**Issue:** The actual database column type for `price` is unknown until verified.

**Risk:** If it's currently `TEXT`, the migration will need to handle conversion carefully.

**Mitigation:** The migration script handles both scenarios safely with data validation.

### 2. Multi-Day Booking Revenue Attribution
**Question:** How should revenue be attributed for multi-day bookings?

**Options:**
- **Option A:** Full price counted on `startDate` only (simpler)
- **Option B:** Price divided evenly across all days (more accurate)
- **Option C:** Price counted once per unique month covered (accounting standard)

**Current Implementation:** Assumes Option A (full price at booking creation)

**Recommendation:** Document this behavior and add configuration option in Phase 5 if needed.

### 3. Currency Conversion Complexity
**Issue:** No exchange rate data available for multi-currency reporting.

**Mitigation:** Start with grouped reporting (Phase 1-4), add conversion in Phase 5.

### 4. Historical Data Migration
**Issue:** Existing bookings may have NULL or incorrect price values.

**Mitigation:**
- Migration script preserves NULL values
- UI can highlight bookings without prices for manual review
- Consider adding "Fix Missing Prices" utility in admin panel

### 5. Data Store Abstraction
**Challenge:** Changes must work across LocalStorage, MongoDB, and Supabase.

**Mitigation:**
- All changes go through `IDataStore` interface
- Test with both storage types
- Ensure localStorage implementation matches Supabase behavior

### 6. Performance Considerations
**Concern:** Revenue calculations on large datasets could be slow.

**Optimizations:**
- Use database aggregation queries (SUM, AVG)
- Cache calculated results with React Query
- Add database indexes on price and date columns
- Consider materialized views for complex reports (Phase 5)

---

## Migration Execution Instructions (For User)

### Prerequisites
1. Supabase project must be set up and accessible
2. Database connection established
3. Backup data before running migrations (optional but recommended)

### Option 1: Supabase Dashboard (Recommended)
1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Go to **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy contents of `supabase/migrations/20250113000001_ensure_price_numeric.sql`
6. Paste into SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Verify success message
9. Repeat for migration `20250113000002_add_operational_expenses.sql` (after Phase 2 completion)

### Option 2: Supabase CLI
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run individual migration
psql <connection_string> -f supabase/migrations/20250113000001_ensure_price_numeric.sql
```

### Option 3: Direct PostgreSQL Connection
```bash
# Get connection string from Supabase Dashboard > Settings > Database
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

psql "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres" \
  -f supabase/migrations/20250113000001_ensure_price_numeric.sql
```

### Verification
After running migrations, verify with:

```sql
-- Check price column type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'desk_bookings' AND column_name = 'price';

-- Expected result:
-- column_name | data_type | is_nullable
-- price       | numeric   | YES

-- Check operational_expenses table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'operational_expenses';

-- Should return: operational_expenses
```

---

## Summary & Next Steps

### Current Status
✅ Analysis complete
✅ Migration scripts drafted
⏳ User action required: Run migrations
⏳ Implementation ready to begin

### Immediate Next Steps
1. **Review this document** - Ensure all requirements are understood
2. **Run Phase 1 migration** - Execute `20250113000001_ensure_price_numeric.sql`
3. **Verify database changes** - Confirm price column is NUMERIC
4. **Update BookingModal validation** - Make price required only for "assigned" status
5. **Test booking creation** - Both paid and unpaid scenarios

### Long-Term Vision
This accounting feature implementation will enable DeskPlanner to provide:
- **Financial transparency** - Clear view of revenue and expenses
- **Business insights** - Understand profitability and trends
- **Better decision-making** - Data-driven pricing and cost management
- **Scalability** - Foundation for advanced financial features

### Questions or Issues?
If you encounter any problems during implementation:
1. Check the [Testing Checklist](#testing-checklist) section
2. Review [Known Issues & Considerations](#known-issues--considerations)
3. Verify database schema matches expected structure
4. Consult Supabase documentation for RLS policy issues

---

**End of Analysis Document**

*Generated: 2025-11-13*
*Version: 1.0*
*Status: Ready for Implementation*
