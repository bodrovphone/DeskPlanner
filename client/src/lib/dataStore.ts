import { DeskBooking, MonthlyStats, Currency, Expense, RecurringExpense } from '@/../../shared/schema';

/**
 * Abstract data store interface for desk bookings
 * This interface can be implemented with different storage backends
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

  getMonthlyStats(year: number, month: number, workingDays?: number[], deskCount?: number): Promise<MonthlyStats>;
  getStatsForDateRange(startDate: string, endDate: string, workingDays?: number[], deskCount?: number): Promise<MonthlyStats>;

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

  // Share token operations
  getOrCreateShareToken?(bookingId: string): Promise<string>;
}

import { SupabaseDataStore } from './supabaseDataStore';

export function createDataStore(organizationId?: string): IDataStore {
  return new SupabaseDataStore(organizationId);
}
