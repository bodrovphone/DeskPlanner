import { DeskBooking, WaitingListEntry, AppSettings } from '@shared/schema';
import { IDataStore, LocalStorageDataStore } from './dataStore';
import { SupabaseDataStore } from './supabaseDataStore';
import { SyncMetadataManager } from './syncMetadata';

export interface SyncStatus {
  lastSyncTime: Date | null;
  syncInProgress: boolean;
  lastSyncError: string | null;
  pendingChanges: number;
  isOnline: boolean;
}

/**
 * Hybrid data store that uses localStorage as primary storage
 * and Supabase as backup/sync storage
 */
export class HybridDataStore implements IDataStore {
  private localStorage: LocalStorageDataStore;
  private supabase: SupabaseDataStore | null;
  private syncStatus: SyncStatus;
  private syncQueue: Set<string> = new Set();
  private syncRetryTimeout: NodeJS.Timeout | null = null;
  private syncStatusCallbacks: ((status: SyncStatus) => void)[] = [];
  private metadataManager: SyncMetadataManager;

  constructor() {
    // LocalStorage is always available
    this.localStorage = new LocalStorageDataStore();
    this.metadataManager = new SyncMetadataManager();
    
    // Try to initialize Supabase, but don't fail if it's not available
    try {
      const supabaseStore = new SupabaseDataStore();
      if (supabaseStore.isConfigured()) {
        this.supabase = supabaseStore;
        console.log('Hybrid storage: Supabase configured for sync');
      } else {
        this.supabase = null;
        console.log('Hybrid storage: Running in offline mode (localStorage only)');
      }
    } catch (error) {
      this.supabase = null;
      console.warn('Hybrid storage: Supabase initialization failed, using offline mode', error);
    }

    this.syncStatus = {
      lastSyncTime: null,
      syncInProgress: false,
      lastSyncError: null,
      pendingChanges: 0,
      isOnline: this.supabase !== null
    };

    // Initialize data from Supabase if needed
    if (this.supabase) {
      this.initializeData();
      this.startPeriodicSync();
    }
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.syncStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncStatusCallbacks.splice(index, 1);
      }
    };
  }

  private updateSyncStatus(updates: Partial<SyncStatus>) {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.syncStatusCallbacks.forEach(cb => cb(this.syncStatus));
  }

  /**
   * Initialize data - pull from cloud if this is a new device or cloud is newer
   */
  private async initializeData() {
    if (!this.supabase) return;

    try {
      // Check if this is a new device (empty localStorage)
      if (this.metadataManager.isNewDevice()) {
        console.log('New device detected, pulling data from cloud...');
        await this.pullFromCloud();
        return;
      }

      // Check cloud metadata to determine sync direction
      const cloudMetadata = await this.getCloudMetadata();
      const syncDirection = this.metadataManager.getSyncDirection(cloudMetadata || undefined);

      console.log('Sync direction on init:', syncDirection);

      if (syncDirection === 'pull') {
        // Cloud is newer, pull data
        const shouldPull = await this.promptUserForConflictResolution();
        if (shouldPull) {
          await this.pullFromCloud();
        }
      } else if (syncDirection === 'push') {
        // Local is newer, will sync to cloud in background
        console.log('Local data is newer, will sync to cloud...');
        await this.forceFullSync();
      }
      // If 'none', data is already in sync
    } catch (error) {
      console.error('Error initializing data:', error);
      this.updateSyncStatus({ lastSyncError: 'Failed to initialize data' });
    }
  }

  /**
   * Get cloud metadata from Supabase
   */
  private async getCloudMetadata(): Promise<{ lastUpdate: string } | null> {
    if (!this.supabase) return null;

    try {
      // Query the sync_metadata table
      const response = await (this.supabase as any).client
        .from('sync_metadata')
        .select('last_update, data_version, bookings_count')
        .eq('id', 'global')
        .single();

      if (response.data) {
        return { lastUpdate: response.data.last_update };
      }
      return null;
    } catch (error) {
      console.error('Error fetching cloud metadata:', error);
      return null;
    }
  }

  /**
   * Pull all data from cloud to localStorage
   */
  private async pullFromCloud() {
    if (!this.supabase) return;

    this.updateSyncStatus({ syncInProgress: true });

    try {
      // Get all bookings from Supabase
      const cloudBookings = await this.supabase.getAllBookings();
      
      // Clear local storage and save cloud data
      await this.localStorage.clearAllBookings();
      
      // Save each booking to localStorage
      for (const booking of Object.values(cloudBookings)) {
        await this.localStorage.saveBooking(booking);
      }

      // Update metadata
      this.metadataManager.markCloudSync();
      
      this.updateSyncStatus({
        syncInProgress: false,
        lastSyncTime: new Date(),
        lastSyncError: null,
        pendingChanges: 0
      });

      console.log(`Pulled ${Object.keys(cloudBookings).length} bookings from cloud`);
    } catch (error) {
      console.error('Error pulling from cloud:', error);
      this.updateSyncStatus({
        syncInProgress: false,
        lastSyncError: 'Failed to pull data from cloud'
      });
    }
  }

  /**
   * Prompt user to choose between local and cloud data
   * For now, returns true to pull from cloud (you can add UI later)
   */
  private async promptUserForConflictResolution(): Promise<boolean> {
    // TODO: Add actual UI prompt
    // For now, default to keeping local data to avoid data loss
    console.warn('Data conflict detected: Cloud data is newer than local data');
    return false; // Keep local data by default
  }

  private startPeriodicSync() {
    // Sync every 30 seconds if there are pending changes
    setInterval(() => {
      if (this.syncQueue.size > 0 && !this.syncStatus.syncInProgress) {
        this.performBackgroundSync();
      }
    }, 30000);
  }

  private async performBackgroundSync() {
    if (!this.supabase || this.syncStatus.syncInProgress) return;

    this.updateSyncStatus({ syncInProgress: true });

    try {
      const bookingsToSync = Array.from(this.syncQueue);
      const allBookings = await this.localStorage.getAllBookings();
      
      for (const bookingKey of bookingsToSync) {
        const booking = allBookings[bookingKey];
        if (booking) {
          try {
            await this.supabase.saveBooking(booking);
            this.syncQueue.delete(bookingKey);
          } catch (error) {
            console.error(`Failed to sync booking ${bookingKey}:`, error);
            // Keep in queue for retry
          }
        } else {
          // Booking was deleted, remove from Supabase
          const [deskId, date] = bookingKey.split('-').reduce((acc, part, idx) => {
            if (idx < 2) acc[0] = acc[0] ? `${acc[0]}-${part}` : part;
            else acc[1] = acc[1] ? `${acc[1]}-${part}` : part;
            return acc;
          }, ['', '']);
          
          if (deskId && date) {
            try {
              await this.supabase.deleteBooking(deskId, date);
              this.syncQueue.delete(bookingKey);
            } catch (error) {
              console.error(`Failed to sync deletion ${bookingKey}:`, error);
            }
          }
        }
      }

      // Mark successful sync in metadata
      if (this.syncQueue.size === 0) {
        this.metadataManager.markCloudSync();
      }
      
      this.updateSyncStatus({
        syncInProgress: false,
        lastSyncTime: new Date(),
        lastSyncError: null,
        pendingChanges: this.syncQueue.size
      });
    } catch (error) {
      this.updateSyncStatus({
        syncInProgress: false,
        lastSyncError: error instanceof Error ? error.message : 'Unknown sync error',
        pendingChanges: this.syncQueue.size
      });

      // Retry sync after 5 seconds if failed
      if (this.syncRetryTimeout) {
        clearTimeout(this.syncRetryTimeout);
      }
      this.syncRetryTimeout = setTimeout(() => {
        this.performBackgroundSync();
      }, 5000);
    }
  }

  private addToSyncQueue(bookingKey: string) {
    this.syncQueue.add(bookingKey);
    this.updateSyncStatus({ pendingChanges: this.syncQueue.size });
    
    // Trigger immediate sync if not already in progress
    if (!this.syncStatus.syncInProgress && this.supabase) {
      setTimeout(() => this.performBackgroundSync(), 100);
    }
  }

  private getBookingKey(deskId: string, date: string): string {
    return `${deskId}-${date}`;
  }

  // IDataStore implementation - Always use localStorage as primary

  async getBooking(deskId: string, date: string): Promise<DeskBooking | null> {
    // Always read from localStorage (fastest, most reliable)
    return this.localStorage.getBooking(deskId, date);
  }

  async getAllBookings(): Promise<Record<string, DeskBooking>> {
    // Always read from localStorage
    return this.localStorage.getAllBookings();
  }

  async saveBooking(booking: DeskBooking): Promise<void> {
    // Save to localStorage first (instant)
    await this.localStorage.saveBooking(booking);
    
    // Mark local update
    this.metadataManager.markLocalUpdate();
    
    // Queue for background sync to Supabase
    const key = this.getBookingKey(booking.deskId, booking.date);
    this.addToSyncQueue(key);
  }

  async deleteBooking(deskId: string, date: string): Promise<void> {
    // Delete from localStorage first
    await this.localStorage.deleteBooking(deskId, date);
    
    // Mark local update
    this.metadataManager.markLocalUpdate();
    
    // Queue for background sync to Supabase
    const key = this.getBookingKey(deskId, date);
    this.addToSyncQueue(key);
  }

  async bulkUpdateBookings(bookings: DeskBooking[]): Promise<void> {
    // Update localStorage first
    await this.localStorage.bulkUpdateBookings(bookings);
    
    // Mark local update
    this.metadataManager.markLocalUpdate();
    
    // Queue all for sync
    bookings.forEach(booking => {
      const key = this.getBookingKey(booking.deskId, booking.date);
      this.addToSyncQueue(key);
    });
  }

  async getBookingsForDateRange(startDate: string, endDate: string): Promise<DeskBooking[]> {
    return this.localStorage.getBookingsForDateRange(startDate, endDate);
  }

  async getBookingsForDesk(deskId: string, startDate?: string, endDate?: string): Promise<DeskBooking[]> {
    return this.localStorage.getBookingsForDesk(deskId, startDate, endDate);
  }

  async getDeskStats(dates: string[]): Promise<{
    available: number;
    assigned: number;
    booked: number;
  }> {
    return this.localStorage.getDeskStats(dates);
  }

  async clearAllBookings(): Promise<void> {
    // Clear localStorage
    await this.localStorage.clearAllBookings();
    
    // Try to clear Supabase in background
    if (this.supabase) {
      this.supabase.clearAllBookings().catch(error => {
        console.error('Failed to clear Supabase bookings:', error);
      });
    }
    
    // Clear sync queue
    this.syncQueue.clear();
    this.updateSyncStatus({ pendingChanges: 0 });
  }

  /**
   * Force a full sync from localStorage to Supabase
   */
  async forceFullSync(): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      this.updateSyncStatus({ syncInProgress: true });
      
      const allBookings = await this.localStorage.getAllBookings();
      const bookingsList = Object.values(allBookings);
      
      // Clear Supabase first
      await this.supabase.clearAllBookings();
      
      // Upload all bookings
      for (const booking of bookingsList) {
        await this.supabase.saveBooking(booking);
      }
      
      this.syncQueue.clear();
      this.updateSyncStatus({
        syncInProgress: false,
        lastSyncTime: new Date(),
        lastSyncError: null,
        pendingChanges: 0
      });
      
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateSyncStatus({
        syncInProgress: false,
        lastSyncError: errorMsg
      });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }
}