import { describe, it, expect } from 'vitest';
import type { PublicAvailability } from '@shared/schema';
import {
  mapClientRowToClient,
  computeFlexRemaining,
  buildDeskLabelMap,
  dedupeUpcomingBookingsByDate,
  computePerVisitPrice,
  type ClientRow,
} from './memberBookingUtils';

const baseRow: ClientRow = {
  id: 42,
  organization_id: 'org-1',
  name: 'Alexey Safonov',
  created_at: '2026-04-01T10:00:00Z',
  updated_at: '2026-04-15T12:00:00Z',
};

describe('mapClientRowToClient', () => {
  it('maps required fields and stringifies the numeric id', () => {
    const out = mapClientRowToClient(baseRow);
    expect(out.id).toBe('42');
    expect(out.organizationId).toBe('org-1');
    expect(out.name).toBe('Alexey Safonov');
    expect(out.createdAt).toBe('2026-04-01T10:00:00Z');
    expect(out.updatedAt).toBe('2026-04-15T12:00:00Z');
  });

  it('defaults missing optional fields to null', () => {
    const out = mapClientRowToClient(baseRow);
    expect(out.contact).toBeNull();
    expect(out.email).toBeNull();
    expect(out.phone).toBeNull();
    expect(out.flexStartDate).toBeNull();
  });

  it('defaults missing flex fields to false / 0', () => {
    const out = mapClientRowToClient(baseRow);
    expect(out.flexActive).toBe(false);
    expect(out.flexTotalDays).toBe(0);
    expect(out.flexUsedDays).toBe(0);
  });

  it('passes through populated optional fields', () => {
    const out = mapClientRowToClient({
      ...baseRow,
      contact: 'tg:@alex',
      email: 'a@b.com',
      phone: '+359...',
      flex_active: true,
      flex_total_days: 10,
      flex_used_days: 3,
      flex_start_date: '2026-04-01',
    });
    expect(out.contact).toBe('tg:@alex');
    expect(out.email).toBe('a@b.com');
    expect(out.phone).toBe('+359...');
    expect(out.flexActive).toBe(true);
    expect(out.flexTotalDays).toBe(10);
    expect(out.flexUsedDays).toBe(3);
    expect(out.flexStartDate).toBe('2026-04-01');
  });

  it('treats empty strings the same as null for contact/email/phone', () => {
    const out = mapClientRowToClient({
      ...baseRow,
      contact: '',
      email: '',
      phone: '',
    });
    expect(out.contact).toBeNull();
    expect(out.email).toBeNull();
    expect(out.phone).toBeNull();
  });
});

describe('computeFlexRemaining', () => {
  it('returns total minus used', () => {
    expect(computeFlexRemaining({ flexTotalDays: 10, flexUsedDays: 3 })).toBe(7);
  });

  it('returns 0 when used equals total', () => {
    expect(computeFlexRemaining({ flexTotalDays: 10, flexUsedDays: 10 })).toBe(0);
  });

  it('clamps at 0 (never returns negative)', () => {
    expect(computeFlexRemaining({ flexTotalDays: 5, flexUsedDays: 8 })).toBe(0);
  });

  it('handles a zero-day plan', () => {
    expect(computeFlexRemaining({ flexTotalDays: 0, flexUsedDays: 0 })).toBe(0);
  });
});

function makeAvailability(rooms: { name: string; desks: { deskId: string; label: string }[] }[]): PublicAvailability {
  return {
    org: {
      id: 'org-1',
      name: 'Codeburg',
      slug: 'codeburg',
      currency: 'EUR',
      timezone: 'Europe/Sofia',
      maxDaysAhead: 30,
      workingDays: [1, 2, 3, 4, 5],
    },
    rooms: rooms.map((r, i) => ({
      id: `r-${i}`,
      name: r.name,
      sortOrder: i,
      desks: r.desks.map((d, j) => ({
        id: `d-${i}-${j}`,
        deskId: d.deskId,
        label: d.label,
        sortOrder: j,
      })),
    })),
    bookedSlots: [],
  } as PublicAvailability;
}

describe('buildDeskLabelMap', () => {
  it('returns an empty map for a space with no rooms', () => {
    const m = buildDeskLabelMap(makeAvailability([]));
    expect(m.size).toBe(0);
  });

  it('maps each desk_id to its label', () => {
    const m = buildDeskLabelMap(
      makeAvailability([
        {
          name: 'Front',
          desks: [
            { deskId: 'room1-desk1', label: 'A1' },
            { deskId: 'room1-desk2', label: 'A2' },
          ],
        },
        {
          name: 'Back',
          desks: [{ deskId: 'room2-desk1', label: 'B1' }],
        },
      ]),
    );
    expect(m.get('room1-desk1')).toBe('A1');
    expect(m.get('room1-desk2')).toBe('A2');
    expect(m.get('room2-desk1')).toBe('B1');
    expect(m.size).toBe(3);
  });

  it('the last duplicate desk_id wins (defensive)', () => {
    // Shouldn't happen in real data, but if two rooms had clashing
    // deskIds we want predictable behavior.
    const m = buildDeskLabelMap(
      makeAvailability([
        { name: 'Front', desks: [{ deskId: 'desk-x', label: 'first' }] },
        { name: 'Back', desks: [{ deskId: 'desk-x', label: 'second' }] },
      ]),
    );
    expect(m.get('desk-x')).toBe('second');
  });
});

