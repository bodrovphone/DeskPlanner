import { useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { DeskPosition, FloorPlanObject } from '@shared/schema';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapDeskPosition(row: Record<string, unknown>): DeskPosition {
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

function mapFloorPlanObject(row: Record<string, unknown>): FloorPlanObject {
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
