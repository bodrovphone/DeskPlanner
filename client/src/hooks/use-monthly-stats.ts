import { useQuery } from '@tanstack/react-query';
import { dataStore } from '@/lib/dataStore';

export function useMonthlyStats(year: number, month: number) {
  return useQuery({
    queryKey: ['monthly-stats', year, month],
    queryFn: () => dataStore.getMonthlyStats(year, month),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useDateRangeStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['date-range-stats', startDate, endDate],
    queryFn: () => dataStore.getStatsForDateRange(startDate, endDate),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!startDate && !!endDate,
  });
}
