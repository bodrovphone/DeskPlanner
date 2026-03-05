import { useQuery } from '@tanstack/react-query';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { MonthlyStats } from '@shared/schema';
import { DEFAULT_WORKING_DAYS } from '@/lib/workingDays';

export interface RevenueHistoryEntry {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export function useRevenueHistory(monthCount = 6) {
  const dataStore = useDataStore();
  const { currentOrg } = useOrganization();
  const workingDays = currentOrg?.workingDays ?? DEFAULT_WORKING_DAYS;
  return useQuery({
    queryKey: ['revenue-history', monthCount, workingDays],
    queryFn: async (): Promise<RevenueHistoryEntry[]> => {
      const now = new Date();
      const results: RevenueHistoryEntry[] = [];

      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();

        const stats: MonthlyStats = await dataStore.getMonthlyStats(year, month, workingDays);

        let totalExpenses = 0;
        if (dataStore.getExpenses) {
          const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
          const monthEnd = new Date(year, month + 1, 0);
          const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
          const expenses = await dataStore.getExpenses(monthStart, monthEndStr);
          totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        }

        const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        results.push({
          month: label,
          revenue: Math.round(stats.totalRevenue * 100) / 100,
          expenses: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round((stats.totalRevenue - totalExpenses) * 100) / 100,
        });
      }

      return results;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useMonthlyStats(year: number, month: number) {
  const dataStore = useDataStore();
  const { currentOrg } = useOrganization();
  const workingDays = currentOrg?.workingDays ?? DEFAULT_WORKING_DAYS;
  return useQuery({
    queryKey: ['monthly-stats', year, month, workingDays],
    queryFn: () => dataStore.getMonthlyStats(year, month, workingDays),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useDateRangeStats(startDate: string, endDate: string) {
  const dataStore = useDataStore();
  const { currentOrg } = useOrganization();
  const workingDays = currentOrg?.workingDays ?? DEFAULT_WORKING_DAYS;
  return useQuery({
    queryKey: ['date-range-stats', startDate, endDate, workingDays],
    queryFn: () => dataStore.getStatsForDateRange(startDate, endDate, workingDays),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!startDate && !!endDate,
  });
}
