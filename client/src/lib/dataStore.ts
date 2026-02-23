import { DeskBooking, MonthlyStats, Currency, Expense, RecurringExpense } from '@/../../shared/schema';
import { DESK_COUNT } from './deskConfig';

/**
 * Abstract data store interface for desk bookings
 * This interface can be implemented with different storage backends
 * (localStorage, MongoDB, PostgreSQL, etc.)
 */
export interface IDataStore {
  // Basic CRUD operations
  getBooking(deskId: string, date: string): Promise<DeskBooking | null>;
  getAllBookings(startDate?: string, endDate?: string): Promise<Record<string, DeskBooking>>;
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

  getMonthlyStats(year: number, month: number): Promise<MonthlyStats>;
  getStatsForDateRange(startDate: string, endDate: string): Promise<MonthlyStats>;

  // Utility
  clearAllBookings(): Promise<void>;
  
  // Waiting List operations
  getWaitingListEntries?(): Promise<import('@shared/schema').WaitingListEntry[]>;
  saveWaitingListEntry?(entry: import('@shared/schema').WaitingListEntry): Promise<void>;
  deleteWaitingListEntry?(id: string): Promise<void>;

  // Expense operations
  getExpenses?(startDate: string, endDate: string): Promise<Expense[]>;
  saveExpense?(expense: Expense): Promise<void>;
  deleteExpense?(id: string): Promise<void>;

  // Recurring expense operations
  getRecurringExpenses?(): Promise<RecurringExpense[]>;
  saveRecurringExpense?(expense: RecurringExpense): Promise<void>;
  deleteRecurringExpense?(id: string): Promise<void>;
  generateRecurringExpenses?(year: number, month: number): Promise<Expense[]>;
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

  async getAllBookings(startDate?: string, endDate?: string): Promise<Record<string, DeskBooking>> {
    const data = this.getStorageData();

    // If no date range specified, return all bookings
    if (!startDate || !endDate) {
      return data;
    }

    // Filter bookings by date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filteredData: Record<string, DeskBooking> = {};

    for (const [key, booking] of Object.entries(data)) {
      const bookingDate = new Date(booking.date);
      if (bookingDate >= start && bookingDate <= end) {
        filteredData[key] = booking;
      }
    }

    return filteredData;
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
    // Uses DESK_COUNT from deskConfig
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

  async getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    const data = this.getStorageData();
    // Uses DESK_COUNT from deskConfig
    const { getCurrency } = await import('./settings');
    const currency = getCurrency();

    // Calculate month boundaries (month is 0-indexed)
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); // Last day of month

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

    // Track processed bookings to avoid double-counting multi-day bookings
    const processedBookings = new Set<string>();

    let confirmedRevenue = 0;
    let expectedRevenue = 0;
    let occupiedDays = 0;

    // Process bookings
    for (const booking of Object.values(data)) {
      if (!businessDaysInMonth.includes(booking.date)) continue;

      // Count occupied days (each day counts once for occupancy)
      if (booking.status === 'assigned' || booking.status === 'booked') {
        occupiedDays++;
      }

      // For revenue: only process each unique booking once, with pro-rata calculation
      const bookingKey = `${booking.deskId}-${booking.startDate}`;
      if (processedBookings.has(bookingKey)) continue;
      processedBookings.add(bookingKey);

      // Calculate pro-rated revenue for this month
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);

      // Count total business days in the full booking period
      const totalBookingDays = this.countBusinessDays(bookingStart, bookingEnd);

      // Count business days that fall within THIS month
      const effectiveStart = bookingStart > monthStart ? bookingStart : monthStart;
      const effectiveEnd = bookingEnd < monthEnd ? bookingEnd : monthEnd;
      const daysInThisMonth = this.countBusinessDays(effectiveStart, effectiveEnd);

      // Pro-rate the price based on business days
      const bookingPrice = booking.price || 0;
      const proratedPrice = totalBookingDays > 0
        ? (daysInThisMonth / totalBookingDays) * bookingPrice
        : 0;

      if (booking.status === 'assigned') {
        confirmedRevenue += proratedPrice;
      } else if (booking.status === 'booked') {
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
    const data = this.getStorageData();
    // Uses DESK_COUNT from deskConfig
    const { getCurrency } = await import('./settings');
    const currency = getCurrency();

    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);

    // Generate all business days in the range
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
    const processedBookings = new Set<string>();

    let confirmedRevenue = 0;
    let expectedRevenue = 0;
    let occupiedDays = 0;

