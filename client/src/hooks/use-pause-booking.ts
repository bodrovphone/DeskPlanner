import { useCallback } from 'react';
import dayjs from 'dayjs';
import { useDataStore } from '@/contexts/DataStoreContext';
import { DeskBooking } from '@shared/schema';
import { generateDateRange } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateBookingQueries } from '@/hooks/use-booking-actions';

export type SegmentType = 'pre' | 'post' | 'extension';

export interface PauseSegment {
  type: SegmentType;
  label: string;
  startDate: string;
  endDate: string;
  days: number;
  price: number;
}

export function calculatePauseSegments(
  originalStart: string,
  originalEnd: string,
  pauseStart: string,
  pauseEnd: string,
  originalPrice: number,
): PauseSegment[] {
  const segments: PauseSegment[] = [];

  const allDates = generateDateRange(originalStart, originalEnd);
  const pauseDates = generateDateRange(pauseStart, pauseEnd);

  const preDates = allDates.filter(d => d < pauseStart);
  const postDates = allDates.filter(d => d > pauseEnd);
  const activeDays = preDates.length + postDates.length;

  if (preDates.length > 0) {
    const prePrice = activeDays > 0
      ? Math.round((preDates.length / activeDays) * originalPrice * 100) / 100
      : 0;
    segments.push({
      type: 'pre',
      label: 'Pre-pause',
      startDate: preDates[0],
      endDate: preDates[preDates.length - 1],
      days: preDates.length,
      price: prePrice,
    });
  }

  if (postDates.length > 0) {
    const prePrice = segments.length > 0 ? segments[0].price : 0;
    const postPrice = Math.round((originalPrice - prePrice) * 100) / 100;
    segments.push({
      type: 'post',
      label: 'Post-pause',
      startDate: postDates[0],
      endDate: postDates[postDates.length - 1],
      days: postDates.length,
      price: postPrice,
    });
  }

  // If only one active segment exists, it gets the full price
  if (segments.length === 1) {
    segments[0].price = originalPrice;
  }

  // Extension days: add pauseDays count after original end
  const pauseDayCount = pauseDates.length;
  if (pauseDayCount > 0) {
    const extStart = dayjs(originalEnd).add(1, 'day');
    const extEnd = extStart.add(pauseDayCount - 1, 'day');
    segments.push({
      type: 'extension',
      label: 'Extension (free)',
      startDate: extStart.format('YYYY-MM-DD'),
      endDate: extEnd.format('YYYY-MM-DD'),
      days: pauseDayCount,
      price: 0,
    });
  }

  return segments;
}

export function usePauseBooking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dataStore = useDataStore();

  const handlePauseBooking = useCallback(async (
    booking: DeskBooking,
    deskId: string,
    pauseStart: string,
    pauseEnd: string,
  ) => {
    const originalPrice = booking.price ?? 0;
    const segments = calculatePauseSegments(
      booking.startDate,
      booking.endDate,
      pauseStart,
      pauseEnd,
      originalPrice,
    );

    const pauseDates = generateDateRange(pauseStart, pauseEnd);
    const pauseDayCount = pauseDates.length;

    // 1. Find available extension dates using batch query
    const extensionDates: string[] = [];
    if (pauseDayCount > 0) {
      const scanStart = dayjs(booking.endDate).add(1, 'day').format('YYYY-MM-DD');
      const scanEnd = dayjs(booking.endDate).add(365, 'day').format('YYYY-MM-DD');
      const existingBookings = await dataStore.getBookingsForDesk(deskId, scanStart, scanEnd);
      const occupiedDates = new Set(
        existingBookings
          .filter(b => b.status !== 'available')
          .map(b => b.date)
      );

      let candidate = dayjs(booking.endDate).add(1, 'day');
      while (extensionDates.length < pauseDayCount && candidate.format('YYYY-MM-DD') <= scanEnd) {
        const dateStr = candidate.format('YYYY-MM-DD');
        if (!occupiedDates.has(dateStr)) {
          extensionDates.push(dateStr);
        }
        candidate = candidate.add(1, 'day');
      }

      if (extensionDates.length < pauseDayCount) {
        throw new Error(
          `Could not find ${pauseDayCount} available extension day(s) within the next year.`
        );
      }
    }

    // 2. Bulk-delete the paused days
    const deletions = pauseDates.map(date => ({ deskId, date }));
    if (dataStore.bulkDeleteBookings) {
      await dataStore.bulkDeleteBookings(deletions);
    } else {
      await Promise.all(deletions.map(d => dataStore.deleteBooking(d.deskId, d.date)));
    }

    // 3. Build upserts for all segments
    const upserts: DeskBooking[] = [];
    for (const segment of segments) {
      const isExtension = segment.type === 'extension';
      const dates = isExtension
        ? extensionDates
        : generateDateRange(segment.startDate, segment.endDate);

      const segStartDate = isExtension && extensionDates.length > 0
        ? extensionDates[0] : segment.startDate;
      const segEndDate = isExtension && extensionDates.length > 0
        ? extensionDates[extensionDates.length - 1] : segment.endDate;

      for (const date of dates) {
        upserts.push({
          id: `${deskId}-${date}`,
          deskId,
          date,
          startDate: segStartDate,
          endDate: segEndDate,
          status: booking.status,
          personName: booking.personName,
          title: booking.title,
          price: segment.price,
          currency: booking.currency,
          createdAt: isExtension ? new Date().toISOString() : booking.createdAt,
        });
      }
    }

    await dataStore.bulkUpdateBookings(upserts);
    invalidateBookingQueries(queryClient);

    toast({
      title: 'Booking Paused & Extended',
      description: `${booking.personName}: ${pauseDayCount} day(s) paused, ${pauseDayCount} extension day(s) added at no charge`,
    });
  }, [dataStore, queryClient, toast]);

  return { handlePauseBooking };
}
