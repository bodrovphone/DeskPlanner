import { useQuery } from '@tanstack/react-query';
import { useDataStore } from '@/contexts/DataStoreContext';
import { IDataStore } from '@/lib/dataStore';
import { DeskBooking } from '@shared/schema';

const DESKS = [
  { id: 'room1-desk1', room: 1, number: 1, label: 'Room 1 - Desk 1' },
  { id: 'room1-desk2', room: 1, number: 2, label: 'Room 1 - Desk 2' },
  { id: 'room1-desk3', room: 1, number: 3, label: 'Room 1 - Desk 3' },
  { id: 'room1-desk4', room: 1, number: 4, label: 'Room 1 - Desk 4' },
  { id: 'room2-desk1', room: 2, number: 1, label: 'Room 2 - Desk 1' },
  { id: 'room2-desk2', room: 2, number: 2, label: 'Room 2 - Desk 2' },
  { id: 'room2-desk3', room: 2, number: 3, label: 'Room 2 - Desk 3' },
  { id: 'room2-desk4', room: 2, number: 4, label: 'Room 2 - Desk 4' },
];

// Helper function to check if date is weekend
const isWeekend = (dateString: string): boolean => {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
};

export interface BookedDate {
  date: string;
  names: string[];
  booking: DeskBooking;
  deskId: string;
}

export interface ExpiringAssignment {
  date: string;
  personName: string;
  deskNumber: number;
  booking: DeskBooking;
  deskId: string;
}

async function calculateNextDates(dataStore: IDataStore) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate date range for next 30 days
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 1); // Start from tomorrow
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  // Fetch bookings for the next 30 days only (optimization)
  const allBookings = await dataStore.getAllBookings(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  // Create lookup map for efficient access
  const bookingLookup = new Map<string, any>();
  Object.values(allBookings).forEach(booking => {
    const key = `${booking.deskId}-${booking.date}`;
    bookingLookup.set(key, booking);
  });

  const availableDates: string[] = [];
  const bookedDatesMap = new Map<string, { names: Set<string>; booking: DeskBooking; deskId: string }>();
  let checkDate = new Date(today);
  checkDate.setDate(checkDate.getDate() + 1); // Start from tomorrow

  // Check up to 30 days ahead
  const maxDaysToCheck = 30;
  let daysChecked = 0;

  while ((availableDates.length < 5 || bookedDatesMap.size < 3) && daysChecked < maxDaysToCheck) {
    const dateString = checkDate.toISOString().split('T')[0];

    // Skip weekends
    if (!isWeekend(dateString)) {
      // Check each desk on this date
      let hasAvailableDesk = false;
      const bookedNames = new Set<string>();
      let firstBookedBooking: DeskBooking | null = null;
      let firstBookedDeskId: string | null = null;

      for (const desk of DESKS) {
        const bookingKey = `${desk.id}-${dateString}`;
        const booking = bookingLookup.get(bookingKey);

        if (!booking) {
          hasAvailableDesk = true;
        } else if (booking.status === 'available') {
          hasAvailableDesk = true;
        } else if (booking.status === 'booked' && booking.personName) {
          bookedNames.add(booking.personName);
          if (!firstBookedBooking) {
            firstBookedBooking = booking;
            firstBookedDeskId = desk.id;
          }
        }
      }

      // Track available dates
      if (hasAvailableDesk && availableDates.length < 5) {
        availableDates.push(dateString);
      }

      // Track booked dates with names and first booking
      if (bookedNames.size > 0 && bookedDatesMap.size < 3 && firstBookedBooking && firstBookedDeskId) {
        bookedDatesMap.set(dateString, {
          names: bookedNames,
          booking: firstBookedBooking,
          deskId: firstBookedDeskId,
        });
      }
    }

    checkDate.setDate(checkDate.getDate() + 1);
    daysChecked++;
  }

  // Convert booked dates map to array format
  const bookedDates: BookedDate[] = Array.from(bookedDatesMap.entries()).map(([date, data]) => ({
    date,
    names: Array.from(data.names),
    booking: data.booking,
    deskId: data.deskId,
  }));

  // Check for expiring assignments in the next 10 days
  const expiring: ExpiringAssignment[] = [];
  const checkDates: string[] = [];

  // Generate dates for the next 10 days
  for (let i = 1; i <= 10; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i);
    checkDates.push(futureDate.toISOString().split('T')[0]);
  }

  for (const dateString of checkDates) {
    if (!isWeekend(dateString)) {
      for (const desk of DESKS) {
        const bookingKey = `${desk.id}-${dateString}`;
        const booking = bookingLookup.get(bookingKey);

        if (booking && booking.status === 'assigned' && booking.personName && booking.endDate === dateString) {
          expiring.push({
            date: dateString,
            personName: booking.personName,
            deskNumber: desk.number,
            booking,
            deskId: desk.id,
          });
        }
      }
    }
  }

  return {
    available: availableDates,
    booked: bookedDates,
    expiring
  };
}

export function useNextDates() {
  const dataStore = useDataStore();
  return useQuery({
    queryKey: ['next-dates'],
    queryFn: () => calculateNextDates(dataStore),
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch too often
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 1, // Only retry once on failure
  });
}
