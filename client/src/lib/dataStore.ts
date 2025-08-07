import { DeskBooking } from '@/../../shared/schema';

/**
 * Abstract data store interface for desk bookings
 * This interface can be implemented with different storage backends
 * (localStorage, MongoDB, PostgreSQL, etc.)
 */
export interface IDataStore {
  // Basic CRUD operations
  getBooking(deskId: string, date: string): Promise<DeskBooking | null>;
  getAllBookings(): Promise<Record<string, DeskBooking>>;
  saveBooking(booking: DeskBooking): Promise<void>;
  deleteBooking(deskId: string, date: string): Promise<void>;
  
  // Bulk operations
  bulkUpdateBookings(bookings: DeskBooking[]): Promise<void>;
  
  // Query operations
  getBookingsForDateRange(startDate: string, endDate: string): Promise<DeskBooking[]>;
  getBookingsForDesk(deskId: string, startDate?: string, endDate?: string): Promise<DeskBooking[]>;
  
  // Statistics
  getDeskStats(dates: string[]): Promise<{
    available: number;
    assigned: number;
    booked: number;
  }>;
  
  // Utility
  clearAllBookings(): Promise<void>;
}

/**
 * LocalStorage implementation of the data store
 * This provides the current localStorage functionality with the abstracted interface
 */
export class LocalStorageDataStore implements IDataStore {
  private readonly STORAGE_KEY = 'deskBookings';

  private getBookingKey(deskId: string, date: string): string {
    return `${deskId}-${date}`;
  }

  private getStorageData(): Record<string, DeskBooking> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return {};
      
      const parsed = JSON.parse(data);
      
      // Handle legacy data migration (remove 'unavailable' status)
      const migrated: Record<string, DeskBooking> = {};
      for (const [key, booking] of Object.entries(parsed)) {
        const bookingData = booking as any;
        if (bookingData.status === 'unavailable') {
          // Skip unavailable bookings (treat as deleted)
          continue;
        }
        migrated[key] = bookingData as DeskBooking;
      }
      
      return migrated;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  }

  private saveStorageData(data: Record<string, DeskBooking>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw new Error('Failed to save booking data');
    }
  }

  async getBooking(deskId: string, date: string): Promise<DeskBooking | null> {
    const data = this.getStorageData();
    const key = this.getBookingKey(deskId, date);
    return data[key] || null;
  }

  async getAllBookings(): Promise<Record<string, DeskBooking>> {
    return this.getStorageData();
  }

  async saveBooking(booking: DeskBooking): Promise<void> {
    const data = this.getStorageData();
    const key = this.getBookingKey(booking.deskId, booking.date);
    data[key] = booking;
    this.saveStorageData(data);
  }

  async deleteBooking(deskId: string, date: string): Promise<void> {
    const data = this.getStorageData();
    const key = this.getBookingKey(deskId, date);
    delete data[key];
    this.saveStorageData(data);
  }

  async bulkUpdateBookings(bookings: DeskBooking[]): Promise<void> {
    const data = this.getStorageData();
    
    for (const booking of bookings) {
      const key = this.getBookingKey(booking.deskId, booking.date);
      data[key] = booking;
    }
    
    this.saveStorageData(data);
  }

  async getBookingsForDateRange(startDate: string, endDate: string): Promise<DeskBooking[]> {
    const data = this.getStorageData();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Object.values(data).filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= start && bookingDate <= end;
    });
  }

  async getBookingsForDesk(deskId: string, startDate?: string, endDate?: string): Promise<DeskBooking[]> {
    const data = this.getStorageData();
    let bookings = Object.values(data).filter(booking => booking.deskId === deskId);
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      bookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.date);
        return bookingDate >= start && bookingDate <= end;
      });
    }
    
    return bookings;
  }

  async getDeskStats(dates: string[]): Promise<{
    available: number;
    assigned: number;
    booked: number;
  }> {
    const data = this.getStorageData();
    const DESK_COUNT = 8; // 2 rooms × 4 desks
    const totalSlots = DESK_COUNT * dates.length;
    
    let assigned = 0;
    let booked = 0;
    
    for (const booking of Object.values(data)) {
      if (dates.includes(booking.date)) {
        switch (booking.status) {
          case 'assigned':
            assigned++;
            break;
          case 'booked':
            booked++;
            break;
        }
      }
    }
    
    const available = totalSlots - assigned - booked;
    return { available, assigned, booked };
  }

  async clearAllBookings(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

/**
 * Future MongoDB implementation placeholder
 * This will be implemented when migrating from localStorage to MongoDB
 */
export class MongoDataStore implements IDataStore {
  // TODO: Implement MongoDB connection and operations
  
  async getBooking(deskId: string, date: string): Promise<DeskBooking | null> {
    throw new Error('MongoDB implementation not yet available');
  }
  
  async getAllBookings(): Promise<Record<string, DeskBooking>> {
    throw new Error('MongoDB implementation not yet available');
  }
  
  async saveBooking(booking: DeskBooking): Promise<void> {
    throw new Error('MongoDB implementation not yet available');
  }
  
  async deleteBooking(deskId: string, date: string): Promise<void> {
    throw new Error('MongoDB implementation not yet available');
  }
  
  async bulkUpdateBookings(bookings: DeskBooking[]): Promise<void> {
    throw new Error('MongoDB implementation not yet available');
  }
  
  async getBookingsForDateRange(startDate: string, endDate: string): Promise<DeskBooking[]> {
    throw new Error('MongoDB implementation not yet available');
  }
  
  async getBookingsForDesk(deskId: string, startDate?: string, endDate?: string): Promise<DeskBooking[]> {
    throw new Error('MongoDB implementation not yet available');
  }
  
  async getDeskStats(dates: string[]): Promise<{
    available: number;
    assigned: number;
    booked: number;
  }> {
    throw new Error('MongoDB implementation not yet available');
  }
  
  async clearAllBookings(): Promise<void> {
    throw new Error('MongoDB implementation not yet available');
  }
}

// Data store factory - easily switch between implementations
export function createDataStore(type: 'localStorage' | 'mongodb' = 'localStorage'): IDataStore {
  switch (type) {
    case 'localStorage':
      return new LocalStorageDataStore();
    case 'mongodb':
      return new MongoDataStore();
    default:
      throw new Error(`Unknown data store type: ${type}`);
  }
}

// Global data store instance
export const dataStore = createDataStore('localStorage');