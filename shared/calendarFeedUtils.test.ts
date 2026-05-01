import { describe, it, expect } from 'vitest';
import {
  escapeIcsText,
  foldLine,
  truncName,
  triggerDuration,
  formatDateBasic,
  formatDateTimeUtc,
  toDateOnly,
  addDaysToDateOnly,
  toEpochDay,
  detectRuns,
} from './calendarFeedUtils';

describe('escapeIcsText', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(escapeIcsText(null)).toBe('');
    expect(escapeIcsText(undefined)).toBe('');
    expect(escapeIcsText('')).toBe('');
  });

  it('passes through a plain ASCII string', () => {
    expect(escapeIcsText('Alexey arrives at Codeburg')).toBe('Alexey arrives at Codeburg');
  });

  it('escapes commas, semicolons, and backslashes', () => {
    expect(escapeIcsText('foo, bar; baz\\qux')).toBe('foo\\, bar\\; baz\\\\qux');
  });

  it('escapes newlines as literal "\\n"', () => {
    expect(escapeIcsText('line1\nline2')).toBe('line1\\nline2');
  });

  it('preserves Cyrillic and accented Latin characters', () => {
    expect(escapeIcsText('Артемий @ Codeburg')).toBe('Артемий @ Codeburg');
    expect(escapeIcsText('André de Souza')).toBe('André de Souza');
  });

  it('escapes backslashes BEFORE the inserted ones do not double-escape', () => {
    // The escape order matters: backslash first, then the others. Otherwise
    // "\\n" (literal backslash + n) would be turned into "\\\\n" by the
    // newline rule first, then "\\\\\\\\n" by the backslash rule.
    expect(escapeIcsText('a\\nb')).toBe('a\\\\nb');
  });
});

describe('foldLine', () => {
  it('returns short lines unchanged', () => {
    expect(foldLine('SUMMARY:hello')).toBe('SUMMARY:hello');
  });

  it('does not fold a line of exactly 75 chars', () => {
    const s = 'X'.repeat(75);
    expect(foldLine(s)).toBe(s);
  });

  it('folds a 76-char line into two parts with CRLF + leading space', () => {
    const s = 'X'.repeat(76);
    const folded = foldLine(s);
    expect(folded).toBe('X'.repeat(75) + '\r\n ' + 'X');
  });

  it('folds a 200-char line into three parts', () => {
    const s = 'A'.repeat(200);
    const folded = foldLine(s);
    const parts = folded.split('\r\n');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('A'.repeat(75));
    expect(parts[1]).toBe(' ' + 'A'.repeat(75));
    expect(parts[2]).toBe(' ' + 'A'.repeat(50));
  });

  it('does NOT add a leading space to the first chunk', () => {
    const folded = foldLine('B'.repeat(150));
    expect(folded.startsWith(' ')).toBe(false);
  });
});

describe('truncName', () => {
  it('returns short names unchanged', () => {
    expect(truncName('Egor')).toBe('Egor');
    expect(truncName('Alex Bodrov')).toBe('Alex Bodrov');
  });

  it('does not truncate a name of exactly the limit', () => {
    expect(truncName('123456789012345678', 18)).toBe('123456789012345678');
  });

  it('truncates with ellipsis when over the limit', () => {
    expect(truncName('Aleksei Konstantinov', 18)).toBe('Aleksei Konstanti…');
  });

  it('trims trailing whitespace that falls inside the truncation cut', () => {
    // With 9 spaces + 11-char surname, slicing at 10 lands inside the spaces;
    // trimEnd then strips them and we end up with "Aleksei…" (8 chars total).
    expect(truncName('Aleksei         Konstantinov', 11)).toBe('Aleksei…');
  });

  it('trims input whitespace before length check', () => {
    expect(truncName('   Egor   ')).toBe('Egor');
  });

  it('respects custom maxLength (and may end up shorter when a space is trimmed)', () => {
    // slice(0, 7) = "Alexey " → trimEnd → "Alexey" → + "…" = "Alexey…" (7 chars).
    // Output is 7, not 8 — the contract is "at most maxLength," not exactly.
    expect(truncName('Alexey Safonov', 8)).toBe('Alexey…');
  });
});

