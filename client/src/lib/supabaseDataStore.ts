import { SupabaseClient } from '@supabase/supabase-js';
import { DeskBooking, WaitingListEntry, AppSettings } from '@shared/schema';
import { IDataStore } from './dataStore';
import { supabaseClient } from './supabaseClient';

export class SupabaseDataStore implements IDataStore {
  public client: SupabaseClient; // Made public for metadata access
  private readonly DAYS_TO_KEEP = 60; // Keep bookings for 60 days

  constructor() {
    this.client = supabaseClient;
    
    // Check authentication status on initialization
    this.checkAuthStatus();
  }

  private async checkAuthStatus(): Promise<void> {
    try {
      // Check if already authenticated
      const { data: { user } } = await this.client.auth.getUser();
      
      if (!user) {
        // Don't sign in anonymously - just work without auth
        // Read operations will still work due to RLS policies
        console.log('No authentication - read-only mode');
      } else {
        console.log('Authenticated as:', user.email);
      }
    } catch (error) {
      console.warn('Auth check failed:', error);
      // Continue without auth - read operations will still work
    }
  }

  isConfigured(): boolean {
    return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  }

  private getBookingKey(deskId: string, date: string): string {
    return `${deskId}-${date}`;
  }

  async getBooking(deskId: string, date: string): Promise<DeskBooking | null> {
    try {
      const { data, error } = await this.client
        .from('desk_bookings')
        .select('*')
        .eq('desk_id', deskId)
        .eq('date', date)
        .limit(1);

      if (error) {
        console.error('Supabase error fetching booking:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      return this.mapFromDatabase(data[0]);
    } catch (error) {
      console.error('Error fetching booking:', error);
      return null;
    }
  }

  async getAllBookings(): Promise<Record<string, DeskBooking>> {
    try {
      const { data, error } = await this.client
        .from('desk_bookings')
        .select('*');

      if (error) {
        console.error('Supabase error fetching bookings:', error);
        return {}; // Return empty object instead of throwing
      }

      const bookings: Record<string, DeskBooking> = {};
      
      for (const row of data || []) {
        const booking = this.mapFromDatabase(row);
        const key = this.getBookingKey(booking.deskId, booking.date);
        bookings[key] = booking;
      }

      return bookings;
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      return {}; // Return empty object to gracefully handle errors
    }
  }

  async saveBooking(booking: DeskBooking): Promise<void> {
    try {
      const dbData = this.mapToDatabase(booking);
      
      // First try to update existing record, then insert if not found
      const { error } = await this.client
        .from('desk_bookings')
        .upsert(dbData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Supabase upsert error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving booking:', error);
      throw new Error('Failed to save booking');
    }
  }

  async deleteBooking(deskId: string, date: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('desk_bookings')
        .delete()
        .eq('desk_id', deskId)
        .eq('date', date);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw new Error('Failed to delete booking');
    }
  }

  async bulkUpdateBookings(bookings: DeskBooking[]): Promise<void> {
    try {
      const dbData = bookings.map(booking => this.mapToDatabase(booking));
      
      const { error } = await this.client
        .from('desk_bookings')
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk updating bookings:', error);
      throw new Error('Failed to bulk update bookings');
    }
  }

  async getBookingsForDateRange(startDate: string, endDate: string): Promise<DeskBooking[]> {
    try {
      const { data, error } = await this.client
        .from('desk_bookings')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;

      return (data || []).map(row => this.mapFromDatabase(row));
    } catch (error) {
      console.error('Error fetching bookings for date range:', error);
      throw new Error('Failed to fetch bookings for date range');
    }
  }

  async getBookingsForDesk(deskId: string, startDate?: string, endDate?: string): Promise<DeskBooking[]> {
    try {
      let query = this.client
        .from('desk_bookings')
        .select('*')
        .eq('desk_id', deskId);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      query = query.order('date');

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(row => this.mapFromDatabase(row));
    } catch (error) {
      console.error('Error fetching bookings for desk:', error);
      throw new Error('Failed to fetch bookings for desk');
    }
  }

  async getDeskStats(dates: string[]): Promise<{
    available: number;
    assigned: number;
    booked: number;
  }> {
    try {
      const { data, error } = await this.client
        .from('desk_bookings')
        .select('status')
        .in('date', dates);

      if (error) throw error;

      const DESK_COUNT = 8; // 2 rooms × 4 desks
      const totalSlots = DESK_COUNT * dates.length;

      let assigned = 0;
      let booked = 0;

      for (const row of data || []) {
        switch (row.status) {
          case 'assigned':
            assigned++;
            break;
          case 'booked':
            booked++;
            break;
        }
      }

      const available = totalSlots - assigned - booked;
      return { available, assigned, booked };
    } catch (error) {
      console.error('Error fetching desk stats:', error);
      throw new Error('Failed to fetch desk stats');
    }
  }

  async clearAllBookings(): Promise<void> {
    try {
      const { error } = await this.client
        .from('desk_bookings')
        .delete()
        .neq('id', ''); // Delete all rows

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing all bookings:', error);
      throw new Error('Failed to clear all bookings');
    }
  }

  // Waiting List operations
  async saveWaitingListEntry(entry: WaitingListEntry): Promise<void> {
    try {
      const dbData = {
        id: entry.id,
        name: entry.name,
        preferred_dates: entry.preferredDates,
        contact_info: entry.contactInfo,
        notes: entry.notes,
        created_at: entry.createdAt,
      };

      const { error } = await this.client
        .from('waiting_list_entries')
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving waiting list entry:', error);
      throw new Error('Failed to save waiting list entry');
    }
  }

  async getWaitingListEntries(): Promise<WaitingListEntry[]> {
    try {
      const { data, error } = await this.client
        .from('waiting_list_entries')
        .select('*')
        .order('created_at');

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        preferredDates: row.preferred_dates,
        contactInfo: row.contact_info,
        notes: row.notes,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error fetching waiting list entries:', error);
      throw new Error('Failed to fetch waiting list entries');
    }
  }

  async deleteWaitingListEntry(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('waiting_list_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting waiting list entry:', error);
      throw new Error('Failed to delete waiting list entry');
    }
  }

  // App Settings operations
  async getAppSettings(): Promise<AppSettings | null> {
    try {
      const { data, error } = await this.client
        .from('app_settings')
        .select('*')
        .eq('id', 'default')
        .limit(1);

      if (error) {
        console.error('Supabase error fetching app settings:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      return {
        currency: data[0].currency,
        createdAt: data[0].created_at,
        updatedAt: data[0].updated_at,
      };
    } catch (error) {
      console.error('Error fetching app settings:', error);
      return null;
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    try {
      const dbData = {
        id: 'default',
        currency: settings.currency,
        created_at: settings.createdAt,
        updated_at: settings.updatedAt,
      };

      const { error } = await this.client
        .from('app_settings')
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw new Error('Failed to save app settings');
    }
  }

  // Helper methods for data mapping
  private mapToDatabase(booking: DeskBooking): any {
    // Convert string ID to integer for Supabase
    const numericId = this.stringToNumericId(booking.id);
    
    return {
      id: numericId,
      desk_id: booking.deskId,
      date: booking.date,
      start_date: booking.startDate,
      end_date: booking.endDate,
      status: booking.status,
      person_name: booking.personName,
      title: booking.title,
      price: booking.price,
      currency: booking.currency,
      created_at: booking.createdAt,
    };
  }

  private mapFromDatabase(row: any): DeskBooking {
    return {
      id: String(row.id), // Convert numeric ID back to string
      deskId: row.desk_id,
      date: row.date,
      startDate: row.start_date || row.date,
      endDate: row.end_date || row.date,
      status: row.status,
      personName: row.person_name,
      title: row.title,
      price: row.price,
      currency: row.currency || 'BGN', // Use database currency or default to BGN
      createdAt: row.created_at,
    };
  }

  // Convert string ID to numeric ID for database storage
  private stringToNumericId(stringId: string): number {
    // Create a simple hash of the string to generate a consistent numeric ID
    let hash = 0;
    for (let i = 0; i < stringId.length; i++) {
      const char = stringId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive number
    return Math.abs(hash);
  }
}