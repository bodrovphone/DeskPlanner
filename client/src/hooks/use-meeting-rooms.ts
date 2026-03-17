import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { MeetingRoom } from '@shared/schema';

function mapMeetingRoom(row: Record<string, unknown>): MeetingRoom {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    capacity: row.capacity as number,
    hourlyRate: row.hourly_rate as number,
    currency: row.currency as string,
    amenities: (row.amenities as string[]) || [],
    sortOrder: row.sort_order as number,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  };
}

export function useMeetingRooms(orgId: string | undefined) {
  return useQuery<MeetingRoom[]>({
    queryKey: ['meeting-rooms', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabaseClient
        .from('meeting_rooms')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []).map(mapMeetingRoom);
    },
    enabled: !!orgId,
  });
}

export function useCreateMeetingRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      orgId: string;
      name: string;
      capacity: number;
      hourlyRate: number;
      currency: string;
      amenities: string[];
      sortOrder: number;
    }) => {
      const { data, error } = await supabaseClient
        .from('meeting_rooms')
        .insert({
          organization_id: input.orgId,
          name: input.name,
          capacity: input.capacity,
          hourly_rate: input.hourlyRate,
          currency: input.currency,
          amenities: input.amenities,
          sort_order: input.sortOrder,
        })
        .select()
        .single();
      if (error) throw error;
      return mapMeetingRoom(data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-rooms', vars.orgId] });
    },
  });
}

export function useUpdateMeetingRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      orgId: string;
      name?: string;
      capacity?: number;
      hourlyRate?: number;
      amenities?: string[];
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.capacity !== undefined) updates.capacity = input.capacity;
      if (input.hourlyRate !== undefined) updates.hourly_rate = input.hourlyRate;
      if (input.amenities !== undefined) updates.amenities = input.amenities;
      const { error } = await supabaseClient
        .from('meeting_rooms')
        .update(updates)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-rooms', vars.orgId] });
    },
  });
}

export function useDeleteMeetingRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await supabaseClient
        .from('meeting_rooms')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-rooms', vars.orgId] });
    },
  });
}