describe('triggerDuration', () => {
  it('returns -PT0M for zero', () => {
    expect(triggerDuration(0)).toBe('-PT0M');
  });

  it('clamps negative inputs to -PT0M', () => {
    expect(triggerDuration(-30)).toBe('-PT0M');
  });

  it('uses minutes form for sub-hour values', () => {
    expect(triggerDuration(15)).toBe('-PT15M');
    expect(triggerDuration(45)).toBe('-PT45M');
  });

  it('uses hour form for whole-hour values', () => {
    expect(triggerDuration(60)).toBe('-PT1H');
    expect(triggerDuration(720)).toBe('-PT12H');
  });

  it('uses day form for whole-day values', () => {
    expect(triggerDuration(1440)).toBe('-P1D');
    expect(triggerDuration(2880)).toBe('-P2D');
    expect(triggerDuration(10080)).toBe('-P7D');
  });

  it('prefers larger units when both fit', () => {
    // 1440 minutes = 24 hours = 1 day; should pick days
    expect(triggerDuration(1440)).toBe('-P1D');
  });

  it('falls back to minutes for non-aligned values', () => {
    // 90 minutes is 1.5 hours — keep as minutes
    expect(triggerDuration(90)).toBe('-PT90M');
  });
});

describe('formatDateBasic', () => {
  it('formats a UTC date as YYYYMMDD', () => {
    expect(formatDateBasic(new Date(Date.UTC(2026, 3, 27)))).toBe('20260427');
  });

  it('zero-pads single-digit months and days', () => {
    expect(formatDateBasic(new Date(Date.UTC(2026, 0, 1)))).toBe('20260101');
    expect(formatDateBasic(new Date(Date.UTC(2026, 8, 9)))).toBe('20260909');
  });
});

describe('formatDateTimeUtc', () => {
  it('formats a UTC datetime as YYYYMMDDTHHMMSSZ', () => {
    expect(formatDateTimeUtc(new Date(Date.UTC(2026, 3, 27, 10, 30, 45)))).toBe(
      '20260427T103045Z',
    );
  });

  it('zero-pads all components', () => {
    expect(formatDateTimeUtc(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)))).toBe(
      '20260101T000000Z',
    );
  });
});

describe('toDateOnly', () => {
  it('returns null for null/undefined/empty', () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeNull();
    expect(toDateOnly('')).toBeNull();
  });

  it('parses YYYY-MM-DD into YYYYMMDD', () => {
    expect(toDateOnly('2026-04-30')).toBe('20260430');
  });

  it('parses an ISO datetime into the date part only', () => {
    expect(toDateOnly('2026-04-30T10:00:00Z')).toBe('20260430');
    expect(toDateOnly('2026-04-30T23:59:59.999+02:00')).toBe('20260430');
  });

  it('returns null for non-date strings', () => {
    expect(toDateOnly('not a date')).toBeNull();
    expect(toDateOnly('20260430')).toBeNull(); // missing dashes
    expect(toDateOnly('2026-4-30')).toBeNull(); // missing zero-padding
  });
});

describe('addDaysToDateOnly', () => {
  it('adds positive days within the same month', () => {
    expect(addDaysToDateOnly('20260427', 3)).toBe('20260430');
  });

  it('crosses month boundaries', () => {
    expect(addDaysToDateOnly('20260430', 1)).toBe('20260501');
    expect(addDaysToDateOnly('20260430', 2)).toBe('20260502');
  });

  it('crosses year boundaries', () => {
    expect(addDaysToDateOnly('20261231', 1)).toBe('20270101');
  });

  it('handles negative days (subtracts)', () => {
    expect(addDaysToDateOnly('20260501', -1)).toBe('20260430');
    expect(addDaysToDateOnly('20260101', -1)).toBe('20251231');
  });

  it('returns the same date when adding 0 days', () => {
    expect(addDaysToDateOnly('20260427', 0)).toBe('20260427');
  });

  it('correctly handles leap day', () => {
    expect(addDaysToDateOnly('20240228', 1)).toBe('20240229');
    expect(addDaysToDateOnly('20240229', 1)).toBe('20240301');
  });
});

describe('toEpochDay', () => {
  it('returns 0 for the Unix epoch', () => {
    expect(toEpochDay('19700101')).toBe(0);
  });

  it('returns 1 for the day after the epoch', () => {
    expect(toEpochDay('19700102')).toBe(1);
  });

  it('produces consecutive integers for adjacent days', () => {
    const a = toEpochDay('20260427');
    const b = toEpochDay('20260428');
    expect(b - a).toBe(1);
  });

  it('produces a gap of N for dates N days apart', () => {
    expect(toEpochDay('20260501') - toEpochDay('20260427')).toBe(4);
  });
});

