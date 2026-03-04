/**
 * Check if a date falls on a non-working day.
 * @param dateString - Date in YYYY-MM-DD format
 * @param workingDays - Array of ISO 8601 day numbers (1=Monday ... 7=Sunday)
 */
export function isNonWorkingDay(dateString: string, workingDays: number[]): boolean {
  const date = new Date(dateString + 'T00:00:00');
  const jsDay = date.getDay(); // 0=Sunday, 1=Monday ... 6=Saturday
  // Convert JS day (0=Sun) to ISO day (7=Sun)
  const isoDay = jsDay === 0 ? 7 : jsDay;
  return !workingDays.includes(isoDay);
}

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

export const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};
