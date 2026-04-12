import type { Expense } from '@shared/schema';

/**
 * Build a Map from categoryId → number of expenses in that category.
 *
 * Runs in a single O(n) pass over the expenses array. Use this instead of
 * calling `expenses.filter(e => e.categoryId === cat.id).length` inside a
 * loop over categories, which is O(categories × expenses) per render.
 */
export function buildCategoryUsageMap(
  expenses: readonly Expense[],
): Map<string, number> {
  const usage = new Map<string, number>();
  for (const expense of expenses) {
    usage.set(expense.categoryId, (usage.get(expense.categoryId) ?? 0) + 1);
  }
  return usage;
}
