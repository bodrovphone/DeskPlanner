import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { NotificationSettings } from '@shared/schema';

function mapSettings(row: Record<string, unknown>): NotificationSettings {
  return {
    id: row.id as number,
    organizationId: row.organization_id as string,
    telegramChatId: row.telegram_chat_id as number | null,
    telegramUsername: row.telegram_username as string | null,
    enabled: row.enabled as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useTelegramSettings(orgId: string | undefined) {
  return useQuery<NotificationSettings | null>({
    queryKey: ['telegram-settings', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data, error } = await supabaseClient
        .from('notification_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return mapSettings(data);
    },
    enabled: !!orgId,
  });
}

export function useConnectTelegram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabaseClient.functions.invoke('telegram-generate-token', {
        body: { organization_id: organizationId },
      });

      if (error) throw error;
      return data as { token: string; botLink: string };
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['telegram-settings', organizationId] });
    },
  });
}

export function useDisconnectTelegram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabaseClient.functions.invoke('telegram-disconnect', {
        body: { organization_id: organizationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['telegram-settings', organizationId] });
    },
  });
}

export function useToggleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, enabled }: { orgId: string; enabled: boolean }) => {
      const { error } = await supabaseClient
        .from('notification_settings')
        .update({ enabled })
        .eq('organization_id', orgId);

      if (error) throw error;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['telegram-settings', orgId] });
    },
  });
}

export function useManualConnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, chatId }: { orgId: string; chatId: number }) => {
      // Upsert notification_settings with the provided chat_id
      const { error } = await supabaseClient
        .from('notification_settings')
        .upsert(
          {
            organization_id: orgId,
            telegram_chat_id: chatId,
            enabled: true,
          },
          { onConflict: 'organization_id' }
        );

      if (error) throw error;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['telegram-settings', orgId] });
    },
  });
}
