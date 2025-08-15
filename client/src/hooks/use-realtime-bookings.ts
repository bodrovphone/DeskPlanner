import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';

export function useRealtimeBookings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only set up subscription if using Supabase
    const storageType = import.meta.env.VITE_STORAGE_TYPE;
    if (storageType !== 'supabase') {
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not available for real-time subscriptions');
      return;
    }

    console.log('Setting up real-time subscription for desk_bookings');

    // Subscribe to changes in desk_bookings table
    const subscription = supabaseClient
      .channel('desk_bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'desk_bookings'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          // Invalidate relevant queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['desk-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['desk-stats'] });
          queryClient.invalidateQueries({ queryKey: ['next-dates'] });
          
          // Optional: Show toast notification
          // toast({
          //   title: "Data Updated",
          //   description: "Desk bookings have been updated",
          // });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, [queryClient]);
}