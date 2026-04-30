import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_FUNCTIONS_URL = 'https://rvvunwqizlzlqrhmmera.supabase.co/functions/v1/calendar-feed';

export function buildCalendarFeedUrl(token: string): string {
  return `${SUPABASE_FUNCTIONS_URL}?token=${token}`;
}

export function buildCalendarWebcalUrl(token: string): string {
  return buildCalendarFeedUrl(token).replace(/^https:/, 'webcal:');
}

export function useManagerCalendarToken(orgId: string | undefined) {
  const { user } = useAuth();
  return useQuery<string | null>({
    queryKey: ['manager-calendar-token', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return null;
      const { data, error } = await supabaseClient
        .from('organization_members')
        .select('calendar_token')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.calendar_token as string | null) ?? null;
    },
    enabled: !!orgId && !!user?.id,
  });
}

export function useRegenerateManagerCalendarToken() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<string, Error, { orgId: string }>({
    mutationFn: async ({ orgId }) => {
      if (!user?.id) throw new Error('Not signed in');
      const newToken = crypto.randomUUID();
      const { error } = await supabaseClient
        .from('organization_members')
        .update({ calendar_token: newToken })
        .eq('organization_id', orgId)
        .eq('user_id', user.id);
      if (error) throw error;
      return newToken;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['manager-calendar-token', orgId, user?.id] });
    },
  });
}
