import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Organization, Room, OrgDesk, OrgMemberRole } from '@shared/schema';

const E2E_EMAILS = ['bodrovphone+e2e@gmail.com'];

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
    defaultPricePerDay: (row.default_price_per_day as number) ?? 8,
    timezone: row.timezone as string,
    floorPlanUrl: (row.floor_plan_url as string) ?? null,
    logoUrl: (row.logo_url as string) ?? null,
    workingDays: (row.working_days as number[]) ?? [1, 2, 3, 4, 5],
    publicBookingEnabled: (row.public_booking_enabled as boolean) ?? false,
    publicBookingMaxDaysAhead: (row.public_booking_max_days_ahead as number) ?? 14,
    contactPhone: (row.contact_phone as string) ?? null,
    contactEmail: (row.contact_email as string) ?? null,
    contactTelegram: (row.contact_telegram as string) ?? null,
    contactViberEnabled: (row.contact_viber_enabled as boolean) ?? false,
    contactWhatsappEnabled: (row.contact_whatsapp_enabled as boolean) ?? false,
    flexPlanDays: (row.flex_plan_days as number) ?? null,
    flexPlanPrice: (row.flex_plan_price as number) ?? null,
    groupId: (row.group_id as string) ?? null,
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
  desksPerRoom: number[];
  currency: string;
  defaultPricePerDay: number;
  roomNames: string[];
  workingDays?: number[];
  meetingRooms?: Array<{ name: string; hourlyRate: number }>;
  hasMultipleLocations?: boolean;
}

export function useCreateOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrgInput) => {
      if (!user) throw new Error('Not authenticated');

      // 0. Create organization group if multi-location
      let groupId: string | null = null;
      if (input.hasMultipleLocations) {
        const { data: group, error: groupError } = await supabaseClient
          .from('organization_groups')
          .insert({
            name: input.name,
            created_by: user.id,
          })
          .select()
          .single();

        if (groupError) throw groupError;
        groupId = group.id;
      }

      // 1. Create organization
      const { data: org, error: orgError } = await supabaseClient
        .from('organizations')
        .insert({
          name: input.name,
          slug: input.slug,
          rooms_count: input.roomsCount,
          desks_per_room: input.desksPerRoom[0],
          currency: input.currency,
          default_price_per_day: input.defaultPricePerDay,
          working_days: input.workingDays ?? [1, 2, 3, 4, 5],
          ...(groupId ? { group_id: groupId } : {}),
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
        const roomIndex = rooms.indexOf(room);
        const deskCount = input.desksPerRoom[roomIndex] ?? 4;
        for (let d = 0; d < deskCount; d++) {
          const deskNum = d + 1;
          deskInserts.push({
            room_id: room.id,
            organization_id: org.id,
            label: `${room.name}, Desk ${deskNum}`,
            desk_id: `room${roomIndex + 1}-desk${deskNum}`,
            sort_order: d,
          });
        }
      }

      const { error: deskError } = await supabaseClient
        .from('desks')
        .insert(deskInserts);

      if (deskError) throw deskError;

      // 5. Create meeting rooms if provided
      if (input.meetingRooms && input.meetingRooms.length > 0) {
        const mrInserts = input.meetingRooms.map((mr, i) => ({
          organization_id: org.id,
          name: mr.name,
          hourly_rate: mr.hourlyRate,
          currency: input.currency,
          sort_order: i,
        }));
        const { error: mrError } = await supabaseClient
          .from('meeting_rooms')
          .insert(mrInserts);
        if (mrError) throw mrError;
      }

      // Fire-and-forget welcome email (skip e2e accounts)
      if (user.email && !E2E_EMAILS.includes(user.email)) {
        supabaseClient.functions.invoke('email-welcome', {
          body: { userId: user.id, organizationName: input.name },
        }).catch(() => {});
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

export function useAddRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      name,
      deskCount,
      sortOrder,
    }: {
      orgId: string;
      name: string;
      deskCount: number;
      sortOrder: number;
    }) => {
      const { data: room, error: roomError } = await supabaseClient
        .from('rooms')
        .insert({ organization_id: orgId, name, sort_order: sortOrder })
        .select()
        .single();

      if (roomError) throw roomError;

      const deskInserts = [];
      for (let d = 0; d < deskCount; d++) {
        const deskNum = d + 1;
        deskInserts.push({
          room_id: room.id,
          organization_id: orgId,
          label: `${name}, Desk ${deskNum}`,
          desk_id: `${room.id}-desk${deskNum}`,
          sort_order: d,
        });
      }

      const { error: deskError } = await supabaseClient
        .from('desks')
        .insert(deskInserts);

      if (deskError) throw deskError;

      return mapRoom(room);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['org-desks'] });
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    },
  });
}

export function useSetRoomDeskCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      orgId,
      roomName,
      targetCount,
      currentDesks,
    }: {
      roomId: string;
      orgId: string;
      roomName: string;
      targetCount: number;
      currentDesks: OrgDesk[];
    }) => {
      const currentCount = currentDesks.length;
      if (targetCount === currentCount) return;

      if (targetCount > currentCount) {
        // Add desks
        const maxSortOrder = currentDesks.reduce((max, d) => Math.max(max, d.sortOrder), -1);
        const deskInserts = [];
        for (let i = 0; i < targetCount - currentCount; i++) {
          const deskNum = currentCount + i + 1;
          deskInserts.push({
            room_id: roomId,
            organization_id: orgId,
            label: `${roomName}, Desk ${deskNum}`,
            desk_id: `${roomId}-desk${deskNum}`,
            sort_order: maxSortOrder + 1 + i,
          });
        }
        const { error } = await supabaseClient.from('desks').insert(deskInserts);
        if (error) throw error;
      } else {
        // Remove desks (highest sort_order first)
        const sorted = [...currentDesks].sort((a, b) => b.sortOrder - a.sortOrder);
        const toRemove = sorted.slice(0, currentCount - targetCount);

        // Check for future bookings on desks being removed
        const deskIds = toRemove.map(d => d.deskId);
        const today = new Date().toISOString().split('T')[0];
        const { data: bookings, error: checkError } = await supabaseClient
          .from('desk_bookings')
          .select('id')
          .eq('organization_id', orgId)
          .in('desk_id', deskIds)
          .gte('date', today)
          .limit(1);

        if (checkError) throw checkError;
        if (bookings && bookings.length > 0) {
          throw new Error('DESKS_HAVE_BOOKINGS');
        }

        const ids = toRemove.map(d => d.id);
        const { error } = await supabaseClient
          .from('desks')
          .delete()
          .in('id', ids);
        if (error) throw error;
      }
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
