import type { OrgDesk } from '@shared/schema';

/**
 * Group desks by their roomId in a single O(n) pass.
 *
 * Use this instead of calling `desks.filter(d => d.roomId === room.id)` inside
 * a loop over rooms, which is O(rooms × desks) per render.
 */
export function groupDesksByRoom(
  desks: readonly OrgDesk[],
): Map<string, OrgDesk[]> {
  const map = new Map<string, OrgDesk[]>();
  for (const desk of desks) {
    const arr = map.get(desk.roomId);
    if (arr) arr.push(desk);
    else map.set(desk.roomId, [desk]);
  }
  return map;
}
