import { useQuery } from '@tanstack/react-query';
import { useDataStore } from '@/contexts/DataStoreContext';

export function useBookings(startDate?: string, endDate?: string) {
  const dataStore = useDataStore();
  // Create a stable query key based on date range
  const dateRangeKey = startDate && endDate ? `${startDate}_${endDate}` : 'all';

  return useQuery({
    queryKey: ['desk-bookings', dateRangeKey],
    queryFn: async () => {
      return dataStore.getAllBookings(startDate, endDate);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter than next-dates since this is core data
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useBookingStats(dates: string[]) {
  const dataStore = useDataStore();
  // Create a stable query key by sorting dates to avoid duplicate queries
  const sortedDates = [...dates].sort();
  const dateRangeKey = sortedDates.length > 0 ? `${sortedDates[0]}_${sortedDates[sortedDates.length - 1]}_${sortedDates.length}` : 'empty';

  return useQuery({
    queryKey: ['desk-stats', dateRangeKey],
    queryFn: () => dataStore.getDeskStats(sortedDates),
    staleTime: 5 * 60 * 1000, // Increased to 5 minutes for better caching
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: dates.length > 0, // Only run when we have dates
  });
}