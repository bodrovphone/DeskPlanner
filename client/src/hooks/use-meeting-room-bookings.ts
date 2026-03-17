import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { MeetingRoomBooking } from '@shared/schema';

function mapBooking(row: Record<string, unknown>): MeetingRoomBooking {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    meetingRoomId: row.meeting_room_id as string,
    date: row.date as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    personName: row.person_name as string | undefined,
    title: row.title as string | undefined,
    price: row.price as number | undefined,
    currency: row.currency as string | undefined,
    status: row.status as MeetingRoomBooking['status'],
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  };
}

export function useMeetingRoomBookings(orgId: string | undefined, date: string) {
  return useQuery<MeetingRoomBooking[]>({
    queryKey: ['meeting-room-bookings', orgId, date],
    queryFn: async () => {
      if (!orgId || !date) return [];
      const { data, error } = await supabaseClient
        .from('meeting_room_bookings')
        .select('*')
        .eq('organization_id', orgId)
        .eq('date', date)
        .neq('status', 'cancelled')
        .order('start_time');
      if (error) throw error;
      return (data || []).map(mapBooking);
    },
    enabled: !!orgId && !!date,
  });
}

export function useMeetingRoomBookingsRange(orgId: string | undefined, startDate: string, endDate: string) {
  return useQuery<MeetingRoomBooking[]>({
    queryKey: ['meeting-room-bookings-range', orgId, startDate, endDate],
    queryFn: async () => {
      if (!orgId || !startDate || !endDate) return [];
      const { data, error } = await supabaseClient
        .from('meeting_room_bookings')
        .select('*')
        .eq('organization_id', orgId)
        .gte('date', startDate)
        .lte('date', endDate)
        .neq('status', 'cancelled');
      if (error) throw error;
      return (data || []).map(mapBooking);
    },
    enabled: !!orgId && !!startDate && !!endDate,
  });
}

export function useCreateMeetingRoomBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      orgId: string;
      meetingRoomId: string;
      date: string;
      startTime: string;
      endTime: string;
      personName?: string;
      title?: string;
      price?: number;
      currency?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabaseClient
        .from('meeting_room_bookings')
        .insert({
          organization_id: input.orgId,
          meeting_room_id: input.meetingRoomId,
          date: input.date,
          start_time: input.startTime,
          end_time: input.endTime,
          person_name: input.personName || null,
          title: input.title || null,
          price: input.price ?? null,
          currency: input.currency || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return mapBooking(data);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-room-bookings', vars.orgId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-room-bookings-range', vars.orgId] });
    },
  });
}

export function useUpdateMeetingRoomBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      orgId: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      personName?: string;
      title?: string;
      price?: number;
      notes?: string;
      status?: MeetingRoomBooking['status'];
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.date !== undefined) updates.date = input.date;
      if (input.startTime !== undefined) updates.start_time = input.startTime;
      if (input.endTime !== undefined) updates.end_time = input.endTime;
      if (input.personName !== undefined) updates.person_name = input.personName;
      if (input.title !== undefined) updates.title = input.title;
      if (input.price !== undefined) updates.price = input.price;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.status !== undefined) updates.status = input.status;
      const { error } = await supabaseClient
        .from('meeting_room_bookings')
        .update(updates)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-room-bookings', vars.orgId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-room-bookings-range', vars.orgId] });
    },
  });
}

export function useCancelMeetingRoomBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await supabaseClient
        .from('meeting_room_bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-room-bookings', vars.orgId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-room-bookings-range', vars.orgId] });
    },
  });
}
