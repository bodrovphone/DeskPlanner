import { describe, it, expect } from 'vitest';
import { formatLocalDate, formatYMD } from './dateUtils';

describe('formatLocalDate', () => {
  it('formats a regular local date as YYYY-MM-DD', () => {
    expect(formatLocalDate(new Date(2025, 5, 15))).toBe('2025-06-15');
  });

  it('zero-pads single-digit months', () => {
    expect(formatLocalDate(new Date(2025, 0, 15))).toBe('2025-01-15');
    expect(formatLocalDate(new Date(2025, 8, 15))).toBe('2025-09-15');
  });

  it('zero-pads single-digit days', () => {
    expect(formatLocalDate(new Date(2025, 5, 1))).toBe('2025-06-01');
    expect(formatLocalDate(new Date(2025, 5, 9))).toBe('2025-06-09');
  });

  it('handles first day of year', () => {
    expect(formatLocalDate(new Date(2025, 0, 1))).toBe('2025-01-01');
  });

  it('handles last day of year', () => {
    expect(formatLocalDate(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('handles leap day', () => {
    expect(formatLocalDate(new Date(2024, 1, 29))).toBe('2024-02-29');
  });

  it('uses local components, not UTC', () => {
    // Near-midnight local dates would shift a day if formatted via toISOString()
    const lateNight = new Date(2025, 5, 15, 23, 59, 59);
    expect(formatLocalDate(lateNight)).toBe('2025-06-15');
    const earlyMorning = new Date(2025, 5, 15, 0, 0, 1);
    expect(formatLocalDate(earlyMorning)).toBe('2025-06-15');
  });
});

describe('formatYMD', () => {
  it('composes YYYY-MM-DD from numeric inputs', () => {
    expect(formatYMD(2025, 6, 15)).toBe('2025-06-15');
  });

  it('zero-pads single-digit months and days', () => {
    expect(formatYMD(2025, 1, 1)).toBe('2025-01-01');
    expect(formatYMD(2025, 9, 9)).toBe('2025-09-09');
  });

  it('accepts double-digit months and days without extra padding', () => {
    expect(formatYMD(2025, 12, 31)).toBe('2025-12-31');
    expect(formatYMD(2025, 10, 25)).toBe('2025-10-25');
  });

  it('uses 1-based month (January is 1, not 0)', () => {
    expect(formatYMD(2025, 1, 15)).toBe('2025-01-15');
    expect(formatYMD(2025, 12, 15)).toBe('2025-12-15');
  });
});
