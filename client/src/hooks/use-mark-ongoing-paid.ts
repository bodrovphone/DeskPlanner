import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/contexts/DataStoreContext';
import { invalidateBookingQueries } from '@/hooks/use-booking-actions';

interface MarkPaidVariables {
  deskId: string;
  clientId: string | null;
  startDate: string;
  endDate: string;
  personName: string;
}

export function useMarkOngoingPaid() {
  const dataStore = useDataStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ deskId, clientId, startDate, endDate }: MarkPaidVariables) => {
      if (!dataStore.markOngoingCyclePaid) {
        throw new Error('Mark-as-paid is not supported by this data store');
      }
      return dataStore.markOngoingCyclePaid({ deskId, clientId, startDate, endDate });
    },
    onSuccess: (result, variables) => {
      invalidateBookingQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Payment recorded',
        description: `${variables.personName}: cycle paid (${result.paidDays} day${result.paidDays === 1 ? '' : 's'}). Next cycle booked through ${result.nextCycleEnd}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to mark as paid',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
