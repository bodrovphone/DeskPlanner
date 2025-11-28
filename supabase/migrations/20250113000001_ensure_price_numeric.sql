-- Migration: Ensure price column is NUMERIC type
-- Date: 2025-11-13
-- Purpose: Convert price from TEXT to NUMERIC if needed for accounting features
-- Run this in Supabase SQL Editor or via CLI

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
      WHEN price::TEXT ~ '^[0-9]+\.?[0-9]*$' THEN price::TEXT::NUMERIC(10, 2)
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
COMMENT ON COLUMN desk_bookings.price IS 'Booking price in selected currency. Required for assigned (paid) bookings, optional for booked (unpaid) reservations. NUMERIC(10,2) allows values up to 99,999,999.99';

-- Step 7: Create index for financial queries (speeds up revenue calculations)
CREATE INDEX IF NOT EXISTS idx_desk_bookings_price ON desk_bookings(price) WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_desk_bookings_status_date ON desk_bookings(status, date);

-- Verification query (uncomment to run)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'desk_bookings' AND column_name = 'price';
