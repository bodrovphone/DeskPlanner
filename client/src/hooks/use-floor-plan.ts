import { useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { DeskPosition, FloorPlanObject } from '@shared/schema';

// ─── Row mappers ──────────────────────────────────────────────────────────────

export function mapDeskPosition(row: Record<string, unknown>): DeskPosition {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    roomId: row.room_id as string,
    deskId: row.desk_id as string,
    x: row.x as number,
    y: row.y as number,
    w: row.w as number,
    h: row.h as number,
    rotation: row.rotation as number,
  };
}

export function mapFloorPlanObject(row: Record<string, unknown>): FloorPlanObject {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    roomId: row.room_id as string,
    shape: row.shape as FloorPlanObject['shape'],
    x: row.x as number,
    y: row.y as number,
    w: row.w as number,
    h: row.h as number,
    rotation: row.rotation as number,
  };
}

// ─── Public floor plan loader (no auth required) ─────────────────────────────

export interface FloorPlanData {
  positions: DeskPosition[];
  objects: FloorPlanObject[];
  highlightDeskId: string | null;
}

/** Loads floor plan data for the confirmation page. Uses anon key — no auth needed. */
export async function loadPublicFloorPlan(
  orgId: string,
  legacyDeskId: string,
  rooms: { id: string; desks: { deskId: string }[] }[],
): Promise<FloorPlanData | null> {
  const room = rooms.find((r) => r.desks.some((d) => d.deskId === legacyDeskId));
  if (!room) return null;

  const [{ data: deskRow }, { data: orgRow }] = await Promise.all([
    supabaseClient.from('desks').select('id').eq('organization_id', orgId).eq('desk_id', legacyDeskId).single(),
    supabaseClient.from('organizations').select('floor_plan_combined').eq('id', orgId).single(),
  ]);

  const roomIds = (orgRow?.floor_plan_combined ?? false) ? rooms.map((r) => r.id) : [room.id];

  const [{ data: posRows }, { data: objRows }] = await Promise.all([
    supabaseClient.from('desk_positions').select('*').eq('organization_id', orgId).in('room_id', roomIds),
    supabaseClient.from('floor_plan_objects').select('*').eq('organization_id', orgId).in('room_id', roomIds),
  ]);

  const positions = (posRows ?? []).map(mapDeskPosition);
  if (positions.length === 0) return null;

  return {
    positions,
    objects: (objRows ?? []).map(mapFloorPlanObject),
    highlightDeskId: deskRow?.id ?? null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFloorPlan() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const loadRoomLayout = useCallback(async (roomId: string): Promise<{
    positions: DeskPosition[];
    objects: FloorPlanObject[];
  }> => {
    if (!orgId) return { positions: [], objects: [] };

    const [posRes, objRes] = await Promise.all([
      supabaseClient
        .from('desk_positions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('room_id', roomId),
      supabaseClient
        .from('floor_plan_objects')
        .select('*')
        .eq('organization_id', orgId)
        .eq('room_id', roomId),
    ]);

    return {
      positions: (posRes.data ?? []).map(mapDeskPosition),
      objects: (objRes.data ?? []).map(mapFloorPlanObject),
    };
  }, [orgId]);

  /**
   * Full replace: deletes all existing rows for the room, then inserts the
   * current snapshot. Simple and race-condition-free for a single-editor flow.
   */
  const saveRoomLayout = useCallback(async (
    roomId: string,
    positions: DeskPosition[],
    objects: FloorPlanObject[],
  ): Promise<void> => {
    if (!orgId) return;

    // Delete existing rows for this room
    await Promise.all([
      supabaseClient
        .from('desk_positions')
        .delete()
        .eq('organization_id', orgId)
        .eq('room_id', roomId) as unknown as Promise<void>,
      supabaseClient
        .from('floor_plan_objects')
        .delete()
        .eq('organization_id', orgId)
        .eq('room_id', roomId) as unknown as Promise<void>,
    ]);

    // Insert new snapshots (skip if empty)
    const inserts: Promise<unknown>[] = [];

    if (positions.length > 0) {
      inserts.push(
        supabaseClient.from('desk_positions').insert(
          positions.map((p) => ({
            organization_id: orgId,
            room_id: roomId,
            desk_id: p.deskId,
            x: p.x,
            y: p.y,
            w: p.w,
            h: p.h,
            rotation: p.rotation,
          }))
        ) as unknown as Promise<void>
      );
    }

    if (objects.length > 0) {
      inserts.push(
        supabaseClient.from('floor_plan_objects').insert(
          objects.map((o) => ({
            organization_id: orgId,
            room_id: roomId,
            shape: o.shape,
            x: o.x,
            y: o.y,
            w: o.w,
            h: o.h,
            rotation: o.rotation,
          }))
        ) as unknown as Promise<void>
      );
    }

    await Promise.all(inserts);
  }, [orgId]);

  return { loadRoomLayout, saveRoomLayout };
}
