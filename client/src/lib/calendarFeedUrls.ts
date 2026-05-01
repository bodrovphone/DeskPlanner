// Pure URL builders for the calendar-feed Edge Function (DES-79).
//
// Lives outside the hook module so it's testable without React deps. The hook
// file (`use-calendar-sync.ts`) re-exports these for backwards compatibility.

export const CALENDAR_FEED_URL =
  'https://rvvunwqizlzlqrhmmera.supabase.co/functions/v1/calendar-feed';

export type CalendarFeedMode = 'arrivals' | 'all';

/**
 * Build the https:// iCal feed URL for a given token + mode.
 * 'arrivals' is the server default, so we only append `&mode=all` when
 * overriding to keep URLs minimal.
 */
export function buildCalendarFeedUrl(
  token: string,
  mode: CalendarFeedMode = 'arrivals',
): string {
  const base = `${CALENDAR_FEED_URL}?token=${token}`;
  return mode === 'all' ? `${base}&mode=all` : base;
}

/**
 * Build the webcal:// variant of the feed URL. Apple Calendar and some
 * Outlook clients respond to webcal:// links with a one-click subscribe
 * prompt; HTTPS form is for paste-into-URL flows like Google Calendar.
 */
export function buildCalendarWebcalUrl(
  token: string,
  mode: CalendarFeedMode = 'arrivals',
): string {
  return buildCalendarFeedUrl(token, mode).replace(/^https:/, 'webcal:');
}
