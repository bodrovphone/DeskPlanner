import type { Client, PublicAvailability } from '@shared/schema';

/**
 * Pure helpers for the member self-service booking page (`/book/:memberId/:orgSlug`).
 * Extracted from `client/src/pages/member-booking.tsx` so the data shaping and
 * dedup logic can be tested in isolation.
 */

/**
 * Shape of a row returned by `supabase.from('clients').select('*')`. Only the
 * fields we actually consume are typed — the rest may exist but we don't
 * touch them.
 */
export interface ClientRow {
  id: number;
  organization_id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  flex_active?: boolean | null;
  flex_total_days?: number | null;
  flex_used_days?: number | null;
  flex_start_date?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a raw `clients` row from Supabase to the camelCase `Client` shape
 * defined in `@shared/schema`. Centralizes the mapping (and the `null`
 * defaults) so it's tested once and not duplicated across the booking pages.
 *
 * Defaults:
 *   - `flexActive`           false when null/undefined
 *   - `flexTotalDays`        0
 *   - `flexUsedDays`         0
 *   - `flexStartDate`        null
 *   - `contact`/`email`/`phone` null when null/undefined/empty
 */
export function mapClientRowToClient(row: ClientRow): Client {
  return {
    id: String(row.id),
    organizationId: row.organization_id,
    name: row.name,
    contact: row.contact || null,
    email: row.email || null,
    phone: row.phone || null,
    flexActive: row.flex_active || false,
    flexTotalDays: row.flex_total_days || 0,
    flexUsedDays: row.flex_used_days || 0,
    flexStartDate: row.flex_start_date || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Compute remaining flex days for a member. Returns 0 if the member has no
 * flex plan (avoids leaking a negative number when total < used somehow).
 */
export function computeFlexRemaining(member: Pick<Client, 'flexTotalDays' | 'flexUsedDays'>): number {
  return Math.max(0, member.flexTotalDays - member.flexUsedDays);
}

/**
 * Build a `deskId → desk label` lookup from a `PublicAvailability` payload.
 * The booking pages need this multiple places (upcoming-bookings list,
 * confirmation screen, calendar tooltip) — extracting avoids the same
 * nested loop being inlined in N callers.
 */
export function buildDeskLabelMap(availability: PublicAvailability): Map<string, string> {
  const map = new Map<string, string>();
  for (const room of availability.rooms) {
    for (const desk of room.desks) {
      map.set(desk.deskId, desk.label);
    }
  }
  return map;
}

/**
 * Shape of a desk_bookings row when we only care about date + desk.
 */
export interface UpcomingBookingRow {
  date: string;
  desk_id: string;
}

/**
 * Multi-day plans store one `desk_bookings` row per day, all sharing the
 * same desk. The "upcoming bookings" list on the member-booking page wants
 * one entry per date (the user thinks of it as "May 1 — desk 4," not as
 * 30 separate rows of "May 1, May 2, May 3 …").
 *
 * Dedupes by `date`, keeping the first row encountered per date. The desk
 * label is resolved through `deskLabels` and falls back to the raw deskId
 * when the lookup misses.
 */
export function dedupeUpcomingBookingsByDate(
  rows: UpcomingBookingRow[],
  deskLabels: Map<string, string>,
): { date: string; deskLabel: string }[] {
  const seen = new Set<string>();
  const out: { date: string; deskLabel: string }[] = [];
  for (const row of rows) {
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    out.push({ date: row.date, deskLabel: deskLabels.get(row.desk_id) || row.desk_id });
  }
  return out;
}

/**
 * Compute the per-visit price for a flex plan: total price divided by total
 * days, rounded to the nearest cent. Returns 0 when the plan is unset or
 * misconfigured (zero days), avoiding a NaN price on the booking insert.
 */
export function computePerVisitPrice(flexConfig: { days: number; price: number } | null): number {
  if (!flexConfig || flexConfig.days <= 0) return 0;
  return Math.round((flexConfig.price / flexConfig.days) * 100) / 100;
}
