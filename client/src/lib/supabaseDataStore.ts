import { SupabaseClient } from '@supabase/supabase-js';
import { DeskBooking, WaitingListEntry, AppSettings, MonthlyStats, Expense, RecurringExpense } from '@shared/schema';
import { IDataStore } from './dataStore';
import { supabaseClient } from './supabaseClient';
import { DESK_COUNT } from './deskConfig';

export class SupabaseDataStore implements IDataStore {
  public client: SupabaseClient; // Made public for metadata access
  private readonly DAYS_TO_KEEP = 60; // Keep bookings for 60 days
  private organizationId: string | null;

  constructor(organizationId?: string) {
    this.client = supabaseClient;
    this.organizationId = organizationId || null;

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

  private scopeQuery<T>(query: T): T {
    if (this.organizationId) {
      return (query as any).eq('organization_id', this.organizationId) as T;
    }
    return query;
  }

  async getBooking(deskId: string, date: string): Promise<DeskBooking | null> {
    try {
      const { data, error } = await this.scopeQuery(
        this.client
          .from('desk_bookings')
          .select('*')
          .eq('desk_id', deskId)
          .eq('date', date)
      ).limit(1);

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

  async getAllBookings(startDate?: string, endDate?: string): Promise<Record<string, DeskBooking>> {
    try {
      let query = this.scopeQuery(
        this.client
          .from('desk_bookings')
          .select('*')
      );

      // Apply date range filtering if provided
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query;

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

  async bulkDeleteBookings(deletions: { deskId: string; date: string }[]): Promise<void> {
    try {
      // Build a filter to delete multiple bookings in one query
      // Use OR conditions to match any of the desk_id + date combinations
      const orConditions = deletions.map(({ deskId, date }) => 
        `and(desk_id.eq.${deskId},date.eq.${date})`
      );
      
      const { error } = await this.client
        .from('desk_bookings')
        .delete()
        .or(orConditions.join(','));

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk deleting bookings:', error);
      throw new Error('Failed to bulk delete bookings');
    }
  }

  async getBookingsForDateRange(startDate: string, endDate: string): Promise<DeskBooking[]> {
    try {
      const { data, error } = await this.scopeQuery(
        this.client
          .from('desk_bookings')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
      ).order('date');

      if (error) throw error;

      return (data || []).map(row => this.mapFromDatabase(row));
    } catch (error) {
      console.error('Error fetching bookings for date range:', error);
      throw new Error('Failed to fetch bookings for date range');
    }
  }

  async getBookingsForDesk(deskId: string, startDate?: string, endDate?: string): Promise<DeskBooking[]> {
    try {
      let query = this.scopeQuery(
        this.client
          .from('desk_bookings')
          .select('*')
          .eq('desk_id', deskId)
      );

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
      const { data, error } = await this.scopeQuery(
        this.client
          .from('desk_bookings')
          .select('status')
          .in('date', dates)
      );

      if (error) throw error;

      // Uses DESK_COUNT from deskConfig
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

  async getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    const { getCurrency } = await import('./settings');
    const currency = getCurrency();
    // Uses DESK_COUNT from deskConfig

    // Calculate month boundaries (month is 0-indexed)
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Generate all business days in month (exclude weekends)
    const businessDaysInMonth: string[] = [];
    let current = new Date(monthStart);
    while (current <= monthEnd) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysInMonth.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    const totalDeskDays = DESK_COUNT * businessDaysInMonth.length;

    try {
      const { data, error } = await this.scopeQuery(
        this.client
          .from('desk_bookings')
          .select('date, start_date, end_date, status, price, desk_id')
          .in('date', businessDaysInMonth)
      );

      if (error) throw error;

      const processedBookings = new Set<string>();
      let confirmedRevenue = 0;
      let expectedRevenue = 0;
      let occupiedDays = 0;

      for (const row of data || []) {
        // Count occupied days
        if (row.status === 'assigned' || row.status === 'booked') {
          occupiedDays++;
        }

        // For revenue: only process each unique booking once, with pro-rata calculation
        const bookingKey = `${row.desk_id}-${row.start_date}`;
        if (processedBookings.has(bookingKey)) continue;
        processedBookings.add(bookingKey);

        // Calculate pro-rated revenue for this month
        const bookingStart = new Date(row.start_date);
        const bookingEnd = new Date(row.end_date);
        const totalBookingDays = this.countBusinessDays(bookingStart, bookingEnd);
        const effectiveStart = bookingStart > monthStart ? bookingStart : monthStart;
        const effectiveEnd = bookingEnd < monthEnd ? bookingEnd : monthEnd;
        const daysInThisMonth = this.countBusinessDays(effectiveStart, effectiveEnd);

        const bookingPrice = row.price || 0;
        const proratedPrice = totalBookingDays > 0
          ? (daysInThisMonth / totalBookingDays) * bookingPrice
          : 0;

        if (row.status === 'assigned') {
          confirmedRevenue += proratedPrice;
        } else if (row.status === 'booked') {
          expectedRevenue += proratedPrice;
        }
      }

      const totalRevenue = confirmedRevenue + expectedRevenue;
      const occupancyRate = totalDeskDays > 0 ? (occupiedDays / totalDeskDays) * 100 : 0;
      const revenuePerOccupiedDay = occupiedDays > 0 ? totalRevenue / occupiedDays : 0;

      return {
        totalRevenue,
        confirmedRevenue,
        expectedRevenue,
        occupiedDays,
        totalDeskDays,
        occupancyRate,
        revenuePerOccupiedDay,
        currency,
      };
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      return {
        totalRevenue: 0,
        confirmedRevenue: 0,
        expectedRevenue: 0,
        occupiedDays: 0,
        totalDeskDays,
        occupancyRate: 0,
        revenuePerOccupiedDay: 0,
        currency,
      };
    }
  }

  private countBusinessDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  async getStatsForDateRange(startDate: string, endDate: string): Promise<MonthlyStats> {
    const { getCurrency } = await import('./settings');
    const currency = getCurrency();
    // Uses DESK_COUNT from deskConfig

    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);

    const businessDaysInRange: string[] = [];
    let current = new Date(rangeStart);
    while (current <= rangeEnd) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysInRange.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    const totalDeskDays = DESK_COUNT * businessDaysInRange.length;

    try {
      const { data, error } = await this.scopeQuery(
        this.client
          .from('desk_bookings')
          .select('date, start_date, end_date, status, price, desk_id')
          .in('date', businessDaysInRange)
      );

      if (error) throw error;

      const processedBookings = new Set<string>();
      let confirmedRevenue = 0;
      let expectedRevenue = 0;
      let occupiedDays = 0;

      for (const row of data || []) {
        if (row.status === 'assigned' || row.status === 'booked') {
          occupiedDays++;
        }

        const bookingKey = `${row.desk_id}-${row.start_date}`;
        if (processedBookings.has(bookingKey)) continue;
        processedBookings.add(bookingKey);

        const bookingStart = new Date(row.start_date);
        const bookingEnd = new Date(row.end_date);
        const totalBookingDays = this.countBusinessDays(bookingStart, bookingEnd);
        const effectiveStart = bookingStart > rangeStart ? bookingStart : rangeStart;
        const effectiveEnd = bookingEnd < rangeEnd ? bookingEnd : rangeEnd;
        const daysInThisRange = this.countBusinessDays(effectiveStart, effectiveEnd);

        const bookingPrice = row.price || 0;
        const proratedPrice = totalBookingDays > 0
          ? (daysInThisRange / totalBookingDays) * bookingPrice
          : 0;

        if (row.status === 'assigned') {
          confirmedRevenue += proratedPrice;
        } else if (row.status === 'booked') {
          expectedRevenue += proratedPrice;
        }
      }

      const totalRevenue = confirmedRevenue + expectedRevenue;
      const occupancyRate = totalDeskDays > 0 ? (occupiedDays / totalDeskDays) * 100 : 0;
      const revenuePerOccupiedDay = occupiedDays > 0 ? totalRevenue / occupiedDays : 0;

      return {
        totalRevenue, confirmedRevenue, expectedRevenue, occupiedDays,
        totalDeskDays, occupancyRate, revenuePerOccupiedDay, currency,
      };
    } catch (error) {
      console.error('Error fetching stats for date range:', error);
      return {
        totalRevenue: 0, confirmedRevenue: 0, expectedRevenue: 0, occupiedDays: 0,
        totalDeskDays, occupancyRate: 0, revenuePerOccupiedDay: 0, currency,
      };
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
      // Convert string ID to numeric for Supabase
      let numericId: number;
      if (typeof entry.id === 'string' && entry.id.startsWith('waiting-')) {
        // Extract timestamp from string ID like "waiting-1756209405035-ankcv9rg1"
        const timestampMatch = entry.id.match(/waiting-(\d+)-/);
        numericId = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
      } else {
        numericId = typeof entry.id === 'string' ? parseInt(entry.id) || Date.now() : entry.id;
      }

      const dbData: any = {
        id: numericId,
        name: entry.name,
        preferred_dates: entry.preferredDates,
        contact_info: entry.contactInfo,
        notes: entry.notes,
        created_at: entry.createdAt,
      };

      if (this.organizationId) {
        dbData.organization_id = this.organizationId;
      }

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
      const { data, error } = await this.scopeQuery(
        this.client
          .from('waiting_list_entries')
          .select('*')
      ).order('created_at');

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id.toString(), // Convert numeric ID back to string for consistency
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
      // Convert string ID to numeric for Supabase
      let numericId: number;
      if (id.startsWith('waiting-')) {
        const timestampMatch = id.match(/waiting-(\d+)-/);
        numericId = timestampMatch ? parseInt(timestampMatch[1]) : parseInt(id) || 0;
      } else {
        numericId = parseInt(id) || 0;
      }

      const { error } = await this.client
        .from('waiting_list_entries')
        .delete()
        .eq('id', numericId);

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
    // Include organizationId in hash to avoid cross-org ID collisions
    const hashInput = this.organizationId ? `${this.organizationId}:${booking.id}` : booking.id;
    const numericId = this.stringToNumericId(hashInput);

    const record: any = {
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

    if (this.organizationId) {
      record.organization_id = this.organizationId;
    }

    return record;
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
      currency: row.currency || 'EUR', // Use database currency or default to EUR
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

  // Expense operations
  async getExpenses(startDate: string, endDate: string): Promise<Expense[]> {
    try {
      const { data, error } = await this.scopeQuery(
        this.client
          .from('expenses')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
      ).order('date');

      if (error) throw error;

      return (data || []).map(row => this.mapExpenseFromDatabase(row));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  }

  async saveExpense(expense: Expense): Promise<void> {
    try {
      const dbData = this.mapExpenseToDatabase(expense);

      const { error } = await this.client
        .from('expenses')
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving expense:', error);
      throw new Error('Failed to save expense');
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      // ID from database is numeric, stored as string - parse it back
      const numericId = parseInt(id, 10);

      const { error } = await this.client
        .from('expenses')
        .delete()
        .eq('id', numericId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw new Error('Failed to delete expense');
    }
  }

  // Recurring expense operations
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    try {
      const { data, error } = await this.scopeQuery(
        this.client
          .from('recurring_expenses')
          .select('*')
      ).order('created_at');

      if (error) throw error;

      return (data || []).map(row => this.mapRecurringExpenseFromDatabase(row));
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
      return [];
    }
  }

  async saveRecurringExpense(expense: RecurringExpense): Promise<void> {
    try {
      const dbData = this.mapRecurringExpenseToDatabase(expense);

      const { error } = await this.client
        .from('recurring_expenses')
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving recurring expense:', error);
      throw new Error('Failed to save recurring expense');
    }
  }

  async deleteRecurringExpense(id: string): Promise<void> {
    try {
      // ID from database is numeric, stored as string - parse it back
      const numericId = parseInt(id, 10);

      const { error } = await this.client
        .from('recurring_expenses')
        .delete()
        .eq('id', numericId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      throw new Error('Failed to delete recurring expense');
    }
  }

  async generateRecurringExpenses(year: number, month: number): Promise<Expense[]> {
    try {
      const recurringExpenses = await this.getRecurringExpenses();
      const activeExpenses = recurringExpenses.filter(e => e.isActive);

      // Get existing expenses for this month to avoid duplicates
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
      const existingExpenses = await this.getExpenses(monthStart, monthEnd);

      const generatedExpenses: Expense[] = [];

      for (const recurring of activeExpenses) {
        const alreadyExists = existingExpenses.some(
          e => e.isRecurring && e.recurringExpenseId === recurring.id
        );

        if (!alreadyExists) {
          const expenseDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(recurring.dayOfMonth).padStart(2, '0')}`;
          const newExpense: Expense = {
            id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: expenseDate,
            amount: recurring.amount,
            currency: recurring.currency,
            category: recurring.category,
            description: recurring.description,
            isRecurring: true,
            recurringExpenseId: recurring.id,
            createdAt: new Date().toISOString(),
          };

          await this.saveExpense(newExpense);
          generatedExpenses.push(newExpense);
        }
      }

      return generatedExpenses;
    } catch (error) {
      console.error('Error generating recurring expenses:', error);
      return [];
    }
  }

  // Expense mapping helpers
  private mapExpenseToDatabase(expense: Expense): any {
    // If the ID is already numeric (from database), use it directly; otherwise hash it
    const numericId = /^\d+$/.test(expense.id) ? parseInt(expense.id, 10) : this.stringToNumericId(expense.id);
    // Same for recurring_expense_id
    const recurringId = expense.recurringExpenseId
      ? (/^\d+$/.test(expense.recurringExpenseId) ? parseInt(expense.recurringExpenseId, 10) : this.stringToNumericId(expense.recurringExpenseId))
      : null;
    const record: any = {
      id: numericId,
      date: expense.date,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
      description: expense.description,
      is_recurring: expense.isRecurring,
      recurring_expense_id: recurringId,
      created_at: expense.createdAt,
    };
    if (this.organizationId) {
      record.organization_id = this.organizationId;
    }
    return record;
  }

  private mapExpenseFromDatabase(row: any): Expense {
    return {
      id: String(row.id),
      date: row.date,
      amount: parseFloat(row.amount),
      currency: row.currency,
      category: row.category,
      description: row.description,
      isRecurring: row.is_recurring || false,
      recurringExpenseId: row.recurring_expense_id ? String(row.recurring_expense_id) : undefined,
      createdAt: row.created_at,
    };
  }

  private mapRecurringExpenseToDatabase(expense: RecurringExpense): any {
    // If the ID is already numeric (from database), use it directly; otherwise hash it
    const numericId = /^\d+$/.test(expense.id) ? parseInt(expense.id, 10) : this.stringToNumericId(expense.id);
    const record: any = {
      id: numericId,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
      description: expense.description,
      day_of_month: expense.dayOfMonth,
      is_active: expense.isActive,
      created_at: expense.createdAt,
    };
    if (this.organizationId) {
      record.organization_id = this.organizationId;
    }
    return record;
  }

  private mapRecurringExpenseFromDatabase(row: any): RecurringExpense {
    return {
      id: String(row.id),
      amount: parseFloat(row.amount),
      currency: row.currency,
      category: row.category,
      description: row.description,
      dayOfMonth: row.day_of_month,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}