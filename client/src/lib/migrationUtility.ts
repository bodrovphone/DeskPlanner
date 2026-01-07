import { DeskBooking, WaitingListEntry, AppSettings } from '@shared/schema';
import { SupabaseDataStore } from './supabaseDataStore';

export interface MigrationResult {
  success: boolean;
  bookingsMigrated: number;
  waitingListMigrated: number;
  errors: string[];
}

export class LocalStorageToSupabaseMigration {
  private supabaseStore: SupabaseDataStore;
  private errors: string[] = [];

  constructor() {
    this.supabaseStore = new SupabaseDataStore();
  }

  /**
   * Generate a stable numeric ID from a string ID
   * This ensures the same string always produces the same numeric ID
   */
  private generateNumericId(stringId: string): number {
    // Use timestamp-based approach for better uniqueness
    // Extract date from ID if it follows the pattern "deskId-date"
    const parts = stringId.split('-');
    let baseHash = 0;
    
    // If it's a booking ID with date (e.g., "room1-desk1-2025-08-04")
    if (parts.length >= 5) {
      const year = parseInt(parts[2]) || 2025;
      const month = parseInt(parts[3]) || 1;
      const day = parseInt(parts[4]) || 1;
      const deskNum = parseInt(parts[1]?.replace('desk', '')) || 1;
      const roomNum = parseInt(parts[0]?.replace('room', '')) || 1;
      
      // Create unique ID based on date and desk
      // Format: YYYYMMDDRRDD where RR is room, DD is desk
      baseHash = year * 10000000 + month * 100000 + day * 1000 + roomNum * 10 + deskNum;
    } else {
      // Fallback for other IDs (like waiting list)
      let hash = 0;
      for (let i = 0; i < stringId.length; i++) {
        const char = stringId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      baseHash = Math.abs(hash);
    }
    
    // Ensure we don't exceed PostgreSQL integer limits
    return baseHash % 2147483647;
  }

  /**
   * Convert localStorage booking to Supabase-compatible format
   */
  private convertBooking(localBooking: DeskBooking): DeskBooking {
    // Generate a numeric ID from the string ID
    const numericId = this.generateNumericId(localBooking.id);
    
    return {
      ...localBooking,
      id: numericId.toString(), // Store as string but with numeric value
      // Ensure all required fields are present
      startDate: localBooking.startDate || localBooking.date,
      endDate: localBooking.endDate || localBooking.date,
      createdAt: localBooking.createdAt || new Date().toISOString(),
      currency: localBooking.currency || 'EUR'
    };
  }

  /**
   * Export all data from localStorage
   */
  private exportFromLocalStorage(): {
    bookings: DeskBooking[];
    waitingList: WaitingListEntry[];
    settings: AppSettings | null;
  } {
    // Try both possible localStorage keys (old and new)
    let bookingsStr = window.localStorage.getItem('coworking-bookings');
    if (!bookingsStr) {
      // Try the new key if old one doesn't exist
      bookingsStr = window.localStorage.getItem('deskBookings');
    }
    
    const bookingsRecord: Record<string, DeskBooking> = bookingsStr ? JSON.parse(bookingsStr) : {};
    const bookings = Object.values(bookingsRecord);

    console.log('Found bookings in localStorage:', bookings.length);

    // Get waiting list entries if they exist
    const waitingListStr = window.localStorage.getItem('coworking-waiting-list');
    const waitingList: WaitingListEntry[] = waitingListStr ? JSON.parse(waitingListStr) : [];

    // Get app settings if they exist
    const settingsStr = window.localStorage.getItem('coworking-settings');
    const settings: AppSettings | null = settingsStr ? JSON.parse(settingsStr) : null;

    return { bookings, waitingList, settings };
  }

  /**
   * Perform the migration from localStorage to Supabase
   */
  async migrate(options: { 
    clearLocalStorageAfter?: boolean;
    dryRun?: boolean;
  } = {}): Promise<MigrationResult> {
    const { clearLocalStorageAfter = false, dryRun = false } = options;
    
    try {
      // Check if Supabase is configured
      if (!this.supabaseStore.isConfigured()) {
        throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      }

      // Export data from localStorage
      const { bookings, waitingList, settings } = this.exportFromLocalStorage();
      
      console.log(`Found ${bookings.length} bookings to migrate`);
      console.log(`Found ${waitingList.length} waiting list entries to migrate`);

      if (dryRun) {
        console.log('DRY RUN - No data will be migrated');
        console.log('Sample converted bookings:', bookings.slice(0, 3).map(b => this.convertBooking(b)));
        return {
          success: true,
          bookingsMigrated: bookings.length,
          waitingListMigrated: waitingList.length,
          errors: []
        };
      }

      // Migrate bookings
      let bookingsMigrated = 0;
      let failedBookings = 0;
      
      // Convert and migrate bookings one by one to avoid ID conflicts
      for (const booking of bookings) {
        try {
          const convertedBooking = this.convertBooking(booking);
          await this.supabaseStore.saveBooking(convertedBooking);
          bookingsMigrated++;
          
          // Log progress every 10 bookings
          if (bookingsMigrated % 10 === 0) {
            console.log(`Progress: ${bookingsMigrated}/${bookings.length} bookings migrated`);
          }
        } catch (error) {
          failedBookings++;
          const errorMsg = `Failed to migrate booking ${booking.id}: ${error}`;
          this.errors.push(errorMsg);
          console.error('Individual booking migration error:', error, booking);
        }
      }
      
      console.log(`Migration complete: ${bookingsMigrated} bookings migrated successfully, ${failedBookings} failed`);
      
      if (failedBookings > 0) {
        this.errors.push(`${failedBookings} bookings failed to migrate`);
      }

      // Migrate waiting list entries
      let waitingListMigrated = 0;
      // Check if waitingList is actually an array
      const waitingListArray = Array.isArray(waitingList) ? waitingList : [];
      
      for (const entry of waitingListArray) {
        try {
          // Convert waiting list entry ID to numeric as well
          const convertedEntry = {
            ...entry,
            id: this.generateNumericId(entry.id).toString()
          };
          await this.supabaseStore.saveWaitingListEntry(convertedEntry);
          waitingListMigrated++;
        } catch (error) {
          this.errors.push(`Failed to migrate waiting list entry ${entry.id}: ${error}`);
          console.error('Waiting list migration error:', error);
        }
      }
      
      if (waitingListMigrated > 0) {
        console.log(`Successfully migrated ${waitingListMigrated} waiting list entries`);
      }

      // Migrate app settings
      if (settings) {
        try {
          await this.supabaseStore.saveAppSettings(settings);
          console.log('Successfully migrated app settings');
        } catch (error) {
          this.errors.push(`Failed to migrate app settings: ${error}`);
          console.error('Settings migration error:', error);
        }
      }

      // Clear localStorage if requested
      if (clearLocalStorageAfter && this.errors.length === 0) {
        // Clear both possible booking keys
        window.localStorage.removeItem('coworking-bookings');
        window.localStorage.removeItem('deskBookings');
        window.localStorage.removeItem('coworking-waiting-list');
        window.localStorage.removeItem('coworking-settings');
        console.log('Cleared localStorage after successful migration');
      }

      return {
        success: this.errors.length === 0,
        bookingsMigrated,
        waitingListMigrated,
        errors: this.errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.errors.push(errorMessage);
      return {
        success: false,
        bookingsMigrated: 0,
        waitingListMigrated: 0,
        errors: this.errors
      };
    }
  }

  /**
   * Create a backup of localStorage data
   */
  createBackup(): string {
    const data = this.exportFromLocalStorage();
    const backup = {
      ...data,
      backupDate: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Verify migration by comparing counts
   */
  async verifyMigration(): Promise<{
    localStorageCount: number;
    supabaseCount: number;
    matched: boolean;
  }> {
    // Try both possible localStorage keys
    let bookingsStr = window.localStorage.getItem('coworking-bookings');
    if (!bookingsStr) {
      bookingsStr = window.localStorage.getItem('deskBookings');
    }
    
    const localBookingsRecord: Record<string, DeskBooking> = bookingsStr ? JSON.parse(bookingsStr) : {};
    const localBookings = Object.values(localBookingsRecord);
    
    const supabaseBookings = await this.supabaseStore.getAllBookings();
    const supabaseBookingsArray = Object.values(supabaseBookings);

    return {
      localStorageCount: localBookings.length,
      supabaseCount: supabaseBookingsArray.length,
      matched: localBookings.length === supabaseBookingsArray.length
    };
  }
}