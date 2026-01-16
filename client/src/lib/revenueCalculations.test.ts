import { describe, it, expect } from 'vitest';
import {
  countBusinessDays,
  generateBusinessDays,
  getMonthBoundaries,
  calculateProratedRevenue,
  calculateStats,
  calculateMonthlyStats,
  calculateDateRangeStats,
  DESK_COUNT,
} from './revenueCalculations';
import { DeskBooking } from '@shared/schema';

function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe('countBusinessDays', () => {
  it('counts weekdays correctly for a full week', () => {
    // Monday Jan 6 to Friday Jan 10, 2025 = 5 business days
    const start = localDate(2025, 1, 6);
    const end = localDate(2025, 1, 10);
    expect(countBusinessDays(start, end)).toBe(5);
  });

  it('excludes weekends', () => {
    // Friday Jan 10 to Monday Jan 13, 2025 = 2 business days (Fri, Mon)
    const start = localDate(2025, 1, 10);
    const end = localDate(2025, 1, 13);
    expect(countBusinessDays(start, end)).toBe(2);
  });

  it('returns 1 for a single weekday', () => {
    const start = localDate(2025, 1, 6); // Monday
    const end = localDate(2025, 1, 6);
    expect(countBusinessDays(start, end)).toBe(1);
  });

  it('returns 0 for a single Saturday', () => {
    const start = localDate(2025, 1, 11); // Saturday
    const end = localDate(2025, 1, 11);
    expect(countBusinessDays(start, end)).toBe(0);
  });

  it('returns 0 for a single Sunday', () => {
    const start = localDate(2025, 1, 12); // Sunday
    const end = localDate(2025, 1, 12);
    expect(countBusinessDays(start, end)).toBe(0);
  });

  it('returns 0 for a weekend (Saturday to Sunday)', () => {
    const start = localDate(2025, 1, 11); // Saturday
    const end = localDate(2025, 1, 12); // Sunday
    expect(countBusinessDays(start, end)).toBe(0);
  });

  it('counts correctly for a full month (January 2026)', () => {
    // January 2026: 22 business days (31 days - 4 Saturdays - 5 Sundays)
    const start = localDate(2026, 1, 1);
    const end = localDate(2026, 1, 31);
    expect(countBusinessDays(start, end)).toBe(22);
  });

  it('counts correctly for February 2026 (non-leap year)', () => {
    // February 2026: 20 business days
    const start = localDate(2026, 2, 1);
    const end = localDate(2026, 2, 28);
    expect(countBusinessDays(start, end)).toBe(20);
  });

  it('counts correctly across month boundaries', () => {
    // Dec 22, 2025 to Mar 10, 2026 (like Алексей's booking)
    const start = localDate(2025, 12, 22);
    const end = localDate(2026, 3, 10);
    expect(countBusinessDays(start, end)).toBe(57);
  });

  it('counts correctly for Dec 24 to Feb 25 (like Христо)', () => {
    const start = localDate(2025, 12, 24);
    const end = localDate(2026, 2, 25);
    expect(countBusinessDays(start, end)).toBe(46);
  });

  it('counts correctly for Dec 5 to Feb 5 (like Петър)', () => {
    const start = localDate(2025, 12, 5);
    const end = localDate(2026, 2, 5);
    expect(countBusinessDays(start, end)).toBe(45);
  });

  it('handles edge case where end is before start', () => {
    const start = localDate(2025, 1, 10);
    const end = localDate(2025, 1, 5);
    expect(countBusinessDays(start, end)).toBe(0);
  });
});

