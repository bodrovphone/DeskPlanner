import { DeskBooking, WaitingListEntry, AppSettings, MonthlyStats, Expense, RecurringExpense } from '@shared/schema';
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
      
      // Separate bookings to save vs delete
      const bookingsToSave: DeskBooking[] = [];
      const bookingsToDelete: { deskId: string, date: string }[] = [];
      
      for (const bookingKey of bookingsToSync) {
        const booking = allBookings[bookingKey];
        if (booking) {
          bookingsToSave.push(booking);
        } else {
          // Booking was deleted, remove from Supabase
          const [deskId, date] = bookingKey.split('-').reduce((acc, part, idx) => {
            if (idx < 2) acc[0] = acc[0] ? `${acc[0]}-${part}` : part;
            else acc[1] = acc[1] ? `${acc[1]}-${part}` : part;
            return acc;
          }, ['', '']);
          
          if (deskId && date) {
            bookingsToDelete.push({ deskId, date });
          }
        }
      }
      
      // Batch sync bookings to save
      if (bookingsToSave.length > 0) {
        try {
          await this.supabase.bulkUpdateBookings(bookingsToSave);
          bookingsToSave.forEach(booking => {
            const key = this.getBookingKey(booking.deskId, booking.date);
            this.syncQueue.delete(key);
          });
        } catch (error) {
          console.error(`Failed to bulk sync ${bookingsToSave.length} bookings:`, error);
          // Keep in queue for retry
        }
      }
      
      // Batch process deletions
      if (bookingsToDelete.length > 0) {
        try {
          if (this.supabase.bulkDeleteBookings) {
            await this.supabase.bulkDeleteBookings(bookingsToDelete);
            bookingsToDelete.forEach(({ deskId, date }) => {
              const key = this.getBookingKey(deskId, date);
              this.syncQueue.delete(key);
            });
          } else {
            // Fall back to individual deletions
            for (const { deskId, date } of bookingsToDelete) {
              try {
                await this.supabase.deleteBooking(deskId, date);
                const key = this.getBookingKey(deskId, date);
                this.syncQueue.delete(key);
              } catch (error) {
                console.error(`Failed to sync deletion ${deskId}-${date}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to bulk sync ${bookingsToDelete.length} deletions:`, error);
          // Keep in queue for retry
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

  async getAllBookings(startDate?: string, endDate?: string): Promise<Record<string, DeskBooking>> {
    // Always read from localStorage with date filtering
    return this.localStorage.getAllBookings(startDate, endDate);
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

  async bulkDeleteBookings(deletions: { deskId: string; date: string }[]): Promise<void> {
    // Delete from localStorage first
    await Promise.all(
      deletions.map(({ deskId, date }) => this.localStorage.deleteBooking(deskId, date))
    );
    
    // Mark local update
    this.metadataManager.markLocalUpdate();
    
    // Queue all for sync
    deletions.forEach(({ deskId, date }) => {
      const key = this.getBookingKey(deskId, date);
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

  async getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    return this.localStorage.getMonthlyStats(year, month);
  }

  async getStatsForDateRange(startDate: string, endDate: string): Promise<MonthlyStats> {
    return this.localStorage.getStatsForDateRange(startDate, endDate);
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

  // Waiting List operations - use Supabase if available, otherwise localStorage
  async getWaitingListEntries(): Promise<WaitingListEntry[]> {
    if (this.supabase && this.supabase.getWaitingListEntries) {
      try {
        return await this.supabase.getWaitingListEntries();
      } catch (error) {
        console.error('Failed to get waiting list from Supabase, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    return this.localStorage.getWaitingListEntries ? 
      await this.localStorage.getWaitingListEntries() : [];
  }

  async saveWaitingListEntry(entry: WaitingListEntry): Promise<void> {
    // Ensure entry has an ID if not provided
    if (!entry.id) {
      entry.id = Date.now().toString(); // Use simple timestamp for better Supabase compatibility
    }
    
    // Ensure entry has createdAt if not provided
    if (!entry.createdAt) {
      entry.createdAt = new Date().toISOString();
    }
    
    // Always save to localStorage first
    if (this.localStorage.saveWaitingListEntry) {
      await this.localStorage.saveWaitingListEntry(entry);
    }
    
    // Try to save to Supabase
    if (this.supabase && this.supabase.saveWaitingListEntry) {
      try {
        await this.supabase.saveWaitingListEntry(entry);
      } catch (error) {
        console.error('Failed to save waiting list entry to Supabase:', error);
        // Don't throw - localStorage save succeeded
      }
    }
  }

  async deleteWaitingListEntry(id: string): Promise<void> {
    // Delete from localStorage first
    if (this.localStorage.deleteWaitingListEntry) {
      await this.localStorage.deleteWaitingListEntry(id);
    }
    
    // Try to delete from Supabase
    if (this.supabase && this.supabase.deleteWaitingListEntry) {
      try {
        await this.supabase.deleteWaitingListEntry(id);
      } catch (error) {
        console.error('Failed to delete waiting list entry from Supabase:', error);
        // Don't throw - localStorage delete succeeded
      }
    }
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

  // Expense operations - use localStorage as primary
  async getExpenses(startDate: string, endDate: string): Promise<Expense[]> {
    if (this.localStorage.getExpenses) {
      return this.localStorage.getExpenses(startDate, endDate);
    }
    return [];
  }

  async saveExpense(expense: Expense): Promise<void> {
    // Save to localStorage first
    if (this.localStorage.saveExpense) {
      await this.localStorage.saveExpense(expense);
    }

    // Try to save to Supabase in background
    if (this.supabase?.saveExpense) {
      this.supabase.saveExpense(expense).catch(error => {
        console.error('Failed to sync expense to Supabase:', error);
      });
    }
  }

  async deleteExpense(id: string): Promise<void> {
    // Delete from localStorage first
    if (this.localStorage.deleteExpense) {
      await this.localStorage.deleteExpense(id);
    }

    // Try to delete from Supabase in background
    if (this.supabase?.deleteExpense) {
      this.supabase.deleteExpense(id).catch(error => {
        console.error('Failed to sync expense deletion to Supabase:', error);
      });
    }
  }

  // Recurring expense operations
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    if (this.localStorage.getRecurringExpenses) {
      return this.localStorage.getRecurringExpenses();
    }
    return [];
  }

  async saveRecurringExpense(expense: RecurringExpense): Promise<void> {
    // Save to localStorage first
    if (this.localStorage.saveRecurringExpense) {
      await this.localStorage.saveRecurringExpense(expense);
    }

    // Try to save to Supabase in background
    if (this.supabase?.saveRecurringExpense) {
      this.supabase.saveRecurringExpense(expense).catch(error => {
        console.error('Failed to sync recurring expense to Supabase:', error);
      });
    }
  }

  async deleteRecurringExpense(id: string): Promise<void> {
    // Delete from localStorage first
    if (this.localStorage.deleteRecurringExpense) {
      await this.localStorage.deleteRecurringExpense(id);
    }

    // Try to delete from Supabase in background
    if (this.supabase?.deleteRecurringExpense) {
      this.supabase.deleteRecurringExpense(id).catch(error => {
        console.error('Failed to sync recurring expense deletion to Supabase:', error);
      });
    }
  }

  async generateRecurringExpenses(year: number, month: number): Promise<Expense[]> {
    if (this.localStorage.generateRecurringExpenses) {
      const generated = await this.localStorage.generateRecurringExpenses(year, month);

      // Sync generated expenses to Supabase in background
      if (this.supabase?.saveExpense) {
        for (const expense of generated) {
          this.supabase.saveExpense(expense).catch(error => {
            console.error('Failed to sync generated expense to Supabase:', error);
          });
        }
      }

      return generated;
    }
    return [];
  }
}