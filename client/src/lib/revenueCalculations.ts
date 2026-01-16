import { DeskBooking, MonthlyStats, Currency } from '@shared/schema';

export const DESK_COUNT = 8; // 2 rooms × 4 desks

export function isWeekday(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createLocalDate(source: Date): Date {
  return new Date(source.getFullYear(), source.getMonth(), source.getDate());
}

export function countBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const current = createLocalDate(start);
  const endDate = createLocalDate(end);

  while (current <= endDate) {
    if (isWeekday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function generateBusinessDays(start: Date, end: Date): string[] {
  const businessDays: string[] = [];
  const current = createLocalDate(start);
  const endDate = createLocalDate(end);

  while (current <= endDate) {
    if (isWeekday(current)) {
      businessDays.push(formatLocalDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return businessDays;
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

  const totalBookingDays = countBusinessDays(bookingStart, bookingEnd);

  const effectiveStart = bookingStart > periodStart ? bookingStart : periodStart;
  const effectiveEnd = bookingEnd < periodEnd ? bookingEnd : periodEnd;
  const daysInPeriod = countBusinessDays(effectiveStart, effectiveEnd);

  const bookingPrice = booking.price || 0;
  const proratedPrice = totalBookingDays > 0
    ? (daysInPeriod / totalBookingDays) * bookingPrice
    : 0;

  return { totalBookingDays, daysInPeriod, proratedPrice };
}

export function countOccupiedDays(
  bookings: DeskBooking[],
  businessDaysInPeriod: string[]
): number {
  let occupiedDays = 0;

  for (const booking of bookings) {
    if (!businessDaysInPeriod.includes(booking.date)) continue;

    if (booking.status === 'assigned' || booking.status === 'booked') {
      occupiedDays++;
    }
  }

  return occupiedDays;
}

export interface RevenueBreakdown {
  confirmedRevenue: number;
  expectedRevenue: number;
  totalRevenue: number;
}

export function calculateRevenueByStatus(
  bookings: DeskBooking[],
  businessDaysInPeriod: string[],
  periodStart: Date,
  periodEnd: Date
): RevenueBreakdown {
  const processedBookings = new Set<string>();
  let confirmedRevenue = 0;
  let expectedRevenue = 0;

  for (const booking of bookings) {
    if (!businessDaysInPeriod.includes(booking.date)) continue;

    const bookingKey = `${booking.deskId}-${booking.startDate}`;
    if (processedBookings.has(bookingKey)) continue;
    processedBookings.add(bookingKey);

    const { proratedPrice } = calculateProratedRevenue(booking, periodStart, periodEnd);

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
  totalDeskDays: number,
  totalRevenue: number
): DerivedMetrics {
  const occupancyRate = totalDeskDays > 0 ? (occupiedDays / totalDeskDays) * 100 : 0;
  const revenuePerOccupiedDay = occupiedDays > 0 ? totalRevenue / occupiedDays : 0;

  return { occupancyRate, revenuePerOccupiedDay };
}

export interface StatsInput {
  bookings: DeskBooking[];
  businessDaysInPeriod: string[];
  periodStart: Date;
  periodEnd: Date;
  currency: Currency;
}

export function calculateStats(input: StatsInput): MonthlyStats {
  const { bookings, businessDaysInPeriod, periodStart, periodEnd, currency } = input;
  const totalDeskDays = DESK_COUNT * businessDaysInPeriod.length;

  const occupiedDays = countOccupiedDays(bookings, businessDaysInPeriod);
  const revenue = calculateRevenueByStatus(bookings, businessDaysInPeriod, periodStart, periodEnd);
  const metrics = calculateDerivedMetrics(occupiedDays, totalDeskDays, revenue.totalRevenue);

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
  const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

  return calculateStats({
    bookings,
    businessDaysInPeriod,
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
  const businessDaysInPeriod = generateBusinessDays(periodStart, periodEnd);

  return calculateStats({
    bookings,
    businessDaysInPeriod,
    periodStart,
    periodEnd,
    currency,
  });
}
