import { useQuery } from '@tanstack/react-query';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { MonthlyStats } from '@shared/schema';
import { DEFAULT_WORKING_DAYS } from '@/lib/workingDays';
import { formatLocalDate, formatYMD } from '@/lib/dateUtils';

export interface RevenueHistoryEntry {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  occupancy: number;
  avgPerDay: number;
}

export function useRevenueHistory(monthCount = 6) {
  const dataStore = useDataStore();
  const { currentOrg, legacyDesks } = useOrganization();
  const workingDays = currentOrg?.workingDays ?? DEFAULT_WORKING_DAYS;
  const deskCount = legacyDesks.length || undefined;
  return useQuery({
    queryKey: ['revenue-history', monthCount, workingDays, deskCount],
    queryFn: async (): Promise<RevenueHistoryEntry[]> => {
      const now = new Date();
      const results: RevenueHistoryEntry[] = [];

      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();

        const stats: MonthlyStats = await dataStore.getMonthlyStats(year, month, workingDays, deskCount);

        let totalExpenses = 0;
        if (dataStore.getExpenses) {
          const monthStart = formatYMD(year, month + 1, 1);
          const monthEndStr = formatLocalDate(new Date(year, month + 1, 0));
          const expenses = await dataStore.getExpenses(monthStart, monthEndStr);
          totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        }

        const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        results.push({
          month: label,
          revenue: Math.round(stats.totalRevenue * 100) / 100,
          expenses: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round((stats.totalRevenue - totalExpenses) * 100) / 100,
          occupancy: Math.floor(stats.occupancyRate),
          avgPerDay: Math.round(stats.revenuePerOccupiedDay * 100) / 100,
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
  const { currentOrg, legacyDesks } = useOrganization();
  const workingDays = currentOrg?.workingDays ?? DEFAULT_WORKING_DAYS;
  const deskCount = legacyDesks.length || undefined;
  return useQuery({
    queryKey: ['monthly-stats', year, month, workingDays, deskCount],
    queryFn: () => dataStore.getMonthlyStats(year, month, workingDays, deskCount),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useDateRangeStats(startDate: string, endDate: string) {
  const dataStore = useDataStore();
  const { currentOrg, legacyDesks } = useOrganization();
  const workingDays = currentOrg?.workingDays ?? DEFAULT_WORKING_DAYS;
  const deskCount = legacyDesks.length || undefined;
  return useQuery({
    queryKey: ['date-range-stats', startDate, endDate, workingDays, deskCount],
    queryFn: () => dataStore.getStatsForDateRange(startDate, endDate, workingDays, deskCount),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!startDate && !!endDate,
  });
}
