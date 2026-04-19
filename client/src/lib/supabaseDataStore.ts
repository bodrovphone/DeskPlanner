import { SupabaseClient } from '@supabase/supabase-js';
import {
  DeskBooking,
  WaitingListEntry,
  AppSettings,
  MonthlyStats,
  Expense,
  RecurringExpense,
  SharedBooking,
  PublicAvailability,
  Client,
  ExpenseCategory,
  Currency,
} from '@shared/schema';
import { IDataStore } from './dataStore';
import { supabaseClient } from './supabaseClient';
import { DESK_COUNT } from './deskConfig';
import { isNonWorkingDay } from './workingDays';
import { formatLocalDate, formatYMD, generateDaysInRange } from './dateUtils';
import { DEDICATED_PLAN_TYPES, addDays, daysBetweenInclusive } from './planDates';

export class SupabaseDataStore implements IDataStore {
  public client: SupabaseClient; // Made public for metadata access
  private readonly DAYS_TO_KEEP = 60; // Keep bookings for 60 days
  private organizationId: string | null;
  private groupId: string | null;

  constructor(organizationId?: string, groupId?: string) {
    this.client = supabaseClient;
    this.organizationId = organizationId || null;
    this.groupId = groupId || null;

    // Check authentication status on initialization
    this.checkAuthStatus();
  }

