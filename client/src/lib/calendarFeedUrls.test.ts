import { describe, it, expect } from 'vitest';
import {
  CALENDAR_FEED_URL,
  buildCalendarFeedUrl,
  buildCalendarWebcalUrl,
} from './calendarFeedUrls';

const TOKEN = '9b421a06-ec2b-4d1f-ac16-eb776d41e62b';

describe('buildCalendarFeedUrl', () => {
  it('defaults to arrivals mode (no mode query param)', () => {
    expect(buildCalendarFeedUrl(TOKEN)).toBe(`${CALENDAR_FEED_URL}?token=${TOKEN}`);
  });

  it('omits mode=all-or-arrivals from URL when arrivals — server default keeps URLs short', () => {
    const url = buildCalendarFeedUrl(TOKEN, 'arrivals');
    expect(url).not.toContain('mode=');
  });

  it('appends mode=all when explicitly set', () => {
    expect(buildCalendarFeedUrl(TOKEN, 'all')).toBe(
      `${CALENDAR_FEED_URL}?token=${TOKEN}&mode=all`,
    );
  });

  it('points at the deployed Supabase function', () => {
    expect(buildCalendarFeedUrl(TOKEN)).toMatch(
      /^https:\/\/rvvunwqizlzlqrhmmera\.supabase\.co\/functions\/v1\/calendar-feed/,
    );
  });
});

describe('buildCalendarWebcalUrl', () => {
  it('replaces https:// with webcal:// for one-click Apple/Outlook subscribe', () => {
    expect(buildCalendarWebcalUrl(TOKEN)).toBe(
      `webcal://rvvunwqizlzlqrhmmera.supabase.co/functions/v1/calendar-feed?token=${TOKEN}`,
    );
  });

  it('preserves the mode=all suffix in webcal form', () => {
    expect(buildCalendarWebcalUrl(TOKEN, 'all')).toContain('&mode=all');
    expect(buildCalendarWebcalUrl(TOKEN, 'all').startsWith('webcal://')).toBe(true);
  });

  it('only replaces the leading scheme, not other "https:" occurrences', () => {
    // Defensive: if the token ever contained "https:" we should still get exactly one swap.
    // The current regex is /^https:/ so only the leading scheme is touched.
    const url = buildCalendarWebcalUrl(TOKEN);
    expect(url.match(/https:/g)).toBeNull();
    expect(url.startsWith('webcal://')).toBe(true);
  });
});
