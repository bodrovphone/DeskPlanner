import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/contexts/DataStoreContext';
import { invalidateBookingQueries } from '@/hooks/use-booking-actions';

interface EndContractVariables {
  deskId: string;
  clientId: string | null;
  startDate: string;
  newEndDate: string;
  personName: string;
}

export function useEndOngoingContract() {
  const dataStore = useDataStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ deskId, clientId, startDate, newEndDate }: EndContractVariables) => {
      if (!dataStore.endOngoingContract) {
        throw new Error('Ending ongoing contracts is not supported by this data store');
      }
      return dataStore.endOngoingContract({ deskId, clientId, startDate, newEndDate });
    },
    onSuccess: (result, variables) => {
      invalidateBookingQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Contract ended',
        description: `${variables.personName}: final day ${result.endedDate}${result.rowsDeleted > 0 ? `, ${result.rowsDeleted} future day${result.rowsDeleted === 1 ? '' : 's'} removed` : ''}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to end contract',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
