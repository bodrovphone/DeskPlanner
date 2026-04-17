import { DeskBooking, MonthlyStats, Currency } from '@shared/schema';
import { DESK_COUNT } from './deskConfig';
import { isNonWorkingDay } from './workingDays';
import { formatLocalDate } from './dateUtils';

function createLocalDate(source: Date): Date {
  return new Date(source.getFullYear(), source.getMonth(), source.getDate());
}

export function countCalendarDays(start: Date, end: Date): number {
  const s = createLocalDate(start);
  const e = createLocalDate(end);
  const diffMs = e.getTime() - s.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

export function generateDaysInRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const current = createLocalDate(start);
  const endDate = createLocalDate(end);

  while (current <= endDate) {
    days.push(formatLocalDate(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function getMonthBoundaries(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end };
}

export interface BookingRevenueInfo {
  totalBookingDays: number;
  daysInPeriod: number;
  proratedPrice: number;
}

export function calculateProratedRevenue(
  booking: { startDate: string; endDate: string; price?: number },
  periodStart: Date,
  periodEnd: Date
): BookingRevenueInfo {
  const bookingStart = new Date(booking.startDate);
  const bookingEnd = new Date(booking.endDate);

  const totalBookingDays = countCalendarDays(bookingStart, bookingEnd);

  const effectiveStart = bookingStart > periodStart ? bookingStart : periodStart;
  const effectiveEnd = bookingEnd < periodEnd ? bookingEnd : periodEnd;
  const daysInPeriod = countCalendarDays(effectiveStart, effectiveEnd);

  const bookingPrice = booking.price || 0;
  const proratedPrice = totalBookingDays > 0
    ? (daysInPeriod / totalBookingDays) * bookingPrice
    : 0;

  return { totalBookingDays, daysInPeriod, proratedPrice };
}

export function countOccupiedDays(
  bookings: DeskBooking[],
  daysInPeriod: string[],
  workingDays?: number[]
): { occupiedDays: number; assignedDays: number } {
  let occupiedDays = 0;
  let assignedDays = 0;

  for (const booking of bookings) {
    if (booking.isFrozen) continue;
    if (!daysInPeriod.includes(booking.date)) continue;

    if (booking.status === 'assigned' || booking.status === 'booked') {
      occupiedDays++;
    }
    if (booking.status === 'assigned' && (!workingDays || !isNonWorkingDay(booking.date, workingDays))) {
      assignedDays++;
    }
  }

  return { occupiedDays, assignedDays };
}

export interface RevenueBreakdown {
  confirmedRevenue: number;
  expectedRevenue: number;
  totalRevenue: number;
}

export function calculateRevenueByStatus(
  bookings: DeskBooking[],
  daysInPeriod: string[],
  periodStart: Date,
  periodEnd: Date
): RevenueBreakdown {
  const processedBookings = new Set<string>();
  let confirmedRevenue = 0;
  let expectedRevenue = 0;

  for (const booking of bookings) {
    if (booking.isFrozen) continue;
    if (!daysInPeriod.includes(booking.date)) continue;

    const bookingKey = `${booking.deskId}-${booking.startDate}`;
    if (processedBookings.has(bookingKey)) continue;
    processedBookings.add(bookingKey);

    const { proratedPrice } = calculateProratedRevenue(booking as { startDate: string; endDate: string; price?: number }, periodStart, periodEnd);

    if (booking.status === 'assigned') {
      confirmedRevenue += proratedPrice;
    } else if (booking.status === 'booked') {
      expectedRevenue += proratedPrice;
    }
  }

  return {
    confirmedRevenue,
    expectedRevenue,
    totalRevenue: confirmedRevenue + expectedRevenue,
  };
}

export interface DerivedMetrics {
  occupancyRate: number;
  revenuePerOccupiedDay: number;
}

export function calculateDerivedMetrics(
  occupiedDays: number,
  assignedDays: number,
  totalDeskDays: number,
  confirmedRevenue: number
): DerivedMetrics {
  const occupancyRate = totalDeskDays > 0 ? (occupiedDays / totalDeskDays) * 100 : 0;
  const revenuePerOccupiedDay = assignedDays > 0 ? confirmedRevenue / assignedDays : 0;

  return { occupancyRate, revenuePerOccupiedDay };
}

export interface StatsInput {
  bookings: DeskBooking[];
  daysInPeriod: string[];
  periodStart: Date;
  periodEnd: Date;
  currency: Currency;
  workingDays?: number[];
}

export function calculateStats(input: StatsInput): MonthlyStats {
  const { bookings, daysInPeriod, periodStart, periodEnd, currency, workingDays } = input;
  const totalDeskDays = DESK_COUNT * daysInPeriod.length;

  const { occupiedDays, assignedDays } = countOccupiedDays(bookings, daysInPeriod, workingDays);
  const revenue = calculateRevenueByStatus(bookings, daysInPeriod, periodStart, periodEnd);
  const metrics = calculateDerivedMetrics(occupiedDays, assignedDays, totalDeskDays, revenue.confirmedRevenue);

  return {
    totalRevenue: revenue.totalRevenue,
    confirmedRevenue: revenue.confirmedRevenue,
    expectedRevenue: revenue.expectedRevenue,
    occupiedDays,
    totalDeskDays,
    occupancyRate: metrics.occupancyRate,
    revenuePerOccupiedDay: metrics.revenuePerOccupiedDay,
    currency,
  };
}

export function calculateMonthlyStats(
  bookings: DeskBooking[],
  year: number,
  month: number,
  currency: Currency
): MonthlyStats {
  const { start: periodStart, end: periodEnd } = getMonthBoundaries(year, month);
  const daysInPeriod = generateDaysInRange(periodStart, periodEnd);

  return calculateStats({
    bookings,
    daysInPeriod,
    periodStart,
    periodEnd,
    currency,
  });
}

export function calculateDateRangeStats(
  bookings: DeskBooking[],
  startDate: string,
  endDate: string,
  currency: Currency
): MonthlyStats {
  const periodStart = new Date(startDate);
  const periodEnd = new Date(endDate);
  const daysInPeriod = generateDaysInRange(periodStart, periodEnd);

  return calculateStats({
    bookings,
    daysInPeriod,
    periodStart,
    periodEnd,
    currency,
  });
}
