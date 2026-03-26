import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { OrgMemberRole } from '@shared/schema';

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  role: OrgMemberRole;
  createdAt: string;
}

export function useTeamMembers(orgId: string | undefined) {
  return useQuery<TeamMember[]>({
    queryKey: ['team-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabaseClient
        .from('organization_members')
        .select('id, user_id, role, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      // Fetch emails for all user IDs via the Edge Function or RPC
      // Since we can't query auth.users directly from client, we'll use
      // a workaround: the owner's own email comes from auth context,
      // and for others we store email in a lookup during invite.
      // For now, use the admin API via an edge function or store email on org_members.
      //
      // Pragmatic approach: query the organization_members view that includes email
      // We'll need to create a simple RPC or view for this.
      // For MVP, we call a simple edge function to resolve emails.

      return data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        email: '', // Will be resolved below
        role: row.role as OrgMemberRole,
        createdAt: row.created_at,
      }));
    },
    enabled: !!orgId,
  });
}

export function useTeamMembersWithEmails(orgId: string | undefined) {
  return useQuery<TeamMember[]>({
    queryKey: ['team-members-with-emails', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Use RPC function that joins org_members with auth.users (SECURITY DEFINER)
      const { data, error } = await supabaseClient
        .rpc('get_team_members', { org_id: orgId });

      if (error) throw error;
      if (!data) return [];

      return (data as Array<Record<string, unknown>>).map((row) => ({
        id: row.id as string,
        userId: row.user_id as string,
        email: row.email as string,
        role: row.role as OrgMemberRole,
        createdAt: row.created_at as string,
      }));
    },
    enabled: !!orgId,
  });
}

export function useInviteManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, email }: { organizationId: string; email: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabaseClient.functions.invoke('invite-manager', {
        body: {
          organizationId,
          email: email.toLowerCase().trim(),
          invitedByUserId: user.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members-with-emails', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.organizationId] });
    },
  });
}

export function useRemoveManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, organizationId }: { memberId: string; organizationId: string }) => {
      const { error } = await supabaseClient
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      return { organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members-with-emails', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['team-members', data.organizationId] });
    },
  });
}
