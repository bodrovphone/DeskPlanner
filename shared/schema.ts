import { z } from "zod";

export const deskStatusSchema = z.enum(["available", "booked", "assigned"]);

export const planTypeSchema = z.enum([
  "day_pass",
  "weekly",
  "monthly",
  "custom",
  "flex",
]);
export type PlanType = z.infer<typeof planTypeSchema>;

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO currency code');

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
  shareToken: z.string().uuid().optional(),
  visitorName: z.string().optional(),
  visitorEmail: z.string().optional(),
  visitorPhone: z.string().optional(),
  visitorNotes: z.string().optional(),
  clientId: z.string().optional(),
  isFlex: z.boolean().optional(),
  isFrozen: z.boolean().optional(),
  isOngoing: z.boolean().optional(),
  pausedAt: z.string().nullable().optional(),
  planType: planTypeSchema.nullable().optional(),
  paymentStatus: z.enum(['pending', 'paid', 'refunded', 'failed']).nullable().optional(),
  stripeCheckoutSessionId: z.string().nullable().optional(),
  stripePaymentIntentId: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const sharedBookingSchema = z.object({
  deskId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: deskStatusSchema,
  title: z.string().nullable().optional(),
  spaceName: z.string(),
  roomName: z.string(),
  deskLabel: z.string(),
  expired: z.boolean(),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactTelegram: z.string().nullable().optional(),
  contactViberEnabled: z.boolean().default(false),
  contactWhatsappEnabled: z.boolean().default(false),
});

export type SharedBooking = z.infer<typeof sharedBookingSchema>;

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
  defaultPricePerDay: z.number().default(8),
  timezone: z.string().default("Europe/Sofia"),
  floorPlanUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  workingDays: z.array(z.number()).default([1, 2, 3, 4, 5]),
  publicBookingEnabled: z.boolean().default(false),
  publicBookingMaxDaysAhead: z.number().default(14),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactTelegram: z.string().nullable().optional(),
  contactViberEnabled: z.boolean().default(false),
  contactWhatsappEnabled: z.boolean().default(false),
  flexPlanDays: z.number().nullable().optional(),
  flexPlanPrice: z.number().nullable().optional(),
  weeklyPlanPrice: z.number().nullable().optional(),
  monthlyPlanPrice: z.number().nullable().optional(),
  groupId: z.string().nullable().optional(),
  floorPlanCombined: z.boolean().default(false),
  stripePublishableKey: z.string().nullable().optional(),
  stripePublicBookingPayments: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const organizationGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
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
export type OrganizationGroup = z.infer<typeof organizationGroupSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export type Room = z.infer<typeof roomSchema>;
export type OrgDesk = z.infer<typeof orgDeskSchema>;
export type OrgMemberRole = z.infer<typeof orgMemberRoleSchema>;

// Client (space visitor/member) schema
// TODO: Consider adding more fields as needs become clear. Candidates:
//   - company (text) — for corporate bookings / invoicing
//   - tags (text[]) — e.g. "regular", "corporate", "trial"
//   - notes (text) — free-form notes about the client
//   - balance (numeric) — for flex package day tracking
//   - preferred_desk (text) — desk they usually sit at
//   - membership_type (text) — e.g. "fix", "flexy", "day-pass"
export const paymentMethodTypeSchema = z.enum(['credit_card', 'cash', 'bank_transfer']);
export type PaymentMethodType = z.infer<typeof paymentMethodTypeSchema>;

export const clientSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  contact: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  billingAddress: z.string().nullable().optional(),
  paymentMethodType: paymentMethodTypeSchema.nullable().optional(),
  flexActive: z.boolean().default(false),
  flexTotalDays: z.number().default(0),
  flexUsedDays: z.number().default(0),
  flexStartDate: z.string().nullable().optional(),
  bookingToken: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Client = z.infer<typeof clientSchema>;

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
export const expenseCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isDefault: z.boolean().optional(),
});
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

export const expenseSchema = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD
  amount: z.number().nonnegative(),
  currency: currencySchema,
  categoryId: z.string().uuid(),
  categoryName: z.string().optional(),
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
  categoryId: z.string().uuid(),
  categoryName: z.string().optional(),
  description: z.string().optional(),
  dayOfMonth: z.number().min(1).max(28).default(1),
  isActive: z.boolean().default(true),
  organizationId: z.string().optional(),
  createdAt: z.string(),
});

export type Expense = z.infer<typeof expenseSchema>;
export type RecurringExpense = z.infer<typeof recurringExpenseSchema>;

// Notification schemas
export const notificationSettingsSchema = z.object({
  id: z.number(),
  organizationId: z.string(),
  telegramChatId: z.number().nullable(),
  telegramUsername: z.string().nullable(),
  enabled: z.boolean(),
  emailEnabled: z.boolean(),
  emailDailyDigest: z.boolean(),
  emailBookingAlerts: z.boolean(),
  emailLifecycle: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

// Public booking types
export interface PublicAvailabilityDesk {
  id: string;
  deskId: string;
  label: string;
}

export interface PublicAvailabilityRoom {
  id: string;
  name: string;
  desks: PublicAvailabilityDesk[];
}

export interface PublicAvailability {
  org: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    workingDays: number[];
    maxDaysAhead: number;
    logoUrl: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    contactTelegram: string | null;
    contactViberEnabled: boolean;
    contactWhatsappEnabled: boolean;
    defaultPricePerDay: number;
    stripePublicBookingPayments: boolean;
  };
  rooms: PublicAvailabilityRoom[];
  bookedSlots: { deskId: string; date: string }[];
}

// Floor plan types
export type DeskPosition = {
  id: string;
  organizationId: string;
  roomId: string;
  deskId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

export type FloorPlanObject = {
  id: string;
  organizationId: string;
  roomId: string;
  shape: 'pillar' | 'table' | 'couch' | 'door' | 'window' | 'wc' | 'kitchen' | 'wall';
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

export const publicBookingRequestSchema = z.object({
  orgSlug: z.string(),
  deskId: z.string(),
  date: z.string(),
  visitorName: z.string().min(1, 'Name is required'),
  visitorEmail: z.string().email('Valid email is required'),
  visitorPhone: z.string().optional(),
  visitorNotes: z.string().optional(),
});

export type PublicBookingRequest = z.infer<typeof publicBookingRequestSchema>;

// Meeting room schemas
export const meetingRoomSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  capacity: z.number().default(4),
  hourlyRate: z.number().default(10),
  currency: currencySchema,
  amenities: z.array(z.string()).default([]),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
});
export type MeetingRoom = z.infer<typeof meetingRoomSchema>;

export const meetingRoomBookingSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  meetingRoomId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  personName: z.string().optional(),
  title: z.string().optional(),
  price: z.number().optional(),
  currency: currencySchema.optional(),
  status: z.enum(['booked', 'confirmed', 'cancelled']).default('booked'),
  notes: z.string().optional(),
  createdAt: z.string(),
});
export type MeetingRoomBooking = z.infer<typeof meetingRoomBookingSchema>;
