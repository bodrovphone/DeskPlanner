import { useQuery } from '@tanstack/react-query';
import { dataStore } from '@/lib/dataStore';

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

async function calculateNextDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Fetch all bookings once instead of individual calls
  const allBookings = await dataStore.getAllBookings();
  
  // Create lookup map for efficient access
  const bookingLookup = new Map<string, any>();
  Object.values(allBookings).forEach(booking => {
    const key = `${booking.deskId}-${booking.date}`;
    bookingLookup.set(key, booking);
  });
  
  const availableDates: string[] = [];
  const bookedDatesMap = new Map<string, Set<string>>();
  let checkDate = new Date(today);
  checkDate.setDate(checkDate.getDate() + 1); // Start from tomorrow

  // Check up to 90 days ahead
  const maxDaysToCheck = 90;
  let daysChecked = 0;

  while ((availableDates.length < 5 || bookedDatesMap.size < 3) && daysChecked < maxDaysToCheck) {
    const dateString = checkDate.toISOString().split('T')[0];
    
    // Skip weekends
    if (!isWeekend(dateString)) {
      // Check each desk on this date
      let hasAvailableDesk = false;
      const bookedNames = new Set<string>();
      
      for (const desk of DESKS) {
        const bookingKey = `${desk.id}-${dateString}`;
        const booking = bookingLookup.get(bookingKey);
        
        if (!booking) {
          // No booking means the desk is available
          hasAvailableDesk = true;
        } else if (booking.status === 'available') {
          // Explicitly marked as available
          hasAvailableDesk = true;
        } else if (booking.status === 'booked' && booking.personName) {
          // Booked (not assigned/paid)
          bookedNames.add(booking.personName);
        }
      }
      
      // Track available dates
      if (hasAvailableDesk && availableDates.length < 5) {
        availableDates.push(dateString);
      }
      
      // Track booked dates with names
      if (bookedNames.size > 0 && bookedDatesMap.size < 3) {
        bookedDatesMap.set(dateString, bookedNames);
      }
    }
    
    checkDate.setDate(checkDate.getDate() + 1);
    daysChecked++;
  }

  // Convert booked dates map to array format
  const bookedDates = Array.from(bookedDatesMap.entries()).map(([date, names]) => ({
    date,
    names: Array.from(names)
  }));

  // Check for expiring assignments in the next 10 days
  const expiring: { date: string, personName: string, deskNumber: number }[] = [];
  const checkDates: string[] = [];
  
  // Generate dates for the next 10 days
  for (let i = 1; i <= 10; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i);
    checkDates.push(futureDate.toISOString().split('T')[0]);
  }
  
  for (const dateString of checkDates) {
    // Skip weekends for expiring assignments too
    if (!isWeekend(dateString)) {
      for (const desk of DESKS) {
        const bookingKey = `${desk.id}-${dateString}`;
        const booking = bookingLookup.get(bookingKey);
        
        // Check if it's an assigned (paid) booking that will end on this date
        if (booking && booking.status === 'assigned' && booking.personName && booking.endDate === dateString) {
          expiring.push({
            date: dateString,
            personName: booking.personName,
            deskNumber: desk.number
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
  return useQuery({
    queryKey: ['next-dates'],
    queryFn: calculateNextDates,
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch too often
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 1, // Only retry once on failure
  });
}