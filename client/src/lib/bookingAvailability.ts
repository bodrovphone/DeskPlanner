import type { PublicAvailability } from '@shared/schema';
import { formatLocalDate } from './dateUtils';
import { isNonWorkingDay } from './workingDays';

/**
 * Builds a per-day map of free-desk counts for the booking window [now, now + maxDaysAhead].
 * Used by the public and member self-booking pages to gate calendar selection.
 *
 * `now` is parameterized so callers and tests can freeze the reference date.
 */
export function buildAvailabilityMap(
  availability: PublicAvailability,
  now: Date = new Date(),
): { availabilityMap: Record<string, number>; maxDate: Date } {
  const { org, rooms, bookedSlots } = availability;
  const bookedSet = new Set(bookedSlots.map(s => `${s.deskId}:${s.date}`));
  const allDesks = rooms.flatMap(r => r.desks);
  const totalDesks = allDesks.length;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const map: Record<string, number> = {};
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + org.maxDaysAhead);

  for (let i = 0; i <= org.maxDaysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatLocalDate(d);
    const bookedCount = allDesks.filter(desk => bookedSet.has(`${desk.deskId}:${dateStr}`)).length;
    map[dateStr] = totalDesks - bookedCount;
  }

  return { availabilityMap: map, maxDate };
}

/**
 * Returns true when the given date should be disabled in the booking calendar:
 * out of range, a non-working day, or fully booked.
 */
export function isDateDisabled(params: {
  date: Date;
  today: Date;
  maxDate: Date;
  workingDays: number[];
  availabilityMap: Record<string, number>;
}): boolean {
  const { date, today, maxDate, workingDays, availabilityMap } = params;
  if (date < today || date > maxDate) return true;
  const dateStr = formatLocalDate(date);
  if (isNonWorkingDay(dateStr, workingDays)) return true;
  if ((availabilityMap[dateStr] ?? 0) <= 0) return true;
  return false;
}

/**
 * Picks a random desk that is available (not in `bookedSet`) for the given date.
 * Returns null when no desks are free. RNG is injectable for deterministic tests.
 */
export function pickRandomAvailableDesk<D extends { deskId: string }>(
  desks: D[],
  bookedSet: Set<string>,
  date: string,
  rng: () => number = Math.random,
): D | null {
  const available = desks.filter(desk => !bookedSet.has(`${desk.deskId}:${date}`));
  if (available.length === 0) return null;
  return available[Math.floor(rng() * available.length)];
}

/**
 * Returns the ISO day number (Monday=1 ... Sunday=7) for a JS Date.
 * JS `getDay()` uses Sunday=0, which doesn't align with this project's working-days convention.
 */
export function getIsoDay(date: Date): number {
  const js = date.getDay();
  return js === 0 ? 7 : js;
}
