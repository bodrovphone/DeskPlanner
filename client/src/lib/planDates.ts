import dayjs from 'dayjs';
import { PlanType, Organization } from '@shared/schema';

/** Plan types that contribute to a member's dedicated-desk balance. */
export const DEDICATED_PLAN_TYPES: PlanType[] = ['weekly', 'monthly'];

export function daysBetweenInclusive(start: string, end: string): number {
  return dayjs(end).diff(dayjs(start), 'day') + 1;
}

export function addDays(dateStr: string, days: number): string {
  return dayjs(dateStr).add(days, 'day').format('YYYY-MM-DD');
}

export function addMonths(dateStr: string, months: number): string {
  return dayjs(dateStr).add(months, 'month').format('YYYY-MM-DD');
}

/**
 * Compute the inclusive end date for a plan given its start date.
 *   day_pass → same day
 *   weekly   → start + 6 days  (7 calendar days inclusive)
 *   monthly  → start + 1 month − 1 day  (rolling calendar month)
 *   custom / flex → caller manages end date
 */
export function computePlanEnd(
  planKey: PlanType,
  startDate: string,
): string {
  if (!startDate) return startDate;
  switch (planKey) {
    case 'day_pass':
      return startDate;
    case 'weekly':
      return addDays(startDate, 6);
    case 'monthly':
      return addDays(addMonths(startDate, 1), -1);
    case 'custom':
    case 'flex':
    default:
      return startDate;
  }
}

/** Org-configured auto-price for a plan. Null means the plan carries no auto-price. */
export function planAutoPrice(
  planKey: PlanType,
  org: Organization | null | undefined,
): number | null {
  if (!org) return null;
  switch (planKey) {
    case 'day_pass':
      return org.defaultPricePerDay ?? null;
    case 'weekly':
      return org.weeklyPlanPrice ?? null;
    case 'monthly':
      return org.monthlyPlanPrice ?? null;
    default:
      return null;
  }
}

/** Best-effort classification of an existing booking's plan. */
export function inferPlanFromBooking(booking: {
  startDate?: string;
  endDate?: string;
  isFlex?: boolean;
  planType?: PlanType | null;
}): PlanType {
  if (booking.planType) return booking.planType;
  if (booking.isFlex) return 'flex';
  if (booking.startDate && booking.endDate && booking.startDate === booking.endDate) return 'day_pass';
  return 'custom';
}

export function planLabel(planKey: PlanType): string {
  switch (planKey) {
    case 'day_pass': return 'Day pass';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'custom': return 'Custom';
    case 'flex': return 'Flex';
  }
}

export interface AllocationInput {
  startDate: string;
  bankedDays: number;
  allDeskIds: string[];
  /** date (YYYY-MM-DD) -> set of desk ids booked that day. */
  busyByDate: Record<string, Set<string>>;
}

export interface AllocationResult {
  allocations: { deskId: string; date: string }[];
  /** Populated when allocation failed — e.g. "No desks free on 2026-05-20". */
  error?: string;
}

/**
 * Greedy day-by-day contiguous allocation: place `bankedDays` desk-days starting
 * at `startDate`. Prefer the previous day's desk to minimize swaps; fall back to
 * any free desk. Fails fast if any day has zero free desks.
 */
export function allocatePlanDays(input: AllocationInput): AllocationResult {
  const { startDate, bankedDays, allDeskIds, busyByDate } = input;
  if (bankedDays <= 0) return { allocations: [] };
  if (allDeskIds.length === 0) {
    return { allocations: [], error: 'No desks configured for this organization.' };
  }

  const allocations: { deskId: string; date: string }[] = [];
  let cursor = startDate;
  let previous: string | null = null;

  for (let i = 0; i < bankedDays; i++) {
    const busy = busyByDate[cursor] ?? new Set<string>();
    const stickyFree = previous && !busy.has(previous) ? previous : null;
    const pick = stickyFree ?? allDeskIds.find((id) => !busy.has(id));

    if (!pick) {
      return {
        allocations: [],
        error: `No desks free on ${cursor}. Pick a later start date.`,
      };
    }

    allocations.push({ deskId: pick, date: cursor });
    previous = pick;
    cursor = addDays(cursor, 1);
  }

  return { allocations };
}
