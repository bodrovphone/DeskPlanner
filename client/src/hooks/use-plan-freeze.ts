import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/contexts/DataStoreContext';
import { invalidateBookingQueries } from '@/hooks/use-booking-actions';

interface FreezeVariables {
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  pausedAt: string;
}

interface ReactivateVariables {
  clientId: string;
  clientName: string;
  allocations: { deskId: string; date: string }[];
}

export function usePlanFreeze() {
  const dataStore = useDataStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    invalidateBookingQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const freeze = useMutation({
    mutationFn: async ({ clientId, startDate, endDate, pausedAt }: FreezeVariables) => {
      if (!dataStore.freezePlanBooking) {
        throw new Error('Plan freeze is not supported by this data store');
      }
      return dataStore.freezePlanBooking({ clientId, startDate, endDate, pausedAt });
    },
    onSuccess: (result, variables) => {
      invalidateAll();
      toast({
        title: 'Plan paused',
        description:
          result.pausedCount > 0
            ? `${variables.clientName}: ${result.pausedCount} day${result.pausedCount === 1 ? '' : 's'} banked. Reactivate from the Members page.`
            : `${variables.clientName}: no future days in this plan to bank.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Pause failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reactivate = useMutation({
    mutationFn: async ({ clientId, allocations }: ReactivateVariables) => {
      if (!dataStore.reactivatePlan) {
        throw new Error('Reactivate is not supported by this data store');
      }
      return dataStore.reactivatePlan(clientId, allocations);
    },
    onSuccess: (result, variables) => {
      invalidateAll();
      toast({
        title: 'Plan reactivated',
        description: `${variables.clientName}: ${result.reactivatedCount} day${result.reactivatedCount === 1 ? '' : 's'} restored.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Reactivate failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { freeze, reactivate };
}
