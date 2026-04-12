import { describe, it, expect } from 'vitest';
import { buildCategoryUsageMap } from './expenseStats';
import type { Expense } from '@shared/schema';

let idCounter = 0;
function makeExpense(overrides: Partial<Expense> & { categoryId: string }): Expense {
  idCounter += 1;
  return {
    id: `exp-${idCounter}`,
    date: '2026-01-01',
    amount: 10,
    currency: 'EUR',
    isRecurring: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildCategoryUsageMap', () => {
  it('returns an empty map when given no expenses', () => {
    const map = buildCategoryUsageMap([]);
    expect(map.size).toBe(0);
  });

  it('counts a single expense', () => {
    const map = buildCategoryUsageMap([makeExpense({ categoryId: 'cat-1' })]);
    expect(map.get('cat-1')).toBe(1);
    expect(map.size).toBe(1);
  });

  it('counts multiple expenses in the same category', () => {
    const map = buildCategoryUsageMap([
      makeExpense({ categoryId: 'cat-1' }),
      makeExpense({ categoryId: 'cat-1' }),
      makeExpense({ categoryId: 'cat-1' }),
    ]);
    expect(map.get('cat-1')).toBe(3);
    expect(map.size).toBe(1);
  });

  it('groups expenses by category independently', () => {
    const map = buildCategoryUsageMap([
      makeExpense({ categoryId: 'cat-1' }),
      makeExpense({ categoryId: 'cat-2' }),
      makeExpense({ categoryId: 'cat-1' }),
      makeExpense({ categoryId: 'cat-3' }),
      makeExpense({ categoryId: 'cat-2' }),
    ]);
    expect(map.get('cat-1')).toBe(2);
    expect(map.get('cat-2')).toBe(2);
    expect(map.get('cat-3')).toBe(1);
    expect(map.size).toBe(3);
  });

  it('returns undefined for categories with no expenses so callers can fall back to 0', () => {
    const map = buildCategoryUsageMap([makeExpense({ categoryId: 'cat-1' })]);
    expect(map.get('cat-never-used')).toBeUndefined();
  });

  it('ignores unrelated fields like amount, currency and isRecurring', () => {
    const map = buildCategoryUsageMap([
      makeExpense({ categoryId: 'cat-1', amount: 0 }),
      makeExpense({ categoryId: 'cat-1', amount: 999, currency: 'USD' }),
      makeExpense({ categoryId: 'cat-1', isRecurring: true }),
    ]);
    expect(map.get('cat-1')).toBe(3);
  });
});
