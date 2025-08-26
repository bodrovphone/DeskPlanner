import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';

export function useRealtimeBookings() {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
          
          // Debounce the invalidation to avoid cascading requests during bulk operations
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          
          debounceRef.current = setTimeout(() => {
            // Use refetch instead of invalidate for more controlled updates
            Promise.all([
              queryClient.refetchQueries({ queryKey: ['desk-bookings'], type: 'active' }),
              queryClient.refetchQueries({ queryKey: ['desk-stats'], type: 'active' }),
              queryClient.refetchQueries({ queryKey: ['next-dates'], type: 'active' })
            ]).catch(error => {
              console.error('Error refetching queries after real-time update:', error);
            });
          }, 500); // 500ms debounce to batch multiple rapid changes
          
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
      
      // Clear any pending debounced calls
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [queryClient]);
}