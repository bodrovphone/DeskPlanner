import { describe, it, expect } from 'vitest';
import {
  countCalendarDays,
  generateDaysInRange,
  getMonthBoundaries,
  calculateProratedRevenue,
  calculateStats,
  calculateMonthlyStats,
  calculateDateRangeStats,
} from './revenueCalculations';
import { DESK_COUNT } from './deskConfig';
import { DeskBooking } from '@shared/schema';

function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe('countCalendarDays', () => {
  it('counts days correctly for a full week', () => {
    const start = localDate(2025, 1, 6); // Monday
    const end = localDate(2025, 1, 12); // Sunday
    expect(countCalendarDays(start, end)).toBe(7);
  });

  it('returns 1 for a single day', () => {
    const start = localDate(2025, 1, 6);
    const end = localDate(2025, 1, 6);
    expect(countCalendarDays(start, end)).toBe(1);
  });

  it('counts weekend days too', () => {
    const start = localDate(2025, 1, 11); // Saturday
    const end = localDate(2025, 1, 12); // Sunday
    expect(countCalendarDays(start, end)).toBe(2);
  });

  it('counts correctly for a full month (January 2026 = 31 days)', () => {
    const start = localDate(2026, 1, 1);
    const end = localDate(2026, 1, 31);
    expect(countCalendarDays(start, end)).toBe(31);
  });

  it('counts correctly for February 2026 (non-leap = 28 days)', () => {
    const start = localDate(2026, 2, 1);
    const end = localDate(2026, 2, 28);
    expect(countCalendarDays(start, end)).toBe(28);
  });

  it('counts correctly across month boundaries', () => {
    // Dec 22, 2025 to Mar 10, 2026
    const start = localDate(2025, 12, 22);
    const end = localDate(2026, 3, 10);
    // Dec: 10 days, Jan: 31, Feb: 28, Mar: 10 = 79
    expect(countCalendarDays(start, end)).toBe(79);
  });

  it('handles edge case where end is before start', () => {
    const start = localDate(2025, 1, 10);
    const end = localDate(2025, 1, 5);
    expect(countCalendarDays(start, end)).toBe(0);
  });
});

describe('generateDaysInRange', () => {
  it('generates all days for a week', () => {
    const start = localDate(2025, 1, 6); // Monday
    const end = localDate(2025, 1, 10); // Friday
    const days = generateDaysInRange(start, end);
    expect(days).toEqual([
      '2025-01-06',
      '2025-01-07',
      '2025-01-08',
      '2025-01-09',
      '2025-01-10',
    ]);
  });

  it('includes weekends', () => {
    const start = localDate(2025, 1, 10); // Friday
    const end = localDate(2025, 1, 13); // Monday
    const days = generateDaysInRange(start, end);
    expect(days).toEqual(['2025-01-10', '2025-01-11', '2025-01-12', '2025-01-13']);
  });

  it('returns correct count for January 2026', () => {
    const start = localDate(2026, 1, 1);
    const end = localDate(2026, 1, 31);
    const days = generateDaysInRange(start, end);
    expect(days.length).toBe(31);
  });
});

describe('getMonthBoundaries', () => {
  it('returns correct boundaries for January 2026', () => {
    const { start, end } = getMonthBoundaries(2026, 0); // month is 0-indexed
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(31);
  });

  it('returns correct boundaries for February 2026 (non-leap)', () => {
    const { start, end } = getMonthBoundaries(2026, 1);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(28);
  });

  it('returns correct boundaries for February 2024 (leap year)', () => {
    const { start, end } = getMonthBoundaries(2024, 1);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(29);
  });

  it('returns correct boundaries for December', () => {
    const { start, end } = getMonthBoundaries(2025, 11);
    expect(start.getMonth()).toBe(11);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(31);
  });
});

