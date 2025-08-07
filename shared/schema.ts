import { z } from "zod";

export const deskStatusSchema = z.enum(["available", "booked", "assigned"]);

export const currencySchema = z.enum(["USD", "EUR", "BGN"]);

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