  private async checkAuthStatus(): Promise<void> {
    try {
      // Check if already authenticated
      const {
        data: { user },
      } = await this.client.auth.getUser();

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
    return !!(
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
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

  // Client queries scope by group_id when the org is in a group, else by org_id
  private scopeClientQuery<T>(query: T): T {
    if (this.groupId) {
      return (query as any).eq('group_id', this.groupId) as T;
    }
    if (this.organizationId) {
      return (query as any).eq('organization_id', this.organizationId) as T;
    }
    return query;
  }

  // Scoped desk_bookings query that by default hides frozen rows. Freeze/unfreeze
  // flows and audit exports pass includeFrozen=true to see frozen rows.
  private scopeBookingsQuery<T>(
    query: T,
    opts: { includeFrozen?: boolean } = {},
  ): T {
    const scoped = this.scopeQuery(query) as any;
    if (opts.includeFrozen) return scoped as T;
    return scoped.eq('is_frozen', false) as T;
  }

  async getBooking(deskId: string, date: string): Promise<DeskBooking | null> {
    try {
      const { data, error } = await this.scopeBookingsQuery(
        this.client
          .from('desk_bookings')
          .select('*')
          .eq('desk_id', deskId)
          .eq('date', date),
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

  async getAllBookings(
    startDate?: string,
    endDate?: string,
  ): Promise<Record<string, DeskBooking>> {
    try {
      let query = this.scopeBookingsQuery(
        this.client.from('desk_bookings').select('*'),
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
      const { error } = await this.client.from('desk_bookings').upsert(dbData, {
        onConflict: 'id',
        ignoreDuplicates: false,
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
      const dbData = bookings.map((booking) => this.mapToDatabase(booking));

      const { error } = await this.client
        .from('desk_bookings')
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk updating bookings:', error);
      throw new Error('Failed to bulk update bookings');
    }
  }

  async bulkDeleteBookings(
    deletions: { deskId: string; date: string }[],
  ): Promise<void> {
    try {
      // Build a filter to delete multiple bookings in one query
      // Use OR conditions to match any of the desk_id + date combinations
      const orConditions = deletions.map(
        ({ deskId, date }) => `and(desk_id.eq.${deskId},date.eq.${date})`,
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

  async getBookingsForDateRange(
    startDate: string,
    endDate: string,
  ): Promise<DeskBooking[]> {
    try {
      const { data, error } = await this.scopeBookingsQuery(
        this.client
          .from('desk_bookings')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate),
      ).order('date');

      if (error) throw error;

      return (data || []).map((row) => this.mapFromDatabase(row));
    } catch (error) {
      console.error('Error fetching bookings for date range:', error);
      throw new Error('Failed to fetch bookings for date range');
    }
  }

  async getBookingsForDesk(
    deskId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DeskBooking[]> {
    try {
      let query = this.scopeBookingsQuery(
        this.client.from('desk_bookings').select('*').eq('desk_id', deskId),
      );

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      query = query.order('date');

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row) => this.mapFromDatabase(row));
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
      const { data, error } = await this.scopeBookingsQuery(
        this.client
          .from('desk_bookings')
          .select('desk_id, date, status')
          .in('date', dates),
      );

      if (error) throw error;

      // Uses DESK_COUNT from deskConfig
      const totalSlots = DESK_COUNT * dates.length;

      let assigned = 0;
      let booked = 0;

      // Deduplicate by desk_id+date to avoid counting duplicate rows
      const seen = new Set<string>();
      for (const row of data || []) {
        const key = `${row.desk_id}:${row.date}`;
        if (seen.has(key)) continue;
        seen.add(key);
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

  async getMonthlyStats(
    year: number,
    month: number,
    workingDays?: number[],
    deskCount?: number,
  ): Promise<MonthlyStats> {
    const currency = 'EUR';
    // Uses DESK_COUNT from deskConfig

    // Calculate month boundaries (month is 0-indexed)
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Generate all calendar days in month
    const daysInMonth = generateDaysInRange(monthStart, monthEnd);

    const workingDayCount = workingDays
      ? daysInMonth.filter((d) => !isNonWorkingDay(d, workingDays)).length
      : daysInMonth.length;
    const totalDeskDays = (deskCount ?? DESK_COUNT) * workingDayCount;

    try {
      const { data, error } = await this.scopeBookingsQuery(
        this.client
          .from('desk_bookings')
          .select('date, start_date, end_date, status, price, desk_id')
          .in('date', daysInMonth),
      );

      if (error) throw error;

      return this.calculateStatsFromRows(
        data || [],
        monthStart,
        monthEnd,
        totalDeskDays,
        workingDays,
        currency,
      );
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

  private calculateStatsFromRows(
    rows: Array<{
      desk_id: string;
      date: string;
      status: string;
      price: number | null;
      start_date: string;
      end_date: string;
    }>,
    periodStart: Date,
    periodEnd: Date,
    totalDeskDays: number,
    workingDays?: number[],
    currency: Currency = 'EUR',
  ): MonthlyStats {
    const processedBookings = new Set<string>();
    const seenSlots = new Set<string>();
    let confirmedRevenue = 0;
    let expectedRevenue = 0;
    let occupiedDays = 0;
    let assignedWorkingDays = 0;

    for (const row of rows) {
      const slotKey = `${row.desk_id}:${row.date}`;
      const isWorking = !workingDays || !isNonWorkingDay(row.date, workingDays);
      if (!seenSlots.has(slotKey)) {
        seenSlots.add(slotKey);
        if (
          (row.status === 'assigned' || row.status === 'booked') &&
          isWorking
        ) {
          occupiedDays++;
        }
        if (row.status === 'assigned' && isWorking) {
          assignedWorkingDays++;
        }
      }

      const bookingKey = `${row.desk_id}-${row.start_date}`;
      if (processedBookings.has(bookingKey)) continue;
      processedBookings.add(bookingKey);

      const bookingStart = new Date(row.start_date);
      const bookingEnd = new Date(row.end_date);
      const totalBookingDays = this.countCalendarDays(bookingStart, bookingEnd);
      const effectiveStart =
        bookingStart > periodStart ? bookingStart : periodStart;
      const effectiveEnd = bookingEnd < periodEnd ? bookingEnd : periodEnd;
      const daysInPeriod = this.countCalendarDays(effectiveStart, effectiveEnd);

      const bookingPrice = row.price || 0;
      const proratedPrice =
        totalBookingDays > 0
          ? (daysInPeriod / totalBookingDays) * bookingPrice
          : 0;

      if (row.status === 'assigned') {
        confirmedRevenue += proratedPrice;
      } else if (row.status === 'booked') {
        expectedRevenue += proratedPrice;
      }
    }

    const totalRevenue = confirmedRevenue + expectedRevenue;
    const occupancyRate =
      totalDeskDays > 0 ? (assignedWorkingDays / totalDeskDays) * 100 : 0;
    const revenuePerOccupiedDay =
      assignedWorkingDays > 0 ? confirmedRevenue / assignedWorkingDays : 0;

    return {
      totalRevenue,
      confirmedRevenue,
      expectedRevenue,
      occupiedDays: assignedWorkingDays,
      totalDeskDays,
      occupancyRate,
      revenuePerOccupiedDay,
      currency,
    };
  }

  private countCalendarDays(start: Date, end: Date): number {
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffMs = e.getTime() - s.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }

  async getStatsForDateRange(
    startDate: string,
    endDate: string,
    workingDays?: number[],
    deskCount?: number,
  ): Promise<MonthlyStats> {
    const currency = 'EUR';
    // Uses DESK_COUNT from deskConfig

    const rangeStart = new Date(startDate + 'T00:00:00');
    const rangeEnd = new Date(endDate + 'T00:00:00');

    const daysInRange = generateDaysInRange(rangeStart, rangeEnd);

    const workingDayCount = workingDays
      ? daysInRange.filter((d) => !isNonWorkingDay(d, workingDays)).length
      : daysInRange.length;
    const totalDeskDays = (deskCount ?? DESK_COUNT) * workingDayCount;

    try {
      const { data, error } = await this.scopeBookingsQuery(
        this.client
          .from('desk_bookings')
          .select('date, start_date, end_date, status, price, desk_id')
          .in('date', daysInRange),
      );

      if (error) throw error;

      return this.calculateStatsFromRows(
        data || [],
        rangeStart,
        rangeEnd,
        totalDeskDays,
        workingDays,
        currency,
      );
    } catch (error) {
      console.error('Error fetching stats for date range:', error);
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
        numericId =
          typeof entry.id === 'string'
            ? parseInt(entry.id) || Date.now()
            : entry.id;
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
        this.client.from('waiting_list_entries').select('*'),
      ).order('created_at');

      if (error) throw error;

      return (data || []).map((row) => ({
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
        numericId = timestampMatch
          ? parseInt(timestampMatch[1])
          : parseInt(id) || 0;
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
    const hashInput = this.organizationId
      ? `${this.organizationId}:${booking.id}`
      : booking.id;
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
      client_id: booking.clientId
        ? parseInt(booking.clientId, 10) || null
        : null,
      is_flex: booking.isFlex || false,
      is_frozen: booking.isFrozen || false,
      paused_at: booking.pausedAt ?? null,
      plan_type: booking.planType ?? null,
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
      shareToken: row.share_token || undefined,
      clientId: row.client_id ? String(row.client_id) : undefined,
      isFlex: row.is_flex || false,
      isFrozen: row.is_frozen || false,
      pausedAt: row.paused_at ?? null,
      planType: row.plan_type ?? null,
      paymentStatus: row.payment_status ?? null,
      stripeCheckoutSessionId: row.stripe_checkout_session_id ?? null,
      stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
      createdAt: row.created_at,
    };
  }

  // Convert string ID to numeric ID for database storage
  private stringToNumericId(stringId: string): number {
    // Create a simple hash of the string to generate a consistent numeric ID
    let hash = 0;
    for (let i = 0; i < stringId.length; i++) {
      const char = stringId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
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
          .select('*, expense_categories(id, name)')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
      );

      if (error) throw error;

      return (data || []).map((row) => this.mapExpenseFromDatabase(row));
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
          .select('*, expense_categories(id, name)')
          .eq('is_active', true),
      );

      if (error) throw error;

      return (data || []).map((row) =>
        this.mapRecurringExpenseFromDatabase(row),
      );
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

  async generateRecurringExpenses(
    year: number,
    month: number,
  ): Promise<Expense[]> {
    try {
      const recurringExpenses = await this.getRecurringExpenses();
      const activeExpenses = recurringExpenses.filter((e) => e.isActive);

      // Get existing expenses for this month to avoid duplicates
      const monthStart = formatYMD(year, month + 1, 1);
      const monthEnd = formatLocalDate(new Date(year, month + 1, 0));
      const existingExpenses = await this.getExpenses(monthStart, monthEnd);

      const generatedExpenses: Expense[] = [];

      for (const recurring of activeExpenses) {
        const alreadyExists = existingExpenses.some(
          (e) => e.isRecurring && e.recurringExpenseId === recurring.id,
        );

        if (!alreadyExists) {
          const expenseDate = formatYMD(year, month + 1, recurring.dayOfMonth);
          const newExpense: Expense = {
            id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: expenseDate,
            amount: recurring.amount,
            currency: recurring.currency,
            categoryId: recurring.categoryId,
            categoryName: recurring.categoryName,
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
    const numericId = /^\d+$/.test(expense.id)
      ? parseInt(expense.id, 10)
      : this.stringToNumericId(expense.id);
    // Same for recurring_expense_id
    const recurringId = expense.recurringExpenseId
      ? /^\d+$/.test(expense.recurringExpenseId)
        ? parseInt(expense.recurringExpenseId, 10)
        : this.stringToNumericId(expense.recurringExpenseId)
      : null;
    const record: any = {
      id: numericId,
      date: expense.date,
      amount: expense.amount,
      currency: expense.currency,
      category_id: expense.categoryId,
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
      categoryId: row.category_id,
      categoryName: row.expense_categories?.name ?? '',
      description: row.description,
      isRecurring: row.is_recurring || false,
      recurringExpenseId: row.recurring_expense_id
        ? String(row.recurring_expense_id)
        : undefined,
      createdAt: row.created_at,
    };
  }

  private mapRecurringExpenseToDatabase(expense: RecurringExpense): any {
    // If the ID is already numeric (from database), use it directly; otherwise hash it
    const numericId = /^\d+$/.test(expense.id)
      ? parseInt(expense.id, 10)
      : this.stringToNumericId(expense.id);
    const record: any = {
      id: numericId,
      amount: expense.amount,
      currency: expense.currency,
      category_id: expense.categoryId,
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
      categoryId: row.category_id,
      categoryName: row.expense_categories?.name ?? '',
      description: row.description,
      dayOfMonth: row.day_of_month,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }

  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await this.scopeQuery(
      this.client
        .from('expense_categories')
        .select('id, name, is_default')
        .order('name'),
    );
    if (error) throw new Error('Failed to fetch expense categories');
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      isDefault: row.is_default,
    }));
  }

  async createExpenseCategory(name: string): Promise<ExpenseCategory> {
    const { data, error } = await this.client
      .from('expense_categories')
      .insert({ organization_id: this.organizationId, name: name.trim() })
      .select('id, name, is_default')
      .single();
    if (error) throw new Error('Failed to create expense category');
    return { id: data.id, name: data.name, isDefault: data.is_default };
  }

  async renameExpenseCategory(id: string, name: string): Promise<void> {
    const { error } = await this.client
      .from('expense_categories')
      .update({ name: name.trim() })
      .eq('id', id);
    if (error) throw new Error('Failed to rename expense category');
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    const { error } = await this.client
      .from('expense_categories')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Failed to delete expense category');
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    // Fetch clients with their most recent booking date for sorting
    const { data, error } = await this.scopeClientQuery(
      this.client.from('clients').select('*, desk_bookings(date)'),
    ).order('name');

    if (error) throw error;

    const clients = (data || []).map((row) => {
      const bookings = row.desk_bookings as { date: string }[] | null;
      const lastBookingDate =
        bookings && bookings.length > 0
          ? bookings.reduce(
              (max: string, b: { date: string }) =>
                b.date > max ? b.date : max,
              bookings[0].date,
            )
          : null;
      return {
        ...this.mapClientFromDatabase(row),
        lastBookingDate,
      };
    });

    // Sort by last booking date (most recent first), then by name for those without bookings
    clients.sort((a, b) => {
      if (a.lastBookingDate && b.lastBookingDate)
        return b.lastBookingDate.localeCompare(a.lastBookingDate);
      if (a.lastBookingDate) return -1;
      if (b.lastBookingDate) return 1;
      return a.name.localeCompare(b.name);
    });

    return clients;
  }

  async searchClients(query: string): Promise<Client[]> {
    const { data, error } = await this.scopeClientQuery(
      this.client.from('clients').select('*').ilike('name', `%${query}%`),
    )
      .order('name')
      .limit(10);

    if (error) throw error;
    return (data || []).map((row) => this.mapClientFromDatabase(row));
  }

  async saveClient(client: Client): Promise<Client> {
    const isNew = !client.id || client.id.startsWith('new-');
    const now = new Date().toISOString();

    if (isNew) {
      const record: any = {
        organization_id: this.organizationId,
        group_id: this.groupId || null,
        name: client.name,
        contact: client.contact || null,
        email: client.email || null,
        phone: client.phone || null,
        flex_active: client.flexActive || false,
        flex_total_days: client.flexTotalDays || 0,
        flex_used_days: client.flexUsedDays || 0,
        flex_start_date: client.flexStartDate || null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await this.client
        .from('clients')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return this.mapClientFromDatabase(data);
    } else {
      const numericId = parseInt(client.id, 10);
      const { data, error } = await this.client
        .from('clients')
        .update({
          name: client.name,
          contact: client.contact || null,
          email: client.email || null,
          phone: client.phone || null,
          flex_active: client.flexActive || false,
          flex_total_days: client.flexTotalDays || 0,
          flex_used_days: client.flexUsedDays || 0,
          flex_start_date: client.flexStartDate || null,
          updated_at: now,
        })
        .eq('id', numericId)
        .select()
        .single();

      if (error) throw error;

      // Sync person_name on all linked bookings
      await this.client
        .from('desk_bookings')
        .update({ person_name: client.name })
        .eq('client_id', numericId);

      return this.mapClientFromDatabase(data);
    }
  }

  async deleteClient(id: string): Promise<void> {
    const { error } = await this.client
      .from('clients')
      .delete()
      .eq('id', parseInt(id, 10));

    if (error) throw error;
  }

  async getClientById(id: string): Promise<Client | null> {
    const { data, error } = await this.client
      .from('clients')
      .select('*')
      .eq('id', parseInt(id, 10))
      .single();

    if (error || !data) return null;
    return this.mapClientFromDatabase(data);
  }

  async deductFlexDay(clientId: string): Promise<Client> {
    const numericId = parseInt(clientId, 10);

    // Atomic increment via RPC — avoids race conditions
    const { error } = await this.client.rpc('increment_flex_used_days', {
      p_client_id: numericId,
    });

    if (error) throw error;

    const refreshed = await this.getClientById(clientId);
    if (!refreshed) throw new Error('Client not found after deduction');
    return refreshed;
  }

  async freezePlanBooking(args: {
    clientId: string;
    startDate: string;
    endDate: string;
    pausedAt: string;
  }): Promise<{ pausedCount: number }> {
    const numericId = parseInt(args.clientId, 10);

    const { data: allRows, error: fetchError } = await this.client
      .from('desk_bookings')
      .select('id, date, price')
      .eq('client_id', numericId)
      .eq('start_date', args.startDate)
      .eq('end_date', args.endDate)
      .eq('is_frozen', false);
    if (fetchError) throw fetchError;
    if (!allRows || allRows.length === 0) return { pausedCount: 0 };

    const originalPrice = allRows[0].price ?? 0;
    const totalCount = allRows.length;
    const activeIds = allRows.filter((r) => r.date < args.pausedAt).map((r) => r.id);
    const frozenIds = allRows.filter((r) => r.date >= args.pausedAt).map((r) => r.id);
    if (frozenIds.length === 0) return { pausedCount: 0 };

    const activePrice =
      activeIds.length > 0
        ? Math.round((originalPrice * activeIds.length) / totalCount)
        : 0;
    const newEndDate = addDays(args.pausedAt, -1);

    if (activeIds.length > 0) {
      const { error } = await this.client
        .from('desk_bookings')
        .update({ price: activePrice, end_date: newEndDate })
        .in('id', activeIds);
      if (error) throw error;
    }

    const { error: freezeError } = await this.client
      .from('desk_bookings')
      .update({ is_frozen: true, paused_at: args.pausedAt })
      .in('id', frozenIds);
    if (freezeError) throw freezeError;

    return { pausedCount: frozenIds.length };
  }

  async reactivatePlan(
    clientId: string,
    allocations: { deskId: string; date: string }[],
  ): Promise<{ reactivatedCount: number }> {
    if (allocations.length === 0) return { reactivatedCount: 0 };
    const numericId = parseInt(clientId, 10);

    // Fetch banked rows, oldest paused_at first, to restore in order.
    const { data: bankedRows, error: fetchError } = await this.client
      .from('desk_bookings')
      .select('*')
      .eq('client_id', numericId)
      .not('paused_at', 'is', null)
      .order('date', { ascending: true })
      .limit(allocations.length);
    if (fetchError) throw fetchError;
    if (!bankedRows || bankedRows.length < allocations.length) {
      throw new Error(
        `Not enough banked days to reactivate (need ${allocations.length}, found ${bankedRows?.length ?? 0})`,
      );
    }

    const newStart = allocations[0].date;
    const newEnd = allocations[allocations.length - 1].date;

    // Compute reactivated price proportionally from the original plan.
    // Frozen rows still carry the original price + original start/end span.
    const originalPrice = bankedRows[0].price ?? 0;
    const origTotalDays = daysBetweenInclusive(
      bankedRows[0].start_date,
      bankedRows[0].end_date,
    );
    const reactivatedPrice =
      origTotalDays > 0
        ? Math.round((originalPrice * allocations.length) / origTotalDays)
        : 0;

    // Move each banked row to its new (desk_id, date) and clear paused state.
    // Rows are independent, so fire UPDATEs in parallel.
    const results = await Promise.all(
      allocations.map((target, i) =>
        this.client
          .from('desk_bookings')
          .update({
            desk_id: target.deskId,
            date: target.date,
            start_date: newStart,
            end_date: newEnd,
            price: reactivatedPrice,
            is_frozen: false,
            paused_at: null,
          })
          .eq('id', bankedRows[i].id),
      ),
    );
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;

    return { reactivatedCount: allocations.length };
  }

  async getClientPlanBookings(clientId: string): Promise<DeskBooking[]> {
    const numericId = parseInt(clientId, 10);
    const { data, error } = await this.client
      .from('desk_bookings')
      .select('*')
      .eq('client_id', numericId)
      .eq('status', 'assigned')
      .in('plan_type', DEDICATED_PLAN_TYPES)
      .order('date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => this.mapFromDatabase(row));
  }

  async getOrgPlanBookings(): Promise<DeskBooking[]> {
    // Include frozen rows so we can see both active plans and paused (banked) ones.
    const { data, error } = await this.scopeBookingsQuery(
      this.client
        .from('desk_bookings')
        .select('*')
        .eq('status', 'assigned')
        .in('plan_type', DEDICATED_PLAN_TYPES)
        .eq('is_flex', false),
      { includeFrozen: true },
    ).order('date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => this.mapFromDatabase(row));
  }

  async restoreFlexDays(clientId: string, days: number): Promise<Client> {
    const numericId = parseInt(clientId, 10);

    const { error } = await this.client.rpc('decrement_flex_used_days', {
      p_client_id: numericId,
      p_days: days,
    });

    if (error) throw error;

    const refreshed = await this.getClientById(clientId);
    if (!refreshed) throw new Error('Client not found after restore');
    return refreshed;
  }

  private mapClientFromDatabase(row: any): Client {
    return {
      id: String(row.id),
      organizationId: row.organization_id,
      name: row.name,
      contact: row.contact || null,
      email: row.email || null,
      phone: row.phone || null,
      flexActive: row.flex_active || false,
      flexTotalDays: row.flex_total_days || 0,
      flexUsedDays: row.flex_used_days || 0,
      flexStartDate: row.flex_start_date || null,
      bookingToken: row.booking_token || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Share token operations
  async getOrCreateShareToken(
    bookingId: string,
    deskId?: string,
    date?: string,
  ): Promise<string> {
    // Build query - prefer desk_id + date + org lookup (reliable), fall back to numeric ID
    let query = this.client.from('desk_bookings').select('share_token, id');

    if (deskId && date && this.organizationId) {
      query = query
        .eq('desk_id', deskId)
        .eq('date', date)
        .eq('organization_id', this.organizationId);
    } else {
      const numericId = /^\d+$/.test(bookingId)
        ? parseInt(bookingId, 10)
        : this.stringToNumericId(bookingId);
      query = query.eq('id', numericId);
    }

    const { data: existing } = await query.limit(1).single();

    if (existing?.share_token) {
      return existing.share_token;
    }

    if (!existing) {
      throw new Error('Booking not found');
    }

    // Generate new token
    const newToken = crypto.randomUUID();

    const { error } = await this.client
      .from('desk_bookings')
      .update({ share_token: newToken })
      .eq('id', existing.id);
    if (error) {
      console.error('Error setting share token:', error);
      throw new Error('Failed to generate share link');
    }

    return newToken;
  }

  static async getSharedBooking(token: string): Promise<SharedBooking | null> {
    const { data, error } = await supabaseClient.rpc('get_shared_booking', {
      p_token: token,
    });
    if (error || !data) return null;
    return data as SharedBooking;
  }

  static async getPublicAvailability(
    orgSlug: string,
  ): Promise<PublicAvailability | null> {
    const { data, error } = await supabaseClient.rpc(
      'get_public_availability',
      { p_org_slug: orgSlug },
    );
    if (error || !data) return null;
    return data as PublicAvailability;
  }

  static async submitPublicBooking(params: {
    organizationId: string;
    deskId: string;
    date: string;
    visitorName: string;
    visitorEmail: string;
    visitorPhone?: string;
    visitorNotes?: string;
  }): Promise<void> {
    // Build a title with contact info for calendar visibility
    const titleParts: string[] = [];
    if (params.visitorPhone) titleParts.push(params.visitorPhone);
    if (params.visitorNotes) titleParts.push(params.visitorNotes);
    const title = titleParts.length > 0 ? titleParts.join(' | ') : null;

    const { error } = await supabaseClient.from('desk_bookings').insert({
      desk_id: params.deskId,
      date: params.date,
      start_date: params.date,
      end_date: params.date,
      status: 'booked',
      organization_id: params.organizationId,
      visitor_name: params.visitorName,
      visitor_email: params.visitorEmail,
      visitor_phone: params.visitorPhone || null,
      visitor_notes: params.visitorNotes || null,
      person_name: params.visitorName,
      title,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Fire-and-forget Telegram notification
    try {
      await supabaseClient.functions.invoke('notify-public-booking', {
        body: {
          organization_id: params.organizationId,
          visitor_name: params.visitorName,
          visitor_phone: params.visitorPhone || null,
          desk_id: params.deskId,
          date: params.date,
          notes: params.visitorNotes || null,
        },
      });
    } catch {
      // Non-critical — don't block the booking
    }

    // Fire-and-forget email notification to owner
    supabaseClient.functions
      .invoke('notify-public-booking-email', {
        body: {
          organizationId: params.organizationId,
          visitorName: params.visitorName,
          visitorPhone: params.visitorPhone || null,
          deskId: params.deskId,
          date: params.date,
          notes: params.visitorNotes || null,
        },
      })
      .catch(() => {});
  }
}
