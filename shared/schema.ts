import { z } from "zod";

export const deskStatusSchema = z.enum(["available", "booked", "unavailable", "assigned"]);

export const deskBookingSchema = z.object({
  id: z.string(),
  deskId: z.string(),
  date: z.string(), // YYYY-MM-DD format
  status: deskStatusSchema,
  personName: z.string().optional(),
  createdAt: z.string(),
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
