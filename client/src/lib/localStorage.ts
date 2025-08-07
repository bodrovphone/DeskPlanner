import { DeskBooking, Desk, DeskStatus } from '@shared/schema';

const STORAGE_KEYS = {
  BOOKINGS: 'coworking-bookings',
  SETTINGS: 'coworking-settings'
};

// Initialize default desks
export const DESKS: Desk[] = [
  { id: 'room1-desk1', room: 1, number: 1, label: 'Room 1, Desk 1' },
  { id: 'room1-desk2', room: 1, number: 2, label: 'Room 1, Desk 2' },
  { id: 'room1-desk3', room: 1, number: 3, label: 'Room 1, Desk 3' },
  { id: 'room1-desk4', room: 1, number: 4, label: 'Room 1, Desk 4' },
  { id: 'room2-desk1', room: 2, number: 1, label: 'Room 2, Desk 1' },
  { id: 'room2-desk2', room: 2, number: 2, label: 'Room 2, Desk 2' },
  { id: 'room2-desk3', room: 2, number: 3, label: 'Room 2, Desk 3' },
  { id: 'room2-desk4', room: 2, number: 4, label: 'Room 2, Desk 4' },
];

export function getBookingKey(deskId: string, date: string): string {
  return `${deskId}-${date}`;
}

export function saveBooking(booking: DeskBooking): void {
  try {
    const bookings = getBookings();
    const key = getBookingKey(booking.deskId, booking.date);
    bookings[key] = {
      ...booking,
      startDate: booking.startDate || booking.date,
      endDate: booking.endDate || booking.date,
      createdAt: booking.createdAt || new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to save booking:', error);
    throw new Error('Failed to save booking to local storage');
  }
}

export function getBookings(): Record<string, DeskBooking> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load bookings:', error);
    return {};
  }
}

export function getBooking(deskId: string, date: string): DeskBooking | null {
  const bookings = getBookings();
  const key = getBookingKey(deskId, date);
  return bookings[key] || null;
}

export function deleteBooking(deskId: string, date: string): void {
  try {
    const bookings = getBookings();
    const key = getBookingKey(deskId, date);
    delete bookings[key];
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to delete booking:', error);
    throw new Error('Failed to delete booking from local storage');
  }
}

export function bulkUpdateBookings(
  deskIds: string[],
  dates: string[],
  status: DeskStatus
): void {
  try {
    const bookings = getBookings();
    
    for (const deskId of deskIds) {
      for (const date of dates) {
        const key = getBookingKey(deskId, date);
        const existingBooking = bookings[key];
        
        if (status === 'available') {
          // Remove booking if setting to available
          delete bookings[key];
        } else {
          // Create or update booking
          bookings[key] = {
            id: key,
            deskId,
            date,
            startDate: date,
            endDate: date,
            status,
            personName: existingBooking?.personName || undefined,
            title: existingBooking?.title || undefined,
            price: existingBooking?.price || undefined,
            currency: existingBooking?.currency || 'BGN',
            createdAt: existingBooking?.createdAt || new Date().toISOString(),
          };
        }
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to bulk update bookings:', error);
    throw new Error('Failed to bulk update bookings in local storage');
  }
}

export function getDeskStats(dates: string[]): {
  available: number;
  assigned: number;
  booked: number;
} {
  const bookings = getBookings();
  const totalSlots = DESKS.length * dates.length;
  
  let assigned = 0;
  let booked = 0;
  
  for (const deskId of DESKS.map(d => d.id)) {
    for (const date of dates) {
      const booking = bookings[getBookingKey(deskId, date)];
      if (booking) {
        // Handle legacy 'unavailable' status by treating as available
        const validStatus = (booking.status as any) === 'unavailable' ? 'available' : booking.status;
        switch (validStatus) {
          case 'assigned':
            assigned++;
            break;
          case 'booked':
            booked++;
            break;
        }
      }
    }
  }
  
  const available = totalSlots - assigned - booked;
  
  return { available, assigned, booked };
}

export function exportData(): string {
  try {
    const bookings = getBookings();
    const exportData = {
      bookings,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export data:', error);
    throw new Error('Failed to export data');
  }
}

export function importData(jsonData: string): void {
  try {
    const data = JSON.parse(jsonData);
    if (data.bookings) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(data.bookings));
    }
  } catch (error) {
    console.error('Failed to import data:', error);
    throw new Error('Failed to import data');
  }
}
