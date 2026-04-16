import { describe, it, expect } from 'vitest';
import {
  buildAvailabilityMap,
  isDateDisabled,
  pickRandomAvailableDesk,
  getIsoDay,
} from './bookingAvailability';
import type { PublicAvailability } from '@shared/schema';
import { formatLocalDate } from './dateUtils';

function makeAvailability(overrides: Partial<PublicAvailability['org']> = {}, bookedSlots: { deskId: string; date: string }[] = []): PublicAvailability {
  return {
    org: {
      id: 'org-1',
      name: 'Test Space',
      slug: 'test',
      currency: 'EUR',
      workingDays: [1, 2, 3, 4, 5],
      maxDaysAhead: 7,
      logoUrl: null,
      contactPhone: null,
      contactEmail: null,
      contactTelegram: null,
      contactViberEnabled: false,
      contactWhatsappEnabled: false,
      defaultPricePerDay: 10,
      stripePublicBookingPayments: false,
      ...overrides,
    },
    rooms: [
      {
        id: 'r1',
        name: 'Room 1',
        desks: [
          { id: 'd1', deskId: 'd1', label: 'Desk 1' },
          { id: 'd2', deskId: 'd2', label: 'Desk 2' },
        ],
      },
    ],
    bookedSlots,
  };
}

describe('buildAvailabilityMap', () => {
  const now = new Date(2026, 3, 15); // April 15, 2026 (local)

  it('returns a map with one entry per day including today', () => {
    const { availabilityMap } = buildAvailabilityMap(makeAvailability({ maxDaysAhead: 3 }), now);
    // Days 0..3 inclusive = 4 keys
    expect(Object.keys(availabilityMap)).toHaveLength(4);
    expect(availabilityMap['2026-04-15']).toBe(2);
    expect(availabilityMap['2026-04-18']).toBe(2);
  });

  it('subtracts booked desks per day', () => {
    const { availabilityMap } = buildAvailabilityMap(
      makeAvailability({ maxDaysAhead: 2 }, [
        { deskId: 'd1', date: '2026-04-15' },
      ]),
      now,
    );
    expect(availabilityMap['2026-04-15']).toBe(1); // d2 still free
    expect(availabilityMap['2026-04-16']).toBe(2); // both free
  });

  it('reports 0 when all desks are booked', () => {
    const { availabilityMap } = buildAvailabilityMap(
      makeAvailability({ maxDaysAhead: 1 }, [
        { deskId: 'd1', date: '2026-04-15' },
        { deskId: 'd2', date: '2026-04-15' },
      ]),
      now,
    );
    expect(availabilityMap['2026-04-15']).toBe(0);
  });

  it('computes maxDate as today + maxDaysAhead', () => {
    const { maxDate } = buildAvailabilityMap(makeAvailability({ maxDaysAhead: 5 }), now);
    expect(formatLocalDate(maxDate)).toBe('2026-04-20');
  });

  it('aggregates desks across multiple rooms', () => {
    const avail = makeAvailability({ maxDaysAhead: 0 });
    avail.rooms.push({
      id: 'r2',
      name: 'Room 2',
      desks: [{ id: 'd3', deskId: 'd3', label: 'Desk 3' }],
    });
    const { availabilityMap } = buildAvailabilityMap(avail, now);
    expect(availabilityMap['2026-04-15']).toBe(3);
  });
});

describe('isDateDisabled', () => {
  const today = new Date(2026, 3, 15); // Wed, April 15
  const maxDate = new Date(2026, 3, 22);
  const workingDays = [1, 2, 3, 4, 5]; // Mon-Fri
  const availabilityMap: Record<string, number> = {
    '2026-04-15': 5,
    '2026-04-16': 0,
    '2026-04-17': 3,
    '2026-04-20': 5,
  };

  it('disables dates before today', () => {
    expect(isDateDisabled({
      date: new Date(2026, 3, 14),
      today, maxDate, workingDays, availabilityMap,
    })).toBe(true);
  });

  it('disables dates after maxDate', () => {
    expect(isDateDisabled({
      date: new Date(2026, 3, 23),
      today, maxDate, workingDays, availabilityMap,
    })).toBe(true);
  });

  it('disables non-working days (weekend)', () => {
    // April 18, 2026 is Saturday
    expect(isDateDisabled({
      date: new Date(2026, 3, 18),
      today, maxDate, workingDays, availabilityMap,
    })).toBe(true);
  });

  it('disables fully booked days', () => {
    expect(isDateDisabled({
      date: new Date(2026, 3, 16),
      today, maxDate, workingDays, availabilityMap,
    })).toBe(true);
  });

  it('disables days missing from availability map', () => {
    expect(isDateDisabled({
      date: new Date(2026, 3, 21),
      today, maxDate, workingDays, availabilityMap,
    })).toBe(true);
  });

  it('enables a normal working day with availability', () => {
    expect(isDateDisabled({
      date: new Date(2026, 3, 15),
      today, maxDate, workingDays, availabilityMap,
    })).toBe(false);
  });
});

describe('pickRandomAvailableDesk', () => {
  const desks = [
    { deskId: 'd1', label: 'Desk 1' },
    { deskId: 'd2', label: 'Desk 2' },
    { deskId: 'd3', label: 'Desk 3' },
  ];

  it('returns null when every desk is booked', () => {
    const booked = new Set(['d1:2026-04-15', 'd2:2026-04-15', 'd3:2026-04-15']);
    expect(pickRandomAvailableDesk(desks, booked, '2026-04-15')).toBeNull();
  });

  it('returns the only free desk when others are booked', () => {
    const booked = new Set(['d1:2026-04-15', 'd2:2026-04-15']);
    const pick = pickRandomAvailableDesk(desks, booked, '2026-04-15');
    expect(pick?.deskId).toBe('d3');
  });

  it('ignores bookings on other dates', () => {
    const booked = new Set(['d1:2026-04-14', 'd2:2026-04-16']);
    const pick = pickRandomAvailableDesk(desks, booked, '2026-04-15', () => 0);
    expect(pick?.deskId).toBe('d1'); // rng=0 → first free desk
  });

  it('uses injected rng deterministically', () => {
    const booked = new Set<string>();
    const pickFirst = pickRandomAvailableDesk(desks, booked, '2026-04-15', () => 0);
    const pickLast = pickRandomAvailableDesk(desks, booked, '2026-04-15', () => 0.999);
    expect(pickFirst?.deskId).toBe('d1');
    expect(pickLast?.deskId).toBe('d3');
  });
});

describe('getIsoDay', () => {
  it('maps Monday to 1', () => {
    expect(getIsoDay(new Date(2026, 3, 13))).toBe(1);
  });

  it('maps Friday to 5', () => {
    expect(getIsoDay(new Date(2026, 3, 17))).toBe(5);
  });

  it('maps Saturday to 6', () => {
    expect(getIsoDay(new Date(2026, 3, 18))).toBe(6);
  });

  it('maps Sunday to 7 (not 0)', () => {
    expect(getIsoDay(new Date(2026, 3, 19))).toBe(7);
  });
});