describe('calculateProratedRevenue', () => {
  describe('single-month bookings', () => {
    it('returns full price when booking is entirely within period', () => {
      const booking = {
        startDate: '2026-01-05',
        endDate: '2026-01-09',
        price: 100,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(5);
      expect(result.daysInPeriod).toBe(5);
      expect(result.proratedPrice).toBe(100);
    });

    it('returns 0 for booking with no price', () => {
      const booking = {
        startDate: '2026-01-05',
        endDate: '2026-01-09',
        price: 0,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.proratedPrice).toBe(0);
    });

    it('returns 0 for booking with undefined price', () => {
      const booking = {
        startDate: '2026-01-05',
        endDate: '2026-01-09',
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.proratedPrice).toBe(0);
    });
  });

  describe('multi-month bookings - real scenarios', () => {
    it('calculates Dec 22 - Mar 10, 240, January portion', () => {
      // Total: 79 calendar days, January: 31 calendar days
      // Expected: (31/79) * 240 = 94.18
      const booking = {
        startDate: '2025-12-22',
        endDate: '2026-03-10',
        price: 240,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(79);
      expect(result.daysInPeriod).toBe(31);
      expect(result.proratedPrice).toBeCloseTo(94.18, 1);
    });

    it('calculates Dec 24 - Feb 25, 190, January portion', () => {
      // Total: 64 calendar days, January: 31 calendar days
      // Expected: (31/64) * 190 = 92.03
      const booking = {
        startDate: '2025-12-24',
        endDate: '2026-02-25',
        price: 190,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(64);
      expect(result.daysInPeriod).toBe(31);
      expect(result.proratedPrice).toBeCloseTo(92.03, 1);
    });

    it('calculates Dec 5 - Feb 5, 190, January portion', () => {
      // Total: 63 calendar days, January: 31 calendar days
      // Expected: (31/63) * 190 = 93.49
      const booking = {
        startDate: '2025-12-05',
        endDate: '2026-02-05',
        price: 190,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(63);
      expect(result.daysInPeriod).toBe(31);
      expect(result.proratedPrice).toBeCloseTo(93.49, 1);
    });

    it('calculates Dec 11 - Jan 11, 100, January portion', () => {
      // Total: 32 calendar days, January 1-11: 11 calendar days
      // Expected: (11/32) * 100 = 34.38
      const booking = {
        startDate: '2025-12-11',
        endDate: '2026-01-11',
        price: 100,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(32);
      expect(result.daysInPeriod).toBe(11);
      expect(result.proratedPrice).toBeCloseTo(34.38, 1);
    });

    it('calculates Jan 14 - Feb 14, 100, January portion', () => {
      // Total: 32 calendar days, Jan 14-31: 18 calendar days
      // Expected: (18/32) * 100 = 56.25
      const booking = {
        startDate: '2026-01-14',
        endDate: '2026-02-14',
        price: 100,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(32);
      expect(result.daysInPeriod).toBe(18);
      expect(result.proratedPrice).toBeCloseTo(56.25, 1);
    });

    it('calculates Dec 9 - Jan 8, 100, January portion', () => {
      // Total: 31 calendar days, Jan 1-8: 8 calendar days
      // Expected: (8/31) * 100 = 25.81
      const booking = {
        startDate: '2025-12-09',
        endDate: '2026-01-08',
        price: 100,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(31);
      expect(result.daysInPeriod).toBe(8);
      expect(result.proratedPrice).toBeCloseTo(25.81, 1);
    });
  });

  describe('edge cases', () => {
    it('returns 0 when booking is entirely outside the period', () => {
      const booking = {
        startDate: '2025-11-01',
        endDate: '2025-11-30',
        price: 100,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.daysInPeriod).toBe(0);
      expect(result.proratedPrice).toBe(0);
    });

    it('handles single-day bookings', () => {
      const booking = {
        startDate: '2026-01-15',
        endDate: '2026-01-15',
        price: 15,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(1);
      expect(result.daysInPeriod).toBe(1);
      expect(result.proratedPrice).toBe(15);
    });

    it('handles booking that starts before period and ends within', () => {
      const booking = {
        startDate: '2025-12-15',
        endDate: '2026-01-15',
        price: 200,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      // Jan 1-15 = 15 calendar days in period
      expect(result.daysInPeriod).toBe(15);
    });

    it('handles booking that starts within period and ends after', () => {
      const booking = {
        startDate: '2026-01-20',
        endDate: '2026-02-28',
        price: 300,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      // Jan 20-31 = 12 calendar days
      expect(result.daysInPeriod).toBe(12);
    });
  });
});

describe('calculateStats', () => {
  const createBooking = (
    deskId: string,
    date: string,
    startDate: string,
    endDate: string,
    status: 'assigned' | 'booked',
    price: number
  ): DeskBooking => ({
    id: `${deskId}-${date}`,
    deskId,
    date,
    startDate,
    endDate,
    status,
    price,
    currency: 'EUR',
  });

  it('calculates correct stats for a simple month', () => {
    const periodStart = localDate(2026, 1, 1);
    const periodEnd = localDate(2026, 1, 31);
    const daysInPeriod = generateDaysInRange(periodStart, periodEnd);

    // Single booking for the whole month
    const bookings = daysInPeriod.map(date =>
      createBooking('room1-desk1', date, '2026-01-01', '2026-01-31', 'assigned', 220)
    );

    const stats = calculateStats({
      bookings,
      daysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.occupiedDays).toBe(31);
    expect(stats.totalDeskDays).toBe(DESK_COUNT * 31);
    expect(stats.confirmedRevenue).toBe(220);
    expect(stats.expectedRevenue).toBe(0);
    expect(stats.totalRevenue).toBe(220);
  });

  it('separates confirmed and expected revenue', () => {
    const periodStart = localDate(2026, 1, 5);
    const periodEnd = localDate(2026, 1, 9);
    const daysInPeriod = generateDaysInRange(periodStart, periodEnd);

    const bookings = [
      ...daysInPeriod.map(date =>
        createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 100)
      ),
      ...daysInPeriod.map(date =>
        createBooking('room1-desk2', date, '2026-01-05', '2026-01-09', 'booked', 80)
      ),
    ];

    const stats = calculateStats({
      bookings,
      daysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.confirmedRevenue).toBe(100);
    expect(stats.expectedRevenue).toBe(80);
    expect(stats.totalRevenue).toBe(180);
    expect(stats.occupiedDays).toBe(10); // 5 days * 2 desks
  });

  it('does not double-count multi-day booking revenue', () => {
    const periodStart = localDate(2026, 1, 5);
    const periodEnd = localDate(2026, 1, 9);
    const daysInPeriod = generateDaysInRange(periodStart, periodEnd);

    const bookings = daysInPeriod.map(date =>
      createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 100)
    );

    const stats = calculateStats({
      bookings,
      daysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.confirmedRevenue).toBe(100);
    expect(stats.occupiedDays).toBe(5);
  });

  it('handles zero-price bookings (free guests)', () => {
    const periodStart = localDate(2026, 1, 5);
    const periodEnd = localDate(2026, 1, 9);
    const daysInPeriod = generateDaysInRange(periodStart, periodEnd);

    const bookings = daysInPeriod.map(date =>
      createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 0)
    );

    const stats = calculateStats({
      bookings,
      daysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.confirmedRevenue).toBe(0);
    expect(stats.occupiedDays).toBe(5);
    expect(stats.occupancyRate).toBeGreaterThan(0);
    expect(stats.revenuePerOccupiedDay).toBe(0);
  });

  it('returns zeros for empty bookings list', () => {
    const periodStart = localDate(2026, 1, 5);
    const periodEnd = localDate(2026, 1, 9);
    const daysInPeriod = generateDaysInRange(periodStart, periodEnd);

    const stats = calculateStats({
      bookings: [],
      daysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.totalDeskDays).toBe(DESK_COUNT * 5);
    expect(stats.occupiedDays).toBe(0);
    expect(stats.totalRevenue).toBe(0);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.revenuePerOccupiedDay).toBe(0);
  });
});

describe('calculateMonthlyStats', () => {
  const createBooking = (
    deskId: string,
    date: string,
    startDate: string,
    endDate: string,
    status: 'assigned' | 'booked',
    price: number
  ): DeskBooking => ({
    id: `${deskId}-${date}`,
    deskId,
    date,
    startDate,
    endDate,
    status,
    price,
    currency: 'EUR',
  });

  it('calculates January 2026 stats correctly', () => {
    const januaryDays = generateDaysInRange(localDate(2026, 1, 1), localDate(2026, 1, 31));

    const bookings = januaryDays.map(date =>
      createBooking('room1-desk1', date, '2026-01-01', '2026-01-31', 'assigned', 220)
    );

    const stats = calculateMonthlyStats(bookings, 2026, 0, 'EUR');

    expect(stats.totalDeskDays).toBe(DESK_COUNT * 31);
    expect(stats.occupiedDays).toBe(31);
    expect(stats.confirmedRevenue).toBe(220);
    expect(stats.currency).toBe('EUR');
  });

  it('prorates multi-month booking correctly', () => {
    // Dec 15 - Feb 15 booking for 190
    // Total: 63 calendar days, January: 31 calendar days
    // January portion: (31/63) * 190 = 93.49
    const allDays = generateDaysInRange(localDate(2025, 12, 15), localDate(2026, 2, 15));
    const januaryDays = generateDaysInRange(localDate(2026, 1, 1), localDate(2026, 1, 31));

    const bookings = allDays
      .filter(date => januaryDays.includes(date))
      .map(date =>
        createBooking('room1-desk1', date, '2025-12-15', '2026-02-15', 'assigned', 190)
      );

    const stats = calculateMonthlyStats(bookings, 2026, 0, 'EUR');

    expect(stats.confirmedRevenue).toBeCloseTo(93.49, 1);
  });
});

describe('calculateDateRangeStats', () => {
  const createBooking = (
    deskId: string,
    date: string,
    startDate: string,
    endDate: string,
    status: 'assigned' | 'booked',
    price: number
  ): DeskBooking => ({
    id: `${deskId}-${date}`,
    deskId,
    date,
    startDate,
    endDate,
    status,
    price,
    currency: 'EUR',
  });

  it('calculates stats for a week correctly', () => {
    const weekDays = generateDaysInRange(localDate(2026, 1, 5), localDate(2026, 1, 9));

    const bookings = weekDays.map(date =>
      createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 75)
    );

    const stats = calculateDateRangeStats(bookings, '2026-01-05', '2026-01-09', 'EUR');

    expect(stats.totalDeskDays).toBe(DESK_COUNT * 5);
    expect(stats.occupiedDays).toBe(5);
    expect(stats.confirmedRevenue).toBe(75);
  });

  it('prorates booking that extends beyond the range', () => {
    // Booking: Jan 1 - Jan 31, 220 (31 calendar days)
    // Query range: Jan 5 - Jan 9 (5 calendar days)
    // Expected: (5/31) * 220 = 35.48
    const rangeDays = generateDaysInRange(localDate(2026, 1, 5), localDate(2026, 1, 9));

    const bookings = rangeDays.map(date =>
      createBooking('room1-desk1', date, '2026-01-01', '2026-01-31', 'assigned', 220)
    );

    const stats = calculateDateRangeStats(bookings, '2026-01-05', '2026-01-09', 'EUR');

    expect(stats.confirmedRevenue).toBeCloseTo(35.48, 1);
  });

  it('handles cross-month range correctly', () => {
    // Range: Dec 29 - Jan 2 (5 calendar days)
    const rangeDays = generateDaysInRange(localDate(2025, 12, 29), localDate(2026, 1, 2));

    const bookings = rangeDays.map(date =>
      createBooking('room1-desk1', date, '2025-12-29', '2026-01-02', 'assigned', 60)
    );

    const stats = calculateDateRangeStats(bookings, '2025-12-29', '2026-01-02', 'EUR');

    expect(stats.confirmedRevenue).toBe(60);
    expect(stats.occupiedDays).toBe(rangeDays.length);
  });
});

describe('DESK_COUNT constant', () => {
  it('is set to 8 (2 rooms x 4 desks)', () => {
    expect(DESK_COUNT).toBe(8);
  });
});