describe('generateBusinessDays', () => {
  it('generates correct business days for a week', () => {
    const start = localDate(2025, 1, 6); // Monday
    const end = localDate(2025, 1, 10); // Friday
    const days = generateBusinessDays(start, end);
    expect(days).toEqual([
      '2025-01-06',
      '2025-01-07',
      '2025-01-08',
      '2025-01-09',
      '2025-01-10',
    ]);
  });

  it('skips weekends', () => {
    const start = localDate(2025, 1, 10); // Friday
    const end = localDate(2025, 1, 13); // Monday
    const days = generateBusinessDays(start, end);
    expect(days).toEqual(['2025-01-10', '2025-01-13']);
  });

  it('returns empty array for weekend-only range', () => {
    const start = localDate(2025, 1, 11); // Saturday
    const end = localDate(2025, 1, 12); // Sunday
    const days = generateBusinessDays(start, end);
    expect(days).toEqual([]);
  });

  it('returns correct count for January 2026', () => {
    const start = localDate(2026, 1, 1);
    const end = localDate(2026, 1, 31);
    const days = generateBusinessDays(start, end);
    expect(days.length).toBe(22);
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

  describe('multi-month bookings - real scenarios from data', () => {
    it('calculates Алексей: Dec 22 - Mar 10, €240, January portion', () => {
      // Total: 57 business days, January: 22 business days
      // Expected: (22/57) * 240 = €92.63
      const booking = {
        startDate: '2025-12-22',
        endDate: '2026-03-10',
        price: 240,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(57);
      expect(result.daysInPeriod).toBe(22);
      expect(result.proratedPrice).toBeCloseTo(92.63, 1);
    });

    it('calculates Христо: Dec 24 - Feb 25, €190, January portion', () => {
      // Total: 46 business days, January: 22 business days
      // Expected: (22/46) * 190 = €90.87
      const booking = {
        startDate: '2025-12-24',
        endDate: '2026-02-25',
        price: 190,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(46);
      expect(result.daysInPeriod).toBe(22);
      expect(result.proratedPrice).toBeCloseTo(90.87, 1);
    });

    it('calculates Петър: Dec 5 - Feb 5, €190, January portion', () => {
      // Total: 45 business days, January: 22 business days
      // Expected: (22/45) * 190 = €92.89
      const booking = {
        startDate: '2025-12-05',
        endDate: '2026-02-05',
        price: 190,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(45);
      expect(result.daysInPeriod).toBe(22);
      expect(result.proratedPrice).toBeCloseTo(92.89, 1);
    });

    it('calculates Вячеслав: Dec 11 - Jan 11, €100, January portion', () => {
      // Total: 22 business days, January: 7 business days
      // Expected: (7/22) * 100 = €31.82
      const booking = {
        startDate: '2025-12-11',
        endDate: '2026-01-11',
        price: 100,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(22);
      expect(result.daysInPeriod).toBe(7);
      expect(result.proratedPrice).toBeCloseTo(31.82, 1);
    });

    it('calculates Leo: Jan 14 - Feb 14, €100, January portion', () => {
      // Total: 23 business days, January: 13 business days
      // Expected: (13/23) * 100 = €56.52
      const booking = {
        startDate: '2026-01-14',
        endDate: '2026-02-14',
        price: 100,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(23);
      expect(result.daysInPeriod).toBe(13);
      expect(result.proratedPrice).toBeCloseTo(56.52, 1);
    });

    it('calculates Игорь: Dec 9 - Jan 8, €100, January portion', () => {
      // Total: 23 business days, January: 6 business days
      // Expected: (6/23) * 100 = €26.09
      const booking = {
        startDate: '2025-12-09',
        endDate: '2026-01-08',
        price: 100,
      };
      const periodStart = localDate(2026, 1, 1);
      const periodEnd = localDate(2026, 1, 31);

      const result = calculateProratedRevenue(booking, periodStart, periodEnd);
      expect(result.totalBookingDays).toBe(23);
      expect(result.daysInPeriod).toBe(6);
      expect(result.proratedPrice).toBeCloseTo(26.09, 1);
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
      // Dec 15 - Jan 15 spans two partial months
      // Only January 1-15 business days count in period
      expect(result.daysInPeriod).toBe(11); // Jan 1-15 has 11 business days
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
      // Jan 20-31 has 9 business days (20,21,22,23, 26,27,28,29,30 - skip weekends)
      expect(result.daysInPeriod).toBe(9);
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
    const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

    // Single booking for the whole month
    const bookings = businessDaysInPeriod.map(date =>
      createBooking('room1-desk1', date, '2026-01-01', '2026-01-31', 'assigned', 220)
    );

    const stats = calculateStats({
      bookings,
      businessDaysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.occupiedDays).toBe(22); // All business days occupied
    expect(stats.totalDeskDays).toBe(DESK_COUNT * 22); // 8 desks * 22 days = 176
    expect(stats.confirmedRevenue).toBe(220); // Single booking, full price
    expect(stats.expectedRevenue).toBe(0);
    expect(stats.totalRevenue).toBe(220);
    expect(stats.occupancyRate).toBeCloseTo((22 / 176) * 100, 1);
  });

  it('separates confirmed and expected revenue', () => {
    const periodStart = localDate(2026, 1, 5);
    const periodEnd = localDate(2026, 1, 9);
    const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

    const bookings = [
      // Assigned booking
      ...businessDaysInPeriod.map(date =>
        createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 100)
      ),
      // Booked (pending) booking
      ...businessDaysInPeriod.map(date =>
        createBooking('room1-desk2', date, '2026-01-05', '2026-01-09', 'booked', 80)
      ),
    ];

    const stats = calculateStats({
      bookings,
      businessDaysInPeriod,
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
    const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

    // 5-day booking stored as 5 separate entries with the same startDate
    const bookings = businessDaysInPeriod.map(date =>
      createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 100)
    );

    const stats = calculateStats({
      bookings,
      businessDaysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    // Revenue should be 100, not 500 (no double-counting)
    expect(stats.confirmedRevenue).toBe(100);
    expect(stats.occupiedDays).toBe(5);
  });

  it('handles zero-price bookings (free guests)', () => {
    const periodStart = localDate(2026, 1, 5);
    const periodEnd = localDate(2026, 1, 9);
    const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

    const bookings = businessDaysInPeriod.map(date =>
      createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 0)
    );

    const stats = calculateStats({
      bookings,
      businessDaysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.confirmedRevenue).toBe(0);
    expect(stats.occupiedDays).toBe(5);
    expect(stats.occupancyRate).toBeGreaterThan(0);
    expect(stats.revenuePerOccupiedDay).toBe(0);
  });

  it('calculates correct occupancy rate', () => {
    const periodStart = localDate(2026, 1, 5);
    const periodEnd = localDate(2026, 1, 9);
    const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

    // 5 days, 8 desks = 40 total desk-days
    // Fill 2 desks for all 5 days = 10 occupied desk-days
    const bookings = [
      ...businessDaysInPeriod.map(date =>
        createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 100)
      ),
      ...businessDaysInPeriod.map(date =>
        createBooking('room1-desk2', date, '2026-01-05', '2026-01-09', 'assigned', 100)
      ),
    ];

    const stats = calculateStats({
      bookings,
      businessDaysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.totalDeskDays).toBe(40); // 8 desks * 5 days
    expect(stats.occupiedDays).toBe(10); // 2 desks * 5 days
    expect(stats.occupancyRate).toBe(25); // 10/40 * 100
  });

  it('returns zeros for empty bookings list', () => {
    const periodStart = localDate(2026, 1, 5);
    const periodEnd = localDate(2026, 1, 9);
    const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

    const stats = calculateStats({
      bookings: [],
      businessDaysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.totalDeskDays).toBe(40); // 8 desks * 5 days
    expect(stats.occupiedDays).toBe(0);
    expect(stats.totalRevenue).toBe(0);
    expect(stats.occupancyRate).toBe(0);
    expect(stats.revenuePerOccupiedDay).toBe(0);
  });

  it('returns zero totalDeskDays for weekend-only period', () => {
    const periodStart = localDate(2026, 1, 10); // Saturday
    const periodEnd = localDate(2026, 1, 11); // Sunday
    const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

    const stats = calculateStats({
      bookings: [],
      businessDaysInPeriod,
      periodStart,
      periodEnd,
      currency: 'EUR',
    });

    expect(stats.totalDeskDays).toBe(0);
    expect(stats.occupancyRate).toBe(0);
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
    const januaryDays = generateBusinessDays(localDate(2026, 1, 1), localDate(2026, 1, 31));

    const bookings = januaryDays.map(date =>
      createBooking('room1-desk1', date, '2026-01-01', '2026-01-31', 'assigned', 220)
    );

    const stats = calculateMonthlyStats(bookings, 2026, 0, 'EUR');

    expect(stats.totalDeskDays).toBe(DESK_COUNT * 22);
    expect(stats.occupiedDays).toBe(22);
    expect(stats.confirmedRevenue).toBe(220);
    expect(stats.currency).toBe('EUR');
  });

  it('prorates multi-month booking correctly', () => {
    // Simulate Dec 15 - Feb 15 booking for €190
    // Total business days: Dec 15-31 (13) + Jan (22) + Feb 1-15 (10) = 45 business days
    // January portion: (22/45) * 190 = €92.89
    const allDays = generateBusinessDays(localDate(2025, 12, 15), localDate(2026, 2, 15));
    const januaryDays = generateBusinessDays(localDate(2026, 1, 1), localDate(2026, 1, 31));

    // Filter to only include days that fall in January for the bookings array
    const bookings = allDays
      .filter(date => januaryDays.includes(date))
      .map(date =>
        createBooking('room1-desk1', date, '2025-12-15', '2026-02-15', 'assigned', 190)
      );

    const stats = calculateMonthlyStats(bookings, 2026, 0, 'EUR');

    // The booking spans Dec 15 - Feb 15 (45 total business days)
    // January has 22 business days
    // Expected: (22/45) * 190 = €92.89
    expect(stats.confirmedRevenue).toBeCloseTo(92.89, 1);
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
    const weekDays = generateBusinessDays(localDate(2026, 1, 5), localDate(2026, 1, 9));

    const bookings = weekDays.map(date =>
      createBooking('room1-desk1', date, '2026-01-05', '2026-01-09', 'assigned', 75)
    );

    const stats = calculateDateRangeStats(bookings, '2026-01-05', '2026-01-09', 'EUR');

    expect(stats.totalDeskDays).toBe(DESK_COUNT * 5); // 8 desks * 5 days
    expect(stats.occupiedDays).toBe(5);
    expect(stats.confirmedRevenue).toBe(75);
  });

  it('prorates booking that extends beyond the range', () => {
    // Booking: Jan 1 - Jan 31, €220 (22 business days)
    // Query range: Jan 6 - Jan 10 (5 business days)
    // Expected: (5/22) * 220 = €50
    const rangeDays = generateBusinessDays(localDate(2026, 1, 5), localDate(2026, 1, 9));

    const bookings = rangeDays.map(date =>
      createBooking('room1-desk1', date, '2026-01-01', '2026-01-31', 'assigned', 220)
    );

    const stats = calculateDateRangeStats(bookings, '2026-01-05', '2026-01-09', 'EUR');

    // Full booking: 22 business days
    // Range: 5 business days
    // Expected: (5/22) * 220 = €50
    expect(stats.confirmedRevenue).toBeCloseTo(50, 0);
  });

  it('handles cross-month range correctly', () => {
    // Range: Dec 29 - Jan 2 (spans year boundary)
    const rangeDays = generateBusinessDays(localDate(2025, 12, 29), localDate(2026, 1, 2));

    // Booking that covers the entire range
    const bookings = rangeDays.map(date =>
      createBooking('room1-desk1', date, '2025-12-29', '2026-01-02', 'assigned', 60)
    );

    const stats = calculateDateRangeStats(bookings, '2025-12-29', '2026-01-02', 'EUR');

    expect(stats.confirmedRevenue).toBe(60);
    expect(stats.occupiedDays).toBe(rangeDays.length);
  });
});

describe('real-world scenario: January 2026 total revenue', () => {
  const createBooking = (
    deskId: string,
    date: string,
    startDate: string,
    endDate: string,
    status: 'assigned' | 'booked',
    price: number,
    personName?: string
  ): DeskBooking => ({
    id: `${deskId}-${date}`,
    deskId,
    date,
    startDate,
    endDate,
    status,
    price,
    currency: 'EUR',
    personName,
  });

  it('calculates January 2026 revenue matching SQL query result (€595.86)', () => {
    const januaryDays = generateBusinessDays(localDate(2026, 1, 1), localDate(2026, 1, 31));

    // Recreate actual bookings from the SQL results (original dates from database)
    const bookingData = [
      { deskId: 'room1-desk1', startDate: '2025-12-22', endDate: '2026-03-10', price: 240, name: 'Алексей' },
      { deskId: 'room1-desk2', startDate: '2025-12-11', endDate: '2026-01-11', price: 100, name: 'Вячеслав' },
      { deskId: 'room1-desk2', startDate: '2026-01-14', endDate: '2026-02-14', price: 100, name: 'Leo' },
      { deskId: 'room1-desk3', startDate: '2026-01-01', endDate: '2026-01-06', price: 0, name: 'Саша Поморье' },
      { deskId: 'room1-desk3', startDate: '2026-01-06', endDate: '2026-02-01', price: 0, name: 'Я' },
      { deskId: 'room1-desk4', startDate: '2025-12-24', endDate: '2026-02-25', price: 190, name: 'Христо' },
      { deskId: 'room2-desk1', startDate: '2025-12-26', endDate: '2026-01-09', price: 0, name: 'Леонид' },
      { deskId: 'room2-desk1', startDate: '2026-01-05', endDate: '2026-01-06', price: 0, name: 'Леонид' },
      { deskId: 'room2-desk1', startDate: '2026-01-06', endDate: '2026-01-06', price: 15, name: 'Николета' },
      { deskId: 'room2-desk1', startDate: '2026-01-07', endDate: '2026-01-09', price: 20, name: 'Николета' },
      { deskId: 'room2-desk1', startDate: '2026-01-10', endDate: '2026-01-13', price: 0, name: 'Леонид' },
      { deskId: 'room2-desk1', startDate: '2026-01-14', endDate: '2026-02-14', price: 90, name: 'Иван' },
      { deskId: 'room2-desk2', startDate: '2025-12-05', endDate: '2026-02-05', price: 190, name: 'Петър' },
      { deskId: 'room2-desk3', startDate: '2025-12-29', endDate: '2026-01-01', price: 0, name: 'Иван бесплатно' },
      { deskId: 'room2-desk3', startDate: '2026-01-05', endDate: '2026-01-05', price: 15, name: 'Николета' },
      { deskId: 'room2-desk3', startDate: '2026-01-06', endDate: '2026-01-09', price: 0, name: 'Леонид' },
      { deskId: 'room2-desk3', startDate: '2026-01-12', endDate: '2026-01-13', price: 0, name: 'Леонид' },
      { deskId: 'room2-desk3', startDate: '2026-01-14', endDate: '2026-01-30', price: 50, name: 'Антон' },
      { deskId: 'room2-desk4', startDate: '2025-12-09', endDate: '2026-01-08', price: 100, name: 'Игорь' },
      { deskId: 'room2-desk4', startDate: '2026-01-09', endDate: '2026-01-13', price: 0, name: 'Игорь' },
      { deskId: 'room2-desk4', startDate: '2026-01-14', endDate: '2026-02-16', price: 100, name: 'Игорь' },
    ];

    // Generate bookings for each day in January that falls within each booking's range
    const bookings: DeskBooking[] = [];
    for (const data of bookingData) {
      const [startYear, startMonth, startDay] = data.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = data.endDate.split('-').map(Number);
      const bookingDays = generateBusinessDays(
        localDate(startYear, startMonth, startDay),
        localDate(endYear, endMonth, endDay)
      );
      for (const day of bookingDays) {
        if (januaryDays.includes(day)) {
          bookings.push(
            createBooking(data.deskId, day, data.startDate, data.endDate, 'assigned', data.price, data.name)
          );
        }
      }
    }

    const stats = calculateMonthlyStats(bookings, 2026, 0, 'EUR');

    // SQL query returned €595.86 total revenue
    expect(stats.totalRevenue).toBeCloseTo(595.86, 1);
    expect(stats.confirmedRevenue).toBeCloseTo(595.86, 1);
    expect(stats.expectedRevenue).toBe(0);
  });
});

describe('DESK_COUNT constant', () => {
  it('is set to 8 (2 rooms × 4 desks)', () => {
    expect(DESK_COUNT).toBe(8);
  });
});
