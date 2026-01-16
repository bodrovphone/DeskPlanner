import { z } from "zod";

export const deskStatusSchema = z.enum(["available", "booked", "assigned"]);

export const currencySchema = z.enum(["USD", "EUR"]);

export const deskBookingSchema = z.object({
  id: z.string(),
  deskId: z.string(),
  date: z.string(), // YYYY-MM-DD format - for backward compatibility
  startDate: z.string(), // YYYY-MM-DD format
  endDate: z.string(), // YYYY-MM-DD format
  status: deskStatusSchema,
  personName: z.string().optional(),
  title: z.string().optional(), // Booking title/description
  price: z.number().optional(), // Daily price for the booking
  currency: currencySchema.optional(), // Currency for the price
  createdAt: z.string(),
});

export const waitingListEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  preferredDates: z.string(), // Comma-separated date ranges or specific dates
  contactInfo: z.string().optional(), // Phone or email
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const appSettingsSchema = z.object({
  currency: currencySchema.default("USD"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const deskSchema = z.object({
  id: z.string(),
  room: z.number(),
  number: z.number(),
  label: z.string(),
});

export const bulkAvailabilitySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  deskIds: z.array(z.string()),
  status: deskStatusSchema,
});

export type DeskStatus = z.infer<typeof deskStatusSchema>;
export type DeskBooking = z.infer<typeof deskBookingSchema>;
export type Desk = z.infer<typeof deskSchema>;
export type BulkAvailability = z.infer<typeof bulkAvailabilitySchema>;
export type Currency = z.infer<typeof currencySchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type WaitingListEntry = z.infer<typeof waitingListEntrySchema>;

export interface MonthlyStats {
  totalRevenue: number;
  confirmedRevenue: number;
  expectedRevenue: number;
  occupiedDays: number;
  totalDeskDays: number;
  occupancyRate: number;
  revenuePerOccupiedDay: number;
  currency: Currency;
}

// Expense tracking schemas
export const expenseCategorySchema = z.enum(['rent', 'supplies', 'internet', 'bills', 'accountant']);

export const expenseSchema = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD
  amount: z.number().nonnegative(),
  currency: currencySchema,
  category: expenseCategorySchema,
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringExpenseId: z.string().optional(),
  createdAt: z.string(),
});

export const recurringExpenseSchema = z.object({
  id: z.string(),
  amount: z.number().nonnegative(),
  currency: currencySchema,
  category: expenseCategorySchema,
  description: z.string().optional(),
  dayOfMonth: z.number().min(1).max(28).default(1),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
});

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type RecurringExpense = z.infer<typeof recurringExpenseSchema>;