    for (const booking of Object.values(data)) {
      if (!businessDaysInRange.includes(booking.date)) continue;

      if (booking.status === 'assigned' || booking.status === 'booked') {
        occupiedDays++;
      }

      const bookingKey = `${booking.deskId}-${booking.startDate}`;
      if (processedBookings.has(bookingKey)) continue;
      processedBookings.add(bookingKey);

      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      const totalBookingDays = this.countBusinessDays(bookingStart, bookingEnd);
      const effectiveStart = bookingStart > rangeStart ? bookingStart : rangeStart;
      const effectiveEnd = bookingEnd < rangeEnd ? bookingEnd : rangeEnd;
      const daysInThisRange = this.countBusinessDays(effectiveStart, effectiveEnd);

      const bookingPrice = booking.price || 0;
      const proratedPrice = totalBookingDays > 0
        ? (daysInThisRange / totalBookingDays) * bookingPrice
        : 0;

      if (booking.status === 'assigned') {
        confirmedRevenue += proratedPrice;
      } else if (booking.status === 'booked') {
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

  // Expense operations
  private readonly EXPENSES_KEY = 'coworking-expenses';
  private readonly RECURRING_EXPENSES_KEY = 'coworking-recurring-expenses';

  async getExpenses(startDate: string, endDate: string): Promise<Expense[]> {
    try {
      const data = localStorage.getItem(this.EXPENSES_KEY);
      const expenses: Record<string, Expense> = data ? JSON.parse(data) : {};
      return Object.values(expenses)
        .filter(expense => expense.date >= startDate && expense.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error loading expenses from localStorage:', error);
      return [];
    }
  }

  async saveExpense(expense: Expense): Promise<void> {
    try {
      const data = localStorage.getItem(this.EXPENSES_KEY);
      const expenses: Record<string, Expense> = data ? JSON.parse(data) : {};
      expenses[expense.id] = expense;
      localStorage.setItem(this.EXPENSES_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expense to localStorage:', error);
      throw new Error('Failed to save expense');
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      const data = localStorage.getItem(this.EXPENSES_KEY);
      const expenses: Record<string, Expense> = data ? JSON.parse(data) : {};
      delete expenses[id];
      localStorage.setItem(this.EXPENSES_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error deleting expense from localStorage:', error);
      throw new Error('Failed to delete expense');
    }
  }

  // Recurring expense operations
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    try {
      const data = localStorage.getItem(this.RECURRING_EXPENSES_KEY);
      const expenses: Record<string, RecurringExpense> = data ? JSON.parse(data) : {};
      return Object.values(expenses).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch (error) {
      console.error('Error loading recurring expenses from localStorage:', error);
      return [];
    }
  }

  async saveRecurringExpense(expense: RecurringExpense): Promise<void> {
    try {
      const data = localStorage.getItem(this.RECURRING_EXPENSES_KEY);
      const expenses: Record<string, RecurringExpense> = data ? JSON.parse(data) : {};
      expenses[expense.id] = expense;
      localStorage.setItem(this.RECURRING_EXPENSES_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving recurring expense to localStorage:', error);
      throw new Error('Failed to save recurring expense');
    }
  }

  async deleteRecurringExpense(id: string): Promise<void> {
    try {
      const data = localStorage.getItem(this.RECURRING_EXPENSES_KEY);
      const expenses: Record<string, RecurringExpense> = data ? JSON.parse(data) : {};
      delete expenses[id];
      localStorage.setItem(this.RECURRING_EXPENSES_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error deleting recurring expense from localStorage:', error);
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
        // Check if expense already generated for this recurring template this month
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
}

import { SupabaseDataStore } from './supabaseDataStore';

export function createDataStore(type?: 'localStorage' | 'supabase', organizationId?: string): IDataStore {
  const storageType = type || (import.meta.env.VITE_STORAGE_TYPE as 'localStorage' | 'supabase') || 'localStorage';

  switch (storageType) {
    case 'localStorage':
      return new LocalStorageDataStore();
    case 'supabase':
      try {
        const supabaseStore = new SupabaseDataStore(organizationId);
        if (!supabaseStore.isConfigured()) {
          console.warn('Supabase not configured, falling back to localStorage');
          return new LocalStorageDataStore();
        }
        return supabaseStore;
      } catch (error) {
        console.error('Error initializing Supabase, falling back to localStorage:', error);
        return new LocalStorageDataStore();
      }
    default:
      console.warn(`Unknown data store type: ${storageType}, using localStorage`);
      return new LocalStorageDataStore();
  }
}

// Global data store instance - will use environment variable to determine type
export const dataStore = createDataStore();