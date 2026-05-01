import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// Re-export the pure URL helpers so existing import sites keep working.
// Tests live next to the implementation in `@/lib/calendarFeedUrls`.
export {
  buildCalendarFeedUrl,
  buildCalendarWebcalUrl,
  type CalendarFeedMode,
} from '@/lib/calendarFeedUrls';

export interface ManagerCalendarSettings {
  token: string;
  alarmEnabled: boolean;
  alarmMinutesBefore: number;
}

export function useManagerCalendarSettings(orgId: string | undefined) {
  const { user } = useAuth();
  return useQuery<ManagerCalendarSettings | null>({
    queryKey: ['manager-calendar-settings', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return null;
      const { data, error } = await supabaseClient
        .from('organization_members')
        .select('calendar_token, calendar_alarm_enabled, calendar_alarm_minutes_before')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        token: data.calendar_token as string,
        alarmEnabled: !!data.calendar_alarm_enabled,
        alarmMinutesBefore: Number(data.calendar_alarm_minutes_before) || 60,
      };
    },
    enabled: !!orgId && !!user?.id,
  });
}

// Backwards-compatible alias used by older callers; just returns the token.
export function useManagerCalendarToken(orgId: string | undefined) {
  const settings = useManagerCalendarSettings(orgId);
  return { ...settings, data: settings.data?.token ?? null };
}

export function useUpdateManagerCalendarAlarm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { orgId: string; enabled: boolean; minutesBefore: number }>({
    mutationFn: async ({ orgId, enabled, minutesBefore }) => {
      if (!user?.id) throw new Error('Not signed in');
      const { error } = await supabaseClient
        .from('organization_members')
        .update({
          calendar_alarm_enabled: enabled,
          calendar_alarm_minutes_before: minutesBefore,
        })
        .eq('organization_id', orgId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['manager-calendar-settings', orgId, user?.id] });
    },
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
