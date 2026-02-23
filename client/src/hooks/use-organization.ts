import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Organization, Room, OrgDesk, OrgMemberRole } from '@shared/schema';

interface OrganizationMembership {
  organization: Organization;
  role: OrgMemberRole;
}

function mapOrg(row: Record<string, unknown>): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    roomsCount: row.rooms_count as number,
    desksPerRoom: row.desks_per_room as number,
    currency: row.currency as Organization['currency'],
    timezone: row.timezone as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRoom(row: Record<string, unknown>): Room {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  };
}

function mapDesk(row: Record<string, unknown>): OrgDesk {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    organizationId: row.organization_id as string,
    label: row.label as string,
    deskId: row.desk_id as string,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  };
}

export function useUserOrganizations() {
  const { user } = useAuth();

  return useQuery<OrganizationMembership[]>({
    queryKey: ['user-organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabaseClient
        .from('organization_members')
        .select('role, organizations(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      if (!data) return [];

      return data.map((row: Record<string, unknown>) => ({
        organization: mapOrg(row.organizations as Record<string, unknown>),
        role: row.role as OrgMemberRole,
      }));
    },
    enabled: !!user,
  });
}

export function useOrganizationRooms(orgId: string | undefined) {
  return useQuery<Room[]>({
    queryKey: ['org-rooms', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabaseClient
        .from('rooms')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order');

      if (error) throw error;
      return (data || []).map(mapRoom);
    },
    enabled: !!orgId,
  });
}

export function useOrganizationDesks(orgId: string | undefined) {
  return useQuery<OrgDesk[]>({
    queryKey: ['org-desks', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabaseClient
        .from('desks')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order');

      if (error) throw error;
      return (data || []).map(mapDesk);
    },
    enabled: !!orgId,
  });
}

interface CreateOrgInput {
  name: string;
  slug: string;
  roomsCount: number;
  desksPerRoom: number;
  currency: string;
  roomNames: string[];
}

export function useCreateOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrgInput) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Create organization
      const { data: org, error: orgError } = await supabaseClient
        .from('organizations')
        .insert({
          name: input.name,
          slug: input.slug,
          rooms_count: input.roomsCount,
          desks_per_room: input.desksPerRoom,
          currency: input.currency,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Add current user as owner
      const { error: memberError } = await supabaseClient
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // 3. Create rooms
      const roomInserts = input.roomNames.map((name, i) => ({
        organization_id: org.id,
        name,
        sort_order: i,
      }));

      const { data: rooms, error: roomError } = await supabaseClient
        .from('rooms')
        .insert(roomInserts)
        .select();

      if (roomError) throw roomError;

      // 4. Create desks for each room
      const deskInserts: Record<string, unknown>[] = [];
      for (const room of rooms) {
        for (let d = 0; d < input.desksPerRoom; d++) {
          const roomIndex = rooms.indexOf(room) + 1;
          const deskNum = d + 1;
          deskInserts.push({
            room_id: room.id,
            organization_id: org.id,
            label: `${room.name}, Desk ${deskNum}`,
            desk_id: `room${roomIndex}-desk${deskNum}`,
            sort_order: d,
          });
        }
      }

      const { error: deskError } = await supabaseClient
        .from('desks')
        .insert(deskInserts);

      if (deskError) throw deskError;

      // 5. Claim existing data with NULL organization_id for this user
      // This ensures historical bookings/expenses are preserved when
      // an existing user goes through onboarding for the first time
      const tables = ['desk_bookings', 'waiting_list_entries', 'expenses', 'recurring_expenses'];
      for (const table of tables) {
        await supabaseClient
          .from(table)
          .update({ organization_id: org.id })
          .is('organization_id', null);
      }

      return mapOrg(org);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    },
  });
}

export function useRenameRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, newName }: { roomId: string; newName: string }) => {
      const { error } = await supabaseClient
        .from('rooms')
        .update({ name: newName })
        .eq('id', roomId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    },
  });
}

export function useRenameDesk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deskId, newLabel }: { deskId: string; newLabel: string }) => {
      const { error } = await supabaseClient
        .from('desks')
        .update({ label: newLabel })
        .eq('id', deskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-desks'] });
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    },
  });
}

export function useCheckSlugAvailable() {
  return useMutation({
    mutationFn: async (slug: string): Promise<boolean> => {
      const { data, error } = await supabaseClient
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .limit(1);

      if (error) throw error;
      return !data || data.length === 0;
    },
  });
}
