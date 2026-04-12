# DeskPlanner Comprehensive Refactoring Plan

## Context

Full codebase audit using the Vercel React Best Practices skill identified **13 confirmed anti-patterns** across pages, components, hooks, and contexts. The highest-impact issue is in `OrganizationContext.tsx` — zero memoization in the provider that wraps the entire app, causing all consumers to re-render on every state change. Two stale closure bugs were also found in `use-booking-actions.ts`.

**Already completed** (2026-04-12): `expenses.tsx` categoryUsageMap, `settings.tsx` desksByRoom grouping, `public-booking.tsx` payment banner fix.

**Audit corrections** (verified false positives):
- ~~ClientAutocomplete orgNameById~~ — already uses `useMemo`
- ~~FloorPlanEditor inline components~~ — `DraggableTile` and `SaveIndicator` are at module scope, not nested
- ~~RESERVED_SLUGS in use-organization~~ — already module-level
- ~~handleDeskClick stale closure~~ — `desks` is a function argument, not a closure capture

---

## Phase 1: Critical — Context memoization + stale closure fix

**Impact: HIGH — affects every component in the app**

### Step 1.1 — Memoize OrganizationContext provider value

**File:** `client/src/contexts/OrganizationContext.tsx`

- Add `useMemo` import
- Wrap `legacyDesks` (lines 58-77) in `useMemo([desks, rooms])`. Pre-build a `roomSortMap: Map<roomId, sortIndex>` from `rooms` to replace the O(desks x rooms) `.find()` inside `.sort()` and `.map()`
- Wrap `organizations` (line 110) in `useMemo([memberships])`
- Wrap the entire provider `value` object (lines 115-127) in `useMemo`
- **Rule:** `context-value-not-memoized`, `js-index-maps`
- **Risk:** LOW — pure memoization, output identical

### Step 1.2 — Fix stale closures in use-booking-actions

**File:** `client/src/hooks/use-booking-actions.ts`

- Add `desks` to `handleBookingSave` dependency array (line 194) — uses `desks.find()` at lines 177, 189
- Add `desks` to `handleQuickBook` dependency array (line 333) — iterates `desks` at line 319
- **Rule:** `stale-closure` (correctness bug, not just perf)
- **Risk:** LOW — adding missing deps

**Verification:** `npm run check && npm run test:run`

---

## Phase 2: Duplicate computation cleanup

**Impact: MEDIUM-HIGH — Set + flatMap reconstructed every render on public pages**

### Step 2.1 — public-booking.tsx: eliminate duplicate bookedSet/allDesks

**File:** `client/src/pages/public-booking.tsx`

- Expand existing `useMemo` (lines 61-83) to also return `bookedSet`, `allDesks`, `totalDesks`, `org`, `rooms`
- Remove duplicate destructuring + Set/flatMap at lines 152-155
- Hoist `formatDateStr` (line 160) to module level — it's a pure function
- Wrap `dates` array (lines 187-203) in `useMemo`
- **Rule:** `duplicate-computation`, `rendering-hoist-jsx`
- **Risk:** LOW

### Step 2.2 — member-booking.tsx: same pattern

**File:** `client/src/pages/member-booking.tsx`

- Expand `useMemo` (lines 110-129) to return `bookedSet`, `allDesks`
- Remove duplicate at lines 228-230
- `formatDateStr` already at module level here — no change needed
- **Risk:** LOW

### Step 2.3 (optional) — Extract shared `formatDateStr` to dateUtils

**Files:** `client/src/lib/dateUtils.ts`, `client/src/lib/dateUtils.test.ts`

- Add `formatDateStr(d: Date): string` (YYYY-MM-DD formatter) to `dateUtils.ts`
- Import from both `public-booking.tsx` and `member-booking.tsx`
- Add unit test
- **Risk:** LOW

**Verification:** `npm run check && npm run test:run`

---

## Phase 3: BookingModal memoization

**Impact: MEDIUM — 611 LOC component with no useCallback/useMemo**

### Step 3.1 — Add memoization to BookingModal

**File:** `client/src/components/BookingModal.tsx`

- Add `useMemo`, `useCallback` to imports (line 1 currently only has `useState, useEffect`)
- Wrap `handleSave` (line ~170) in `useCallback`
- Wrap `handleKeyDown` (line ~217) in `useCallback`
- Memoize any derived values from props (desk label lookups, etc.)
- Note: `availableDesks` useEffect (lines 116-148) is async — it fetches from dataStore, so it legitimately needs useEffect + setState. Do NOT convert to useMemo.
- **Rule:** `missing-useCallback`, `rerender-memo`
- **Risk:** LOW

**Verification:** `npm run check`. Manual test: create/edit/discard bookings, multi-day, move desk, flex booking, share link.

---

## Phase 4: Minor render-path optimizations

**Impact: LOW-MEDIUM — small wins, quick to implement**

### Step 4.1 — DashboardLayout.tsx: memoize nav arrays

**File:** `client/src/layouts/DashboardLayout.tsx`

- Wrap `navGroups`, `navItems`, `primaryMobileItems`, `moreItems` in `useMemo`
- **Risk:** LOW

### Step 4.2 — use-next-dates.ts: type the bookingLookup Map

**File:** `client/src/hooks/use-next-dates.ts`

- Change `Map<string, any>` (line 51) to `Map<string, DeskBooking>`
- **Risk:** NONE — type-only

**Verification:** `npm run check && npm run test:run`

---

## Phase 5: FloorPlanEditor code organization (optional, separate session)

**Impact: LOW — maintainability only, no perf bug**

### Step 5.1 — Extract DraggableTile and SaveIndicator

**Files:**
- `client/src/components/FloorPlanEditor.tsx` (modify — 730 LOC -> ~530 LOC)
- `client/src/components/DraggableTile.tsx` (new)
- `client/src/components/SaveIndicator.tsx` (new)

Note: These are already at module scope (NOT inline components), so there's no remount bug. This is purely code organization to reduce the 730 LOC file.
- **Risk:** LOW

**Verification:** `npm run check`. Manual: drag tiles, rotate, save floor plan.

---

## Phase 6: BookingModal structural split (separate session, ~2 hours)

**Impact: MEDIUM — maintainability of largest component**

### Step 6.1 — Split BookingModal into sub-components

**File:** `client/src/components/BookingModal.tsx` (611 LOC)

Extract into:
- `BookingFormFields.tsx` — name/client autocomplete, title, price, status, date range
- `BookingConflictAlert.tsx` — conflict error display
- `BookingActions.tsx` — save/discard/share/pause button bar
- `BookingModal.tsx` stays as orchestrator with state
- **Risk:** MEDIUM — requires careful prop threading

**Verification:** Full manual regression of all booking flows.

---

## Summary

| Phase | Steps | Impact | Risk | Est. Time |
|-------|-------|--------|------|-----------|
| 1 | 1.1, 1.2 | **HIGH** (context re-render fix + correctness bug) | LOW | 30 min |
| 2 | 2.1-2.3 | **MEDIUM-HIGH** (duplicate computation on public pages) | LOW | 30 min |
| 3 | 3.1 | **MEDIUM** (BookingModal memoization) | LOW | 20 min |
| 4 | 4.1-4.2 | **LOW-MEDIUM** (nav + type safety) | LOW | 15 min |
| 5 | 5.1 | **LOW** (code org only) | LOW | 30 min |
| 6 | 6.1 | **MEDIUM** (maintainability) | MEDIUM | 2 hrs |

**Phases 1-4** can all be done in a single session (~1.5 hours). Phases 5-6 are optional follow-ups.
