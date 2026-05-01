// Pure helpers behind the calendar-feed Edge Function (DES-79).
//
// Lives in `shared/` so it's importable from both Vitest tests (Node) and the
// Edge Function (Deno) — no Deno-specific imports here. The live Edge Function
// currently inlines copies of these for deploy isolation; the canonical
// implementation here is what's tested and what future deploys should pull from.

// ─── RFC 5545 text helpers ────────────────────────────────────────────────

/**
 * Escape a string for an iCalendar TEXT-typed property (SUMMARY, DESCRIPTION,
 * LOCATION). Per RFC 5545 §3.3.11: backslashes, commas, semicolons, and
 * newlines must be escaped. Returns "" for null/undefined.
 */
export function escapeIcsText(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Fold a content line per RFC 5545 §3.1: lines longer than 75 octets are split,
 * with continuation lines starting with a single space. Uses CRLF separators.
 *
 * Note: this implementation counts UTF-16 code units, not octets. For ASCII
 * content the two are equivalent; for multi-byte characters (Cyrillic,
 * accented Latin) lines may end up slightly longer than 75 octets. In practice
 * every major calendar app accepts this — strict octet-counting is more
 * trouble than it prevents.
 */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    const end = Math.min(i + 75, line.length);
    chunks.push((i === 0 ? '' : ' ') + line.slice(i, end));
    i = end;
  }
  return chunks.join('\r\n');
}

// ─── Display helpers ──────────────────────────────────────────────────────

/**
 * Truncate a name to fit calendar grid views. Returns the input unchanged if
 * within the limit; otherwise slices and appends an ellipsis. Trims trailing
 * whitespace before the ellipsis so we don't get "Alex … " strings.
 */
export function truncName(s: string, maxLength = 18): string {
  const trimmed = s.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 1).trimEnd() + '…';
}

/**
 * Convert a "minutes before event" lead time to an RFC 5545 negative duration
 * for VALARM TRIGGER. Picks the most-readable unit:
 *   0       → "-PT0M"      (at event start)
 *   30      → "-PT30M"
 *   60      → "-PT1H"
 *   720     → "-PT12H"
 *   1440    → "-P1D"
 *   2880    → "-P2D"
 * Negative inputs are clamped to "-PT0M" since negative-before-the-event
 * doesn't make sense (would mean after the event).
 */
export function triggerDuration(minutes: number): string {
  if (minutes <= 0) return '-PT0M';
  if (minutes % 1440 === 0) return `-P${minutes / 1440}D`;
  if (minutes % 60 === 0) return `-PT${minutes / 60}H`;
  return `-PT${minutes}M`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────

/**
 * Format a Date as YYYYMMDD using its UTC components. Used for all-day
 * VEVENTs (DTSTART;VALUE=DATE).
 */
export function formatDateBasic(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Format a Date as YYYYMMDDTHHMMSSZ (UTC), used for DTSTAMP and timed VEVENTs.
 */
export function formatDateTimeUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

/**
 * Parse the leading YYYY-MM-DD from a date or datetime string and return
 * YYYYMMDD. Returns null when the input doesn't start with a valid date.
 *   "2026-04-30"            → "20260430"
 *   "2026-04-30T10:00:00Z"  → "20260430"
 *   "garbage"               → null
 *   null                    → null
 */
export function toDateOnly(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}`;
}

/**
 * Add `days` (signed) to a YYYYMMDD date string and return the new YYYYMMDD.
 * Uses UTC to avoid DST surprises around the 24-hour-day boundary.
 */
export function addDaysToDateOnly(yyyymmdd: string, days: number): string {
  const y = Number(yyyymmdd.slice(0, 4));
  const mo = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  const dt = new Date(Date.UTC(y, mo, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDateBasic(dt);
}

/**
 * Convert a YYYYMMDD date string to a Unix epoch day number (days since
 * 1970-01-01 UTC). Used for adjacency checks in run detection.
 */
export function toEpochDay(yyyymmdd: string): number {
  const y = Number(yyyymmdd.slice(0, 4));
  const mo = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  return Math.floor(Date.UTC(y, mo, d) / 86400000);
}

// ─── Run detection ────────────────────────────────────────────────────────

/**
 * A maximal sequence of rows whose `date` values are consecutive calendar days.
 * Same-day duplicates (different desks, same person) are kept inside the same
 * run. The `start` and `end` are YYYYMMDD strings.
 */
export interface Run<T> {
  rows: T[];
  start: string;
  end: string;
}

/**
 * Detect contiguous runs in a date-sorted list of rows. The caller provides a
 * `getDate` that returns the row's date as either a string parseable by
 * `toDateOnly` or null (rows whose date can't be parsed are skipped).
 *
 * - Adjacent days → same run
 * - Same day repeated → same run (kept as multiple rows in `rows`)
 * - Gap of one or more days → new run
 *
 * Used by the calendar-feed arrivals mode to collapse a 30-row monthly plan
 * into one run with two markers (arrival + end) instead of 30 stacked banners.
 */
export function detectRuns<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
): Run<T>[] {
  const runs: Run<T>[] = [];
  let current: T[] = [];
  let lastEpoch: number | null = null;

  const closeRun = () => {
    if (current.length === 0) return;
    runs.push({
      rows: current,
      start: toDateOnly(getDate(current[0]))!,
      end: toDateOnly(getDate(current[current.length - 1]))!,
    });
    current = [];
  };

  for (const row of rows) {
    const day = toDateOnly(getDate(row));
    if (!day) continue;
    const epoch = toEpochDay(day);
    if (lastEpoch !== null && epoch === lastEpoch) {
      current.push(row);
      continue;
    }
    if (lastEpoch !== null && epoch !== lastEpoch + 1) {
      closeRun();
    }
    current.push(row);
    lastEpoch = epoch;
  }
  closeRun();
  return runs;
}
