-- Migration: Add multi-tenancy support
-- Date: 2025-02-20
-- Purpose: Add organizations, rooms, desks tables and scope existing data
-- SAFETY: All changes are additive. Existing data is preserved and backfilled.

-- ============================================================
-- Step 1: Create new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  rooms_count INTEGER NOT NULL DEFAULT 2,
  desks_per_room INTEGER NOT NULL DEFAULT 4,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('USD', 'EUR', 'GBP')),
  timezone TEXT NOT NULL DEFAULT 'Europe/Sofia',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS desks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  desk_id TEXT NOT NULL,  -- legacy desk_id like "room1-desk1" for backward compat
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_rooms_org ON rooms(organization_id);
CREATE INDEX IF NOT EXISTS idx_desks_org ON desks(organization_id);
CREATE INDEX IF NOT EXISTS idx_desks_room ON desks(room_id);
CREATE INDEX IF NOT EXISTS idx_desks_desk_id ON desks(desk_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ============================================================
-- Step 2: Add organization_id (NULLABLE) to existing tables
-- This is safe - existing rows keep working with NULL org_id
-- ============================================================

DO $$
BEGIN
  -- Add to desk_bookings if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'desk_bookings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE desk_bookings ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX idx_desk_bookings_org ON desk_bookings(organization_id);
  END IF;

  -- Add to expenses if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX idx_expenses_org ON expenses(organization_id);
  END IF;

  -- Add to recurring_expenses if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_expenses' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE recurring_expenses ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX idx_recurring_expenses_org ON recurring_expenses(organization_id);
  END IF;

  -- Add to waiting_list_entries if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waiting_list_entries' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE waiting_list_entries ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX idx_waiting_list_org ON waiting_list_entries(organization_id);
  END IF;
END $$;

-- ============================================================
-- Step 3: Enable RLS on new tables
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE desks ENABLE ROW LEVEL SECURITY;

-- Organizations: users can see orgs they belong to
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Organization members: users can see members of their orgs
CREATE POLICY "Users can view org members" ON organization_members
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Users can join organizations" ON organization_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Rooms: scoped to user's orgs
CREATE POLICY "Users can view rooms in their orgs" ON rooms
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners can manage rooms" ON rooms
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Desks: scoped to user's orgs
CREATE POLICY "Users can view desks in their orgs" ON desks
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners can manage desks" ON desks
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ============================================================
-- Step 4: Add updated_at trigger for organizations
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Step 5: Update currency constraints to include BGN and GBP
-- ============================================================

-- Update expenses currency check
DO $$
BEGIN
  ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_currency_check;
  ALTER TABLE expenses ADD CONSTRAINT expenses_currency_check CHECK (currency IN ('USD', 'EUR', 'GBP'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update expenses currency constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_currency_check;
  ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_currency_check CHECK (currency IN ('USD', 'EUR', 'GBP'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update recurring_expenses currency constraint: %', SQLERRM;
END $$;

-- Also update expense categories to include more options
DO $$
BEGIN
  ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
  ALTER TABLE expenses ADD CONSTRAINT expenses_category_check CHECK (category IN ('rent', 'supplies', 'internet', 'bills', 'accountant'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update expenses category constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_category_check;
  ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_category_check CHECK (category IN ('rent', 'supplies', 'internet', 'bills', 'accountant'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update recurring_expenses category constraint: %', SQLERRM;
END $$;
