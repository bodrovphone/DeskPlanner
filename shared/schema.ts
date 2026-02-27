import { z } from "zod";

export const deskStatusSchema = z.enum(["available", "booked", "assigned"]);

export const currencySchema = z.enum(["USD", "EUR", "GBP", "BGN"]);

export const orgMemberRoleSchema = z.enum(["owner", "admin", "member"]);

export const deskBookingSchema = z.object({
  id: z.string(),
  deskId: z.string(),
  date: z.string(), // YYYY-MM-DD format - for backward compatibility
  startDate: z.string(), // YYYY-MM-DD format
  endDate: z.string(), // YYYY-MM-DD format
  status: deskStatusSchema,
  personName: z.string().optional(),
  title: z.string().optional(),
  price: z.number().optional(),
  currency: currencySchema.optional(),
  organizationId: z.string().optional(),
  createdAt: z.string(),
});

export const waitingListEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  preferredDates: z.string(),
  contactInfo: z.string().optional(),
  notes: z.string().optional(),
  organizationId: z.string().optional(),
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
  roomName: z.string().optional(),
});

export const bulkAvailabilitySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  deskIds: z.array(z.string()),
  status: deskStatusSchema,
});

// Multi-tenancy schemas
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  roomsCount: z.number().default(2),
  desksPerRoom: z.number().default(4),
  currency: currencySchema.default("EUR"),
  timezone: z.string().default("Europe/Sofia"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const organizationMemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: orgMemberRoleSchema,
  createdAt: z.string(),
});

export const roomSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  sortOrder: z.number().default(0),
  createdAt: z.string(),
});

export const orgDeskSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  organizationId: z.string(),
  label: z.string(),
  deskId: z.string(), // legacy desk_id like "room1-desk1"
  sortOrder: z.number().default(0),
  createdAt: z.string(),
});

export type DeskStatus = z.infer<typeof deskStatusSchema>;
export type DeskBooking = z.infer<typeof deskBookingSchema>;
export type Desk = z.infer<typeof deskSchema>;
export type BulkAvailability = z.infer<typeof bulkAvailabilitySchema>;
export type Currency = z.infer<typeof currencySchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type WaitingListEntry = z.infer<typeof waitingListEntrySchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export type Room = z.infer<typeof roomSchema>;
export type OrgDesk = z.infer<typeof orgDeskSchema>;
export type OrgMemberRole = z.infer<typeof orgMemberRoleSchema>;

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
  organizationId: z.string().optional(),
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
  organizationId: z.string().optional(),
  createdAt: z.string(),
});

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type RecurringExpense = z.infer<typeof recurringExpenseSchema>;