describe('detectRuns', () => {
  type Row = { id: number; date: string };
  const getDate = (r: Row) => r.date;

  it('returns empty array for empty input', () => {
    expect(detectRuns<Row>([], getDate)).toEqual([]);
  });

  it('groups consecutive days into one run', () => {
    const rows: Row[] = [
      { id: 1, date: '2026-04-27' },
      { id: 2, date: '2026-04-28' },
      { id: 3, date: '2026-04-29' },
    ];
    const runs = detectRuns(rows, getDate);
    expect(runs).toHaveLength(1);
    expect(runs[0].start).toBe('20260427');
    expect(runs[0].end).toBe('20260429');
    expect(runs[0].rows).toHaveLength(3);
  });

  it('splits on a gap of one or more days', () => {
    const rows: Row[] = [
      { id: 1, date: '2026-04-27' },
      { id: 2, date: '2026-04-28' },
      // gap (no Apr 29 / 30)
      { id: 3, date: '2026-05-01' },
      { id: 4, date: '2026-05-02' },
    ];
    const runs = detectRuns(rows, getDate);
    expect(runs).toHaveLength(2);
    expect(runs[0].start).toBe('20260427');
    expect(runs[0].end).toBe('20260428');
    expect(runs[1].start).toBe('20260501');
    expect(runs[1].end).toBe('20260502');
  });

  it('keeps same-day duplicates inside the same run', () => {
    // Real-world scenario: one person booked two desks for the same day
    const rows: Row[] = [
      { id: 1, date: '2026-04-27' },
      { id: 2, date: '2026-04-27' }, // same day, different desk
      { id: 3, date: '2026-04-28' },
    ];
    const runs = detectRuns(rows, getDate);
    expect(runs).toHaveLength(1);
    expect(runs[0].rows).toHaveLength(3);
    expect(runs[0].start).toBe('20260427');
    expect(runs[0].end).toBe('20260428');
  });

  it('handles a single-day run', () => {
    const rows: Row[] = [{ id: 1, date: '2026-04-27' }];
    const runs = detectRuns(rows, getDate);
    expect(runs).toHaveLength(1);
    expect(runs[0].start).toBe('20260427');
    expect(runs[0].end).toBe('20260427');
  });

  it('skips rows with unparseable dates', () => {
    const rows: Row[] = [
      { id: 1, date: '2026-04-27' },
      { id: 2, date: 'garbage' },
      { id: 3, date: '2026-04-28' },
    ];
    const runs = detectRuns(rows, getDate);
    expect(runs).toHaveLength(1);
    expect(runs[0].rows).toHaveLength(2); // garbage row dropped
  });

  it('handles a 30-day monthly plan as one run (the v2→v3 fix)', () => {
    // Regression: monthly plans store one row per day. v1 emitted one
    // multi-day event per row; v3 collapses them into one run with two
    // markers (arrival + end).
    const rows: Row[] = [];
    for (let day = 1; day <= 30; day++) {
      rows.push({ id: day, date: `2026-05-${String(day).padStart(2, '0')}` });
    }
    const runs = detectRuns(rows, getDate);
    expect(runs).toHaveLength(1);
    expect(runs[0].rows).toHaveLength(30);
    expect(runs[0].start).toBe('20260501');
    expect(runs[0].end).toBe('20260530');
  });

  it('crosses month boundaries inside a run', () => {
    const rows: Row[] = [
      { id: 1, date: '2026-04-29' },
      { id: 2, date: '2026-04-30' },
      { id: 3, date: '2026-05-01' },
      { id: 4, date: '2026-05-02' },
    ];
    const runs = detectRuns(rows, getDate);
    expect(runs).toHaveLength(1);
    expect(runs[0].start).toBe('20260429');
    expect(runs[0].end).toBe('20260502');
  });

  it('models a flex member who takes Wed off as two runs', () => {
    // Realistic flex pattern: Mon, Tue, (skip Wed), Thu, Fri
    const rows: Row[] = [
      { id: 1, date: '2026-04-27' }, // Mon
      { id: 2, date: '2026-04-28' }, // Tue
      // Wed off
      { id: 3, date: '2026-04-30' }, // Thu
      { id: 4, date: '2026-05-01' }, // Fri
    ];
    const runs = detectRuns(rows, getDate);
    expect(runs).toHaveLength(2);
    expect(runs[0].start).toBe('20260427');
    expect(runs[0].end).toBe('20260428');
    expect(runs[1].start).toBe('20260430');
    expect(runs[1].end).toBe('20260501');
  });

  it('accepts an arbitrary date accessor', () => {
    type Booking = { bookingId: number; bookingDate: string };
    const rows: Booking[] = [
      { bookingId: 1, bookingDate: '2026-04-27' },
      { bookingId: 2, bookingDate: '2026-04-28' },
    ];
    const runs = detectRuns(rows, (r) => r.bookingDate);
    expect(runs).toHaveLength(1);
    expect(runs[0].rows[0].bookingId).toBe(1);
  });
});