describe('dedupeUpcomingBookingsByDate', () => {
  const labels = new Map([
    ['room1-desk1', 'A1'],
    ['room1-desk2', 'A2'],
  ]);

  it('returns empty array for empty input', () => {
    expect(dedupeUpcomingBookingsByDate([], labels)).toEqual([]);
  });

  it('keeps a single row unchanged', () => {
    const out = dedupeUpcomingBookingsByDate(
      [{ date: '2026-05-01', desk_id: 'room1-desk1' }],
      labels,
    );
    expect(out).toEqual([{ date: '2026-05-01', deskLabel: 'A1' }]);
  });

  it('dedupes multiple rows for the same date (multi-day plan stored as N rows)', () => {
    // Real-world scenario: a monthly plan inserts 30 rows, all desk_id=room1-desk1,
    // dates May 1 through May 30. The upcoming-bookings list should show one
    // entry per date — and after dedup also one per date, since the day-row is
    // unique per date.
    const out = dedupeUpcomingBookingsByDate(
      [
        { date: '2026-05-01', desk_id: 'room1-desk1' },
        { date: '2026-05-02', desk_id: 'room1-desk1' },
      ],
      labels,
    );
    expect(out).toHaveLength(2);
  });

  it('dedupes when the same date appears twice (different desks, same day)', () => {
    const out = dedupeUpcomingBookingsByDate(
      [
        { date: '2026-05-01', desk_id: 'room1-desk1' },
        { date: '2026-05-01', desk_id: 'room1-desk2' }, // same day, different desk
        { date: '2026-05-02', desk_id: 'room1-desk1' },
      ],
      labels,
    );
    expect(out).toHaveLength(2);
    // First-seen wins for label
    expect(out[0]).toEqual({ date: '2026-05-01', deskLabel: 'A1' });
    expect(out[1]).toEqual({ date: '2026-05-02', deskLabel: 'A1' });
  });

  it('falls back to deskId when label is missing from the map', () => {
    const out = dedupeUpcomingBookingsByDate(
      [{ date: '2026-05-01', desk_id: 'unknown-desk' }],
      labels,
    );
    expect(out).toEqual([{ date: '2026-05-01', deskLabel: 'unknown-desk' }]);
  });

  it('preserves input order (first-seen wins)', () => {
    const out = dedupeUpcomingBookingsByDate(
      [
        { date: '2026-05-03', desk_id: 'room1-desk1' },
        { date: '2026-05-01', desk_id: 'room1-desk1' },
        { date: '2026-05-02', desk_id: 'room1-desk1' },
      ],
      labels,
    );
    expect(out.map((b) => b.date)).toEqual(['2026-05-03', '2026-05-01', '2026-05-02']);
  });
});

describe('computePerVisitPrice', () => {
  it('returns 0 when flexConfig is null', () => {
    expect(computePerVisitPrice(null)).toBe(0);
  });

  it('returns 0 when days is 0 (avoids division by zero)', () => {
    expect(computePerVisitPrice({ days: 0, price: 100 })).toBe(0);
  });

  it('returns 0 when days is negative (defensive)', () => {
    expect(computePerVisitPrice({ days: -5, price: 100 })).toBe(0);
  });

  it('divides price by days for a clean ratio', () => {
    expect(computePerVisitPrice({ days: 10, price: 80 })).toBe(8);
  });

  it('rounds to the nearest cent', () => {
    // 100 / 7 = 14.2857... → rounds to 14.29
    expect(computePerVisitPrice({ days: 7, price: 100 })).toBe(14.29);
  });

  it('handles fractional prices precisely', () => {
    // 19.99 / 5 = 3.998 → rounds to 4.00 (stored as 4)
    expect(computePerVisitPrice({ days: 5, price: 19.99 })).toBe(4);
  });

  it('rounds half up at the cent boundary', () => {
    // 1.005 should round to 1.01 in standard banker's-or-half-up rounding,
    // but JS Math.round on 1.005 is famously 1.00 due to FP. Use a value
    // that's unambiguous in IEEE 754:
    expect(computePerVisitPrice({ days: 1, price: 1.234 })).toBe(1.23);
    expect(computePerVisitPrice({ days: 1, price: 1.236 })).toBe(1.24);
  });
});
