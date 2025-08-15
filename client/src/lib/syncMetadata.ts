/**
 * Sync metadata management for tracking data versions between localStorage and Supabase
 */

export interface SyncMetadata {
  deviceId: string;
  lastLocalUpdate: string; // ISO timestamp
  lastCloudUpdate: string; // ISO timestamp
  dataVersion: number;
}

const METADATA_KEY = 'deskplanner_sync_metadata';

export class SyncMetadataManager {
  private deviceId: string;

  constructor() {
    // Generate or retrieve a unique device ID
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('deskplanner_device_id');
    if (!deviceId) {
      // Generate a unique device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deskplanner_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Get current sync metadata from localStorage
   */
  getLocalMetadata(): SyncMetadata | null {
    try {
      const data = localStorage.getItem(METADATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading sync metadata:', error);
      return null;
    }
  }

  /**
   * Update local sync metadata
   */
  updateLocalMetadata(updates: Partial<SyncMetadata>): void {
    const current = this.getLocalMetadata() || {
      deviceId: this.deviceId,
      lastLocalUpdate: new Date().toISOString(),
      lastCloudUpdate: new Date(0).toISOString(),
      dataVersion: 1
    };

    const updated = {
      ...current,
      ...updates,
      deviceId: this.deviceId // Always use current device ID
    };

    localStorage.setItem(METADATA_KEY, JSON.stringify(updated));
  }

  /**
   * Mark data as locally modified
   */
  markLocalUpdate(): void {
    const metadata = this.getLocalMetadata();
    this.updateLocalMetadata({
      lastLocalUpdate: new Date().toISOString(),
      dataVersion: (metadata?.dataVersion || 0) + 1
    });
  }

  /**
   * Mark successful cloud sync
   */
  markCloudSync(): void {
    const now = new Date().toISOString();
    this.updateLocalMetadata({
      lastCloudUpdate: now,
      lastLocalUpdate: now // Both are in sync
    });
  }

  /**
   * Determine sync direction based on timestamps
   * @returns 'pull' if cloud is newer, 'push' if local is newer, 'none' if in sync
   */
  getSyncDirection(cloudMetadata?: { lastUpdate: string }): 'pull' | 'push' | 'none' {
    const localMetadata = this.getLocalMetadata();
    
    if (!localMetadata) {
      // No local metadata, pull from cloud if available
      return cloudMetadata ? 'pull' : 'none';
    }

    if (!cloudMetadata) {
      // No cloud metadata, push local data
      return 'push';
    }

    const localTime = new Date(localMetadata.lastLocalUpdate).getTime();
    const cloudTime = new Date(cloudMetadata.lastUpdate).getTime();

    // Add 1 second tolerance for timestamp comparison
    const tolerance = 1000;

    if (Math.abs(localTime - cloudTime) < tolerance) {
      return 'none'; // Data is in sync
    }

    return localTime > cloudTime ? 'push' : 'pull';
  }

  /**
   * Check if this is a new device (no local data)
   */
  isNewDevice(): boolean {
    const metadata = this.getLocalMetadata();
    if (!metadata) return true;
    
    // Check if localStorage has any bookings
    const bookingsStr = localStorage.getItem('coworking-bookings') || localStorage.getItem('deskBookings');
    if (!bookingsStr) return true;
    
    try {
      const bookings = JSON.parse(bookingsStr);
      return Object.keys(bookings).length === 0;
    } catch {
      return true;
    }
  }

  /**
   * Reset sync metadata (useful after migration or data clear)
   */
  reset(): void {
    localStorage.removeItem(METADATA_KEY);
  }
}