/**
 * LocalStorage data migration utility
 * Migrates existing localStorage data to include new sync metadata system
 */

import { SyncMetadataManager } from './syncMetadata';

const CURRENT_DATA_VERSION = 2;
const VERSION_KEY = 'deskplanner_data_version';

interface MigrationResult {
  success: boolean;
  message: string;
  migratedItems: string[];
  errors: string[];
}

export class LocalStorageMigrationManager {
  private metadataManager: SyncMetadataManager;

  constructor() {
    this.metadataManager = new SyncMetadataManager();
  }

  /**
   * Check if migration is needed
   */
  isMigrationNeeded(): boolean {
    const currentVersion = this.getCurrentDataVersion();
    return currentVersion < CURRENT_DATA_VERSION;
  }

  /**
   * Get current data version from localStorage
   */
  private getCurrentDataVersion(): number {
    try {
      const version = localStorage.getItem(VERSION_KEY);
      return version ? parseInt(version, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Set data version in localStorage
   */
  private setDataVersion(version: number): void {
    try {
      localStorage.setItem(VERSION_KEY, version.toString());
    } catch (error) {
      console.error('Failed to set data version:', error);
    }
  }

  /**
   * Run all necessary migrations based on current version
   */
  async runMigrations(): Promise<MigrationResult> {
    const currentVersion = this.getCurrentDataVersion();
    const result: MigrationResult = {
      success: true,
      message: '',
      migratedItems: [],
      errors: []
    };

    console.log(`Starting migration from version ${currentVersion} to ${CURRENT_DATA_VERSION}`);

    try {
      // Version 0 -> 1: Initial setup (no migration needed, just version bump)
      if (currentVersion < 1) {
        result.migratedItems.push('Set initial data version to 1');
        this.setDataVersion(1);
      }

      // Version 1 -> 2: Add sync metadata system
      if (currentVersion < 2) {
        await this.migrateToVersion2(result);
        this.setDataVersion(2);
      }

      result.message = `Successfully migrated from version ${currentVersion} to ${CURRENT_DATA_VERSION}`;
      console.log(result.message);

    } catch (error) {
      result.success = false;
      result.message = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(result.message);
      console.error('Migration failed:', error);
    }

    return result;
  }

  /**
   * Migrate to version 2: Add sync metadata system
   */
  private async migrateToVersion2(result: MigrationResult): Promise<void> {
    console.log('Migrating to version 2: Adding sync metadata system');

    // Check if we have existing bookings data
    const bookingsData = this.getExistingBookingsData();
    const settingsData = this.getExistingSettingsData();

    if (bookingsData || settingsData) {
      // Initialize sync metadata for existing data
      const metadata = this.metadataManager.getLocalMetadata();
      
      if (!metadata) {
        // Create initial sync metadata
        this.metadataManager.updateLocalMetadata({
          lastLocalUpdate: new Date().toISOString(),
          lastCloudUpdate: new Date(0).toISOString(), // Never synced to cloud
          dataVersion: 1
        });

        result.migratedItems.push('Created initial sync metadata');
        console.log('Created initial sync metadata for existing data');
      }

      if (bookingsData) {
        const bookingCount = Object.keys(bookingsData).length;
        result.migratedItems.push(`Found ${bookingCount} existing bookings`);
        console.log(`Found ${bookingCount} existing bookings - metadata initialized`);
      }

      if (settingsData) {
        result.migratedItems.push('Found existing app settings');
        console.log('Found existing app settings - metadata initialized');
      }
    } else {
      // No existing data, just initialize metadata for clean state
      this.metadataManager.updateLocalMetadata({
        lastLocalUpdate: new Date().toISOString(),
        lastCloudUpdate: new Date().toISOString(), // In sync (both empty)
        dataVersion: 1
      });

      result.migratedItems.push('Initialized sync metadata for new installation');
      console.log('No existing data found - initialized clean sync metadata');
    }
  }

  /**
   * Get existing bookings data from localStorage
   */
  private getExistingBookingsData(): Record<string, any> | null {
    try {
      // Check both possible keys for bookings data
      const coworkingBookings = localStorage.getItem('coworking-bookings');
      const deskBookings = localStorage.getItem('deskBookings');
      
      if (coworkingBookings) {
        return JSON.parse(coworkingBookings);
      }
      
      if (deskBookings) {
        return JSON.parse(deskBookings);
      }
      
      return null;
    } catch (error) {
      console.error('Error reading existing bookings data:', error);
      return null;
    }
  }

  /**
   * Get existing settings data from localStorage
   */
  private getExistingSettingsData(): any | null {
    try {
      const settings = localStorage.getItem('coworking-settings');
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error reading existing settings data:', error);
      return null;
    }
  }

  /**
   * Get migration status information
   */
  getMigrationStatus(): {
    currentVersion: number;
    targetVersion: number;
    needsMigration: boolean;
    hasExistingData: boolean;
  } {
    const currentVersion = this.getCurrentDataVersion();
    const bookingsData = this.getExistingBookingsData();
    const settingsData = this.getExistingSettingsData();
    
    return {
      currentVersion,
      targetVersion: CURRENT_DATA_VERSION,
      needsMigration: this.isMigrationNeeded(),
      hasExistingData: !!(bookingsData || settingsData)
    };
  }

  /**
   * Force reset all migration data (for testing purposes)
   */
  resetMigrationData(): void {
    try {
      localStorage.removeItem(VERSION_KEY);
      this.metadataManager.reset();
      console.log('Migration data reset successfully');
    } catch (error) {
      console.error('Error resetting migration data:', error);
    }
  }
}

// Export singleton instance
export const localStorageMigration = new LocalStorageMigrationManager();