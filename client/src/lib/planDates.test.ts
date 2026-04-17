import { describe, it, expect } from 'vitest';
import { addDays, addMonths, computePlanEnd, inferPlanFromBooking, allocatePlanDays } from './planDates';

describe('planDates', () => {
  describe('addDays', () => {
    it('adds positive days', () => {
      expect(addDays('2026-03-15', 1)).toBe('2026-03-16');
      expect(addDays('2026-03-15', 6)).toBe('2026-03-21');
    });

    it('subtracts days when negative', () => {
      expect(addDays('2026-03-15', -1)).toBe('2026-03-14');
    });

    it('crosses month boundary', () => {
      expect(addDays('2026-03-31', 1)).toBe('2026-04-01');
    });
  });

  describe('addMonths', () => {
    it('adds one month', () => {
      expect(addMonths('2026-03-15', 1)).toBe('2026-04-15');
    });

    it('clamps to last day of short month (Jan 31 → Feb 28)', () => {
      expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    });
  });

  describe('computePlanEnd', () => {
    it('day_pass returns the same date', () => {
      expect(computePlanEnd('day_pass', '2026-03-15')).toBe('2026-03-15');
    });

    it('weekly returns start + 6 days (7 calendar days inclusive)', () => {
      expect(computePlanEnd('weekly', '2026-03-15')).toBe('2026-03-21');
      expect(computePlanEnd('weekly', '2026-12-30')).toBe('2027-01-05');
    });

    it('monthly returns one calendar month - 1 day', () => {
      expect(computePlanEnd('monthly', '2026-03-15')).toBe('2026-04-14');
      expect(computePlanEnd('monthly', '2026-12-20')).toBe('2027-01-19');
    });

    it('custom / flex return start unchanged (caller manages end)', () => {
      expect(computePlanEnd('custom', '2026-03-15')).toBe('2026-03-15');
      expect(computePlanEnd('flex', '2026-03-15')).toBe('2026-03-15');
    });

    it('empty start date is returned as-is', () => {
      expect(computePlanEnd('weekly', '')).toBe('');
    });
  });

  describe('inferPlanFromBooking', () => {
    it('prefers explicit planType when set', () => {
      expect(inferPlanFromBooking({
        startDate: '2026-03-15', endDate: '2026-03-21', planType: 'weekly',
      })).toBe('weekly');
    });

    it('returns flex when is_flex=true', () => {
      expect(inferPlanFromBooking({
        startDate: '2026-03-15', endDate: '2026-03-15', isFlex: true,
      })).toBe('flex');
    });

    it('returns day_pass for single-day bookings without plan_type', () => {
      expect(inferPlanFromBooking({
        startDate: '2026-03-15', endDate: '2026-03-15',
      })).toBe('day_pass');
    });

    it('returns custom for multi-day legacy bookings without plan_type', () => {
      expect(inferPlanFromBooking({
        startDate: '2026-03-15', endDate: '2026-03-21',
      })).toBe('custom');
    });
  });

  describe('allocatePlanDays', () => {
    const desks = ['d1', 'd2', 'd3'];

    it('places all days on one desk when nothing is busy', () => {
      const result = allocatePlanDays({
        startDate: '2026-03-15',
        bankedDays: 3,
        allDeskIds: desks,
        busyByDate: {},
      });
      expect(result.error).toBeUndefined();
      expect(result.allocations).toEqual([
        { deskId: 'd1', date: '2026-03-15' },
        { deskId: 'd1', date: '2026-03-16' },
        { deskId: 'd1', date: '2026-03-17' },
      ]);
    });

    it('swaps desks on days the preferred one is busy', () => {
      const result = allocatePlanDays({
        startDate: '2026-03-15',
        bankedDays: 3,
        allDeskIds: desks,
        busyByDate: {
          '2026-03-16': new Set(['d1']),
        },
      });
      expect(result.allocations).toEqual([
        { deskId: 'd1', date: '2026-03-15' },
        { deskId: 'd2', date: '2026-03-16' },
        { deskId: 'd2', date: '2026-03-17' },
      ]);
    });

    it('fails if any day has no free desk', () => {
      const result = allocatePlanDays({
        startDate: '2026-03-15',
        bankedDays: 3,
        allDeskIds: desks,
        busyByDate: {
          '2026-03-16': new Set(['d1', 'd2', 'd3']),
        },
      });
      expect(result.allocations).toEqual([]);
      expect(result.error).toContain('2026-03-16');
    });

    it('returns empty allocations for zero banked days', () => {
      const result = allocatePlanDays({
        startDate: '2026-03-15',
        bankedDays: 0,
        allDeskIds: desks,
        busyByDate: {},
      });
      expect(result).toEqual({ allocations: [] });
    });

    it('reports error when no desks configured', () => {
      const result = allocatePlanDays({
        startDate: '2026-03-15',
        bankedDays: 3,
        allDeskIds: [],
        busyByDate: {},
      });
      expect(result.error).toMatch(/No desks configured/);
    });
  });
});
