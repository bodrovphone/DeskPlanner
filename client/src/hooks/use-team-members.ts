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

export interface GroupTeamMember {
  id: string;
  userId: string;
  email: string;
  role: OrgMemberRole;
  orgIds: string[];
  orgNames: string[];
  createdAt: string;
}

export function useTeamMembersWithEmails(orgId: string | undefined) {
  return useQuery<TeamMember[]>({
    queryKey: ['team-members-with-emails', orgId],
    queryFn: async () => {
      if (!orgId) return [];

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

export function useGroupTeamMembers(groupId: string | undefined) {
  return useQuery<GroupTeamMember[]>({
    queryKey: ['group-team-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabaseClient
        .rpc('get_group_team_members', { p_group_id: groupId });

      if (error) throw error;
      if (!data) return [];

      return (data as Array<Record<string, unknown>>).map((row) => ({
        id: row.member_id as string,
        userId: row.user_id as string,
        email: row.email as string,
        role: row.role as OrgMemberRole,
        orgIds: row.org_ids as string[],
        orgNames: row.org_names as string[],
        createdAt: row.created_at as string,
      }));
    },
    enabled: !!groupId,
  });
}

export function useInviteManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, email, groupId }: { organizationId: string; email: string; groupId?: string }) => {
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

      return { ...data, groupId };
    },
    onSuccess: (data, variables) => {
      if (data.groupId) {
        queryClient.invalidateQueries({ queryKey: ['group-team-members', data.groupId] });
      }
      queryClient.invalidateQueries({ queryKey: ['team-members-with-emails', variables.organizationId] });
    },
  });
}

export function useRemoveManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, organizationId, groupId, orgIds }: {
      userId: string;
      organizationId: string;
      groupId?: string;
      orgIds?: string[];
    }) => {
      // For group members, remove from all orgs in the group
      const targetOrgIds = groupId && orgIds ? orgIds : [organizationId];

      const { error } = await supabaseClient
        .from('organization_members')
        .delete()
        .eq('user_id', userId)
        .in('organization_id', targetOrgIds);

      if (error) throw error;

      return { organizationId, groupId };
    },
    onSuccess: (data) => {
      if (data.groupId) {
        queryClient.invalidateQueries({ queryKey: ['group-team-members', data.groupId] });
      }
      queryClient.invalidateQueries({ queryKey: ['team-members-with-emails', data.organizationId] });
    },
  });
}
