import { DeskBooking, MonthlyStats, Expense, RecurringExpense } from '@shared/schema';
import { IDataStore } from './dataStore';
import { MongoDBDataAPIClient } from './mongodbDataApi';

/**
 * MongoDB implementation of the data store using MongoDB Data API
 */
export class MongoDataStore implements IDataStore {
  private client: MongoDBDataAPIClient;
  private readonly COLLECTION_NAME = 'bookings';
  private readonly DESKS_COLLECTION = 'desks';
  private readonly EXPENSES_COLLECTION = 'expenses';
  private readonly RECURRING_EXPENSES_COLLECTION = 'recurring_expenses';
  private readonly DESK_COUNT = 8; // 2 rooms × 4 desks

  constructor() {
    this.client = new MongoDBDataAPIClient();
    if (!this.client.isConfigured()) {
      throw new Error('MongoDB Data API is not configured. Please set up environment variables.');
    }
  }

  private getBookingKey(deskId: string, date: string): string {
    return `${deskId}-${date}`;
  }

  async getBooking(deskId: string, date: string): Promise<DeskBooking | null> {
    try {
      const booking = await this.client.findOne(this.COLLECTION_NAME, {
        deskId,
        date
      });
      return booking as DeskBooking | null;
    } catch (error) {
      console.error('Error fetching booking from MongoDB:', error);
      return null;
    }
  }

  async getAllBookings(startDate?: string, endDate?: string): Promise<Record<string, DeskBooking>> {
    try {
      // Build query filter - if dates are provided, filter by date range
      const filter: any = {};
      if (startDate && endDate) {
        filter.date = {
          $gte: startDate,
          $lte: endDate
        };
      }

      const bookings = await this.client.find(this.COLLECTION_NAME, filter);
      const bookingMap: Record<string, DeskBooking> = {};

      for (const booking of bookings) {
        const key = this.getBookingKey(booking.deskId, booking.date);
        bookingMap[key] = booking as DeskBooking;
      }

      return bookingMap;
    } catch (error) {
      console.error('Error fetching all bookings from MongoDB:', error);
      return {};
    }
  }

