import { useQuery } from '@tanstack/react-query';
import { dataStore } from '@/lib/dataStore';

export function useBookings() {
  return useQuery({
    queryKey: ['desk-bookings'],
    queryFn: async () => {
      const [allBookings, dates] = await Promise.all([
        dataStore.getAllBookings(),
        // We need current dates to calculate stats, but let's get them from the component
        Promise.resolve([])
      ]);
      return allBookings;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter than next-dates since this is core data
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useBookingStats(dates: string[]) {
  return useQuery({
    queryKey: ['desk-stats', dates],
    queryFn: () => dataStore.getDeskStats(dates),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: dates.length > 0, // Only run when we have dates
  });
}