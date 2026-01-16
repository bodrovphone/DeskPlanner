import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataStore } from '@/lib/dataStore';
import { Expense, RecurringExpense } from '@shared/schema';

export function useExpenses(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['expenses', startDate, endDate],
    queryFn: () => dataStore.getExpenses?.(startDate, endDate) ?? Promise.resolve([]),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!startDate && !!endDate,
  });
}

export function useRecurringExpenses() {
  return useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => dataStore.getRecurringExpenses?.() ?? Promise.resolve([]),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSaveExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expense: Expense) => {
      if (!dataStore.saveExpense) {
        return Promise.reject(new Error('saveExpense not implemented'));
      }
      return dataStore.saveExpense(expense);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['date-range-stats'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!dataStore.deleteExpense) {
        return Promise.reject(new Error('deleteExpense not implemented'));
      }
      return dataStore.deleteExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['date-range-stats'] });
    },
  });
}

export function useSaveRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expense: RecurringExpense) => {
      if (!dataStore.saveRecurringExpense) {
        return Promise.reject(new Error('saveRecurringExpense not implemented'));
      }
      return dataStore.saveRecurringExpense(expense);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
  });
}

export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!dataStore.deleteRecurringExpense) {
        return Promise.reject(new Error('deleteRecurringExpense not implemented'));
      }
      return dataStore.deleteRecurringExpense(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
  });
}

export function useGenerateRecurringExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => {
      if (!dataStore.generateRecurringExpenses) {
        return Promise.reject(new Error('generateRecurringExpenses not implemented'));
      }
      return dataStore.generateRecurringExpenses(year, month);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['date-range-stats'] });
    },
  });
}

// Helper hook to get total expenses for a period
export function useMonthlyExpensesTotal(year: number, month: number) {
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { data: expenses, ...rest } = useExpenses(monthStart, monthEnd);

  const total = expenses?.reduce((sum, expense) => sum + expense.amount, 0) ?? 0;

  return {
    ...rest,
    data: {
      expenses: expenses ?? [],
      total,
    },
  };
}