  async saveBooking(booking: DeskBooking): Promise<void> {
    try {
      // Ensure we have the required date fields
      const bookingWithDates = {
        ...booking,
        _id: this.getBookingKey(booking.deskId, booking.date),
        startDate: booking.startDate || booking.date,
        endDate: booking.endDate || booking.date,
        createdAt: booking.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Try to update existing booking, or insert if it doesn't exist
      const existingBooking = await this.client.findOne(this.COLLECTION_NAME, {
        deskId: booking.deskId,
        date: booking.date
      });

      if (existingBooking) {
        await this.client.replaceOne(
          this.COLLECTION_NAME,
          { deskId: booking.deskId, date: booking.date },
          bookingWithDates
        );
      } else {
        await this.client.insertOne(this.COLLECTION_NAME, bookingWithDates);
      }
    } catch (error) {
      console.error('Error saving booking to MongoDB:', error);
      throw new Error('Failed to save booking');
    }
  }

  async deleteBooking(deskId: string, date: string): Promise<void> {
    try {
      await this.client.deleteOne(this.COLLECTION_NAME, {
        deskId,
        date
      });
    } catch (error) {
      console.error('Error deleting booking from MongoDB:', error);
      throw new Error('Failed to delete booking');
    }
  }

  async bulkUpdateBookings(bookings: DeskBooking[]): Promise<void> {
    try {
      // Process bookings in batches for better performance
      const batchSize = 20;
      for (let i = 0; i < bookings.length; i += batchSize) {
        const batch = bookings.slice(i, i + batchSize);
        const promises = batch.map(booking => this.saveBooking(booking));
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Error bulk updating bookings in MongoDB:', error);
      throw new Error('Failed to bulk update bookings');
    }
  }

  async getBookingsForDateRange(startDate: string, endDate: string): Promise<DeskBooking[]> {
    try {
      const bookings = await this.client.find(this.COLLECTION_NAME, {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }, {
        sort: { date: 1, deskId: 1 }
      });
      
      return bookings as DeskBooking[];
    } catch (error) {
      console.error('Error fetching bookings for date range from MongoDB:', error);
      return [];
    }
  }

  async getBookingsForDesk(deskId: string, startDate?: string, endDate?: string): Promise<DeskBooking[]> {
    try {
      const filter: any = { deskId };
      
      if (startDate && endDate) {
        filter.date = {
          $gte: startDate,
          $lte: endDate
        };
      }
      
      const bookings = await this.client.find(this.COLLECTION_NAME, filter, {
        sort: { date: 1 }
      });
      
      return bookings as DeskBooking[];
    } catch (error) {
      console.error('Error fetching bookings for desk from MongoDB:', error);
      return [];
    }
  }

  async getDeskStats(dates: string[]): Promise<{
    available: number;
    assigned: number;
    booked: number;
  }> {
    try {
      const totalSlots = this.DESK_COUNT * dates.length;

      // Fetch all bookings for the given dates
      const bookings = await this.client.find(this.COLLECTION_NAME, {
        date: { $in: dates }
      });

      let assigned = 0;
      let booked = 0;

      for (const booking of bookings) {
        switch (booking.status) {
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
      console.error('Error fetching desk stats from MongoDB:', error);
      // Return default stats on error
      const totalSlots = this.DESK_COUNT * dates.length;
      return { available: totalSlots, assigned: 0, booked: 0 };
    }
  }

  async getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    const { getCurrency } = await import('./settings');
    const currency = getCurrency();

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

    const totalDeskDays = this.DESK_COUNT * businessDaysInMonth.length;

    try {
      const bookings = await this.client.find(this.COLLECTION_NAME, {
        date: { $in: businessDaysInMonth }
      });

      const processedBookings = new Set<string>();
      let confirmedRevenue = 0;
      let expectedRevenue = 0;
      let occupiedDays = 0;

      for (const booking of bookings) {
        // Count occupied days
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
        const totalBookingDays = this.countBusinessDays(bookingStart, bookingEnd);
        const effectiveStart = bookingStart > monthStart ? bookingStart : monthStart;
        const effectiveEnd = bookingEnd < monthEnd ? bookingEnd : monthEnd;
        const daysInThisMonth = this.countBusinessDays(effectiveStart, effectiveEnd);

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
    } catch (error) {
      console.error('Error fetching monthly stats from MongoDB:', error);
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

    const totalDeskDays = this.DESK_COUNT * businessDaysInRange.length;

    try {
      const bookings = await this.client.find(this.COLLECTION_NAME, {
        date: { $in: businessDaysInRange }
      });

      const processedBookings = new Set<string>();
      let confirmedRevenue = 0;
      let expectedRevenue = 0;
      let occupiedDays = 0;

      for (const booking of bookings) {
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
        totalRevenue, confirmedRevenue, expectedRevenue, occupiedDays,
        totalDeskDays, occupancyRate, revenuePerOccupiedDay, currency,
      };
    } catch (error) {
      console.error('Error fetching stats for date range from MongoDB:', error);
      return {
        totalRevenue: 0, confirmedRevenue: 0, expectedRevenue: 0, occupiedDays: 0,
        totalDeskDays, occupancyRate: 0, revenuePerOccupiedDay: 0, currency,
      };
    }
  }

  async clearAllBookings(): Promise<void> {
    try {
      await this.client.deleteMany(this.COLLECTION_NAME, {});
    } catch (error) {
      console.error('Error clearing all bookings from MongoDB:', error);
      throw new Error('Failed to clear all bookings');
    }
  }

  /**
   * Initialize desks collection if not exists
   * This is optional but helps maintain desk metadata
   */
  async initializeDesks(): Promise<void> {
    try {
      const desks = [
        { _id: 'room1-desk1', room: 1, number: 1, label: 'Room 1, Desk 1' },
        { _id: 'room1-desk2', room: 1, number: 2, label: 'Room 1, Desk 2' },
        { _id: 'room1-desk3', room: 1, number: 3, label: 'Room 1, Desk 3' },
        { _id: 'room1-desk4', room: 1, number: 4, label: 'Room 1, Desk 4' },
        { _id: 'room2-desk1', room: 2, number: 1, label: 'Room 2, Desk 1' },
        { _id: 'room2-desk2', room: 2, number: 2, label: 'Room 2, Desk 2' },
        { _id: 'room2-desk3', room: 2, number: 3, label: 'Room 2, Desk 3' },
        { _id: 'room2-desk4', room: 2, number: 4, label: 'Room 2, Desk 4' },
      ];

      // Check if desks already exist
      const existingDesks = await this.client.find(this.DESKS_COLLECTION, {});

      if (existingDesks.length === 0) {
        await this.client.insertMany(this.DESKS_COLLECTION, desks);
        console.log('Initialized desks collection in MongoDB');
      }
    } catch (error) {
      console.error('Error initializing desks:', error);
      // Non-critical error, continue
    }
  }

  // Expense operations
  async getExpenses(startDate: string, endDate: string): Promise<Expense[]> {
    try {
      const expenses = await this.client.find(this.EXPENSES_COLLECTION, {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }, {
        sort: { date: 1 }
      });

      return expenses as Expense[];
    } catch (error) {
      console.error('Error fetching expenses from MongoDB:', error);
      return [];
    }
  }

  async saveExpense(expense: Expense): Promise<void> {
    try {
      const expenseWithId = {
        ...expense,
        _id: expense.id,
        createdAt: expense.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const existingExpense = await this.client.findOne(this.EXPENSES_COLLECTION, { _id: expense.id });

      if (existingExpense) {
        await this.client.replaceOne(
          this.EXPENSES_COLLECTION,
          { _id: expense.id },
          expenseWithId
        );
      } else {
        await this.client.insertOne(this.EXPENSES_COLLECTION, expenseWithId);
      }
    } catch (error) {
      console.error('Error saving expense to MongoDB:', error);
      throw new Error('Failed to save expense');
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      await this.client.deleteOne(this.EXPENSES_COLLECTION, { _id: id });
    } catch (error) {
      console.error('Error deleting expense from MongoDB:', error);
      throw new Error('Failed to delete expense');
    }
  }

  // Recurring expense operations
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    try {
      const expenses = await this.client.find(this.RECURRING_EXPENSES_COLLECTION, {}, {
        sort: { createdAt: 1 }
      });

      return expenses as RecurringExpense[];
    } catch (error) {
      console.error('Error fetching recurring expenses from MongoDB:', error);
      return [];
    }
  }

  async saveRecurringExpense(expense: RecurringExpense): Promise<void> {
    try {
      const expenseWithId = {
        ...expense,
        _id: expense.id,
        createdAt: expense.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const existingExpense = await this.client.findOne(this.RECURRING_EXPENSES_COLLECTION, { _id: expense.id });

      if (existingExpense) {
        await this.client.replaceOne(
          this.RECURRING_EXPENSES_COLLECTION,
          { _id: expense.id },
          expenseWithId
        );
      } else {
        await this.client.insertOne(this.RECURRING_EXPENSES_COLLECTION, expenseWithId);
      }
    } catch (error) {
      console.error('Error saving recurring expense to MongoDB:', error);
      throw new Error('Failed to save recurring expense');
    }
  }

  async deleteRecurringExpense(id: string): Promise<void> {
    try {
      await this.client.deleteOne(this.RECURRING_EXPENSES_COLLECTION, { _id: id });
    } catch (error) {
      console.error('Error deleting recurring expense from MongoDB:', error);
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
}