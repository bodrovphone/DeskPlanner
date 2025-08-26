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
  bulkDeleteBookings?(deletions: { deskId: string; date: string }[]): Promise<void>;
  
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
  
  // Waiting List operations
  getWaitingListEntries?(): Promise<import('@shared/schema').WaitingListEntry[]>;
  saveWaitingListEntry?(entry: import('@shared/schema').WaitingListEntry): Promise<void>;
  deleteWaitingListEntry?(id: string): Promise<void>;
}

/**
 * LocalStorage implementation of the data store
 * This provides the current localStorage functionality with the abstracted interface
 */
export class LocalStorageDataStore implements IDataStore {
  private readonly STORAGE_KEY = 'deskBookings';
  private readonly DAYS_TO_KEEP = 60; // Keep bookings for 60 days

  constructor() {
    // Run cleanup on initialization
    this.cleanupOldBookings();
  }

  private getBookingKey(deskId: string, date: string): string {
    return `${deskId}-${date}`;
  }
  
  private cleanupOldBookings(): void {
    try {
      const data = this.getStorageData();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - this.DAYS_TO_KEEP);
      
      let removedCount = 0;
      const cleanedData: Record<string, DeskBooking> = {};
      
      for (const [key, booking] of Object.entries(data)) {
        const bookingDate = new Date(booking.date + 'T00:00:00');
        
        // Keep bookings that are within the retention period or in the future
        if (bookingDate >= cutoffDate) {
          cleanedData[key] = booking;
        } else {
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        this.saveStorageData(cleanedData);
        console.log(`Automatically cleaned up ${removedCount} bookings older than ${this.DAYS_TO_KEEP} days`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
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
    const bookingWithDates = {
      ...booking,
      startDate: booking.startDate || booking.date,
      endDate: booking.endDate || booking.date
    };
    data[key] = bookingWithDates;
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

  async bulkDeleteBookings(deletions: { deskId: string; date: string }[]): Promise<void> {
    const data = this.getStorageData();
    
    for (const { deskId, date } of deletions) {
      const key = this.getBookingKey(deskId, date);
      delete data[key];
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

  // Waiting List operations
  async getWaitingListEntries(): Promise<import('@shared/schema').WaitingListEntry[]> {
    try {
      const data = localStorage.getItem('coworking-waiting-list');
      const entries: Record<string, import('@shared/schema').WaitingListEntry> = data ? JSON.parse(data) : {};
      return Object.values(entries).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error loading waiting list from localStorage:', error);
      return [];
    }
  }

  async saveWaitingListEntry(entry: import('@shared/schema').WaitingListEntry): Promise<void> {
    try {
      const data = localStorage.getItem('coworking-waiting-list');
      const entries: Record<string, import('@shared/schema').WaitingListEntry> = data ? JSON.parse(data) : {};
      entries[entry.id] = entry;
      localStorage.setItem('coworking-waiting-list', JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving waiting list to localStorage:', error);
      throw new Error('Failed to save waiting list entry');
    }
  }

  async deleteWaitingListEntry(id: string): Promise<void> {
    try {
      const data = localStorage.getItem('coworking-waiting-list');
      const entries: Record<string, import('@shared/schema').WaitingListEntry> = data ? JSON.parse(data) : {};
      delete entries[id];
      localStorage.setItem('coworking-waiting-list', JSON.stringify(entries));
    } catch (error) {
      console.error('Error deleting waiting list from localStorage:', error);
      throw new Error('Failed to delete waiting list entry');
    }
  }
}

// Import MongoDB implementation
import { MongoDataStore } from './mongoDataStore';
import { MongoDBDataAPIClient } from './mongodbDataApi';

// Import Supabase implementation
import { SupabaseDataStore } from './supabaseDataStore';
// Import Hybrid implementation
import { HybridDataStore } from './hybridDataStore';

// Data store factory - easily switch between implementations
export function createDataStore(type?: 'localStorage' | 'mongodb' | 'supabase' | 'hybrid'): IDataStore {
  // Determine storage type from environment or parameter
  const storageType = type || (import.meta.env.VITE_STORAGE_TYPE as 'localStorage' | 'mongodb' | 'supabase' | 'hybrid') || 'localStorage';
  
  console.log('DataStore factory - Storage type:', storageType);
  console.log('VITE_STORAGE_TYPE from env:', import.meta.env.VITE_STORAGE_TYPE);
  
  switch (storageType) {
    case 'localStorage':
      console.log('Using LocalStorage for data persistence');
      return new LocalStorageDataStore();
    case 'mongodb':
      // Check if MongoDB is configured before trying to use it
      const client = new MongoDBDataAPIClient();
      if (!client.isConfigured()) {
        console.warn('MongoDB not configured, falling back to localStorage');
        return new LocalStorageDataStore();
      }
      console.log('Using MongoDB Data API for data persistence');
      return new MongoDataStore();
    case 'supabase':
      try {
        console.log('Attempting to initialize Supabase...');
        console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
        console.log('VITE_SUPABASE_ANON_KEY present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
        
        const supabaseStore = new SupabaseDataStore();
        if (!supabaseStore.isConfigured()) {
          console.warn('Supabase not configured, falling back to localStorage');
          return new LocalStorageDataStore();
        }
        console.log('Using Supabase for data persistence');
        return supabaseStore;
      } catch (error) {
        console.error('Error initializing Supabase, falling back to localStorage:', error);
        return new LocalStorageDataStore();
      }
    case 'hybrid':
      console.log('Using Hybrid storage (localStorage + Supabase sync)');
      return new HybridDataStore();
    default:
      console.warn(`Unknown data store type: ${storageType}, using localStorage`);
      return new LocalStorageDataStore();
  }
}

// Global data store instance - will use environment variable to determine type
export const dataStore = createDataStore();