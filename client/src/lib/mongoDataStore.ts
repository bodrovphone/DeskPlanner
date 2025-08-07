import { DeskBooking } from '@shared/schema';
import { IDataStore } from './dataStore';
import { MongoDBDataAPIClient } from './mongodbDataApi';

/**
 * MongoDB implementation of the data store using MongoDB Data API
 */
export class MongoDataStore implements IDataStore {
  private client: MongoDBDataAPIClient;
  private readonly COLLECTION_NAME = 'bookings';
  private readonly DESKS_COLLECTION = 'desks';
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

  async getAllBookings(): Promise<Record<string, DeskBooking>> {
    try {
      const bookings = await this.client.find(this.COLLECTION_NAME, {});
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
}