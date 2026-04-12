import { describe, it, expect } from 'vitest';
import { groupDesksByRoom } from './deskGrouping';
import type { OrgDesk } from '@shared/schema';

let counter = 0;
function makeDesk(overrides: Partial<OrgDesk> & { roomId: string }): OrgDesk {
  counter += 1;
  return {
    id: `desk-${counter}`,
    roomId: overrides.roomId,
    organizationId: 'org-1',
    label: `Desk ${counter}`,
    deskId: `legacy-${counter}`,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('groupDesksByRoom', () => {
  it('returns an empty map when given no desks', () => {
    const map = groupDesksByRoom([]);
    expect(map.size).toBe(0);
  });

  it('groups a single desk', () => {
    const map = groupDesksByRoom([makeDesk({ roomId: 'room-1' })]);
    expect(map.size).toBe(1);
    expect(map.get('room-1')!.length).toBe(1);
  });

  it('groups multiple desks in the same room', () => {
    const map = groupDesksByRoom([
      makeDesk({ roomId: 'room-1' }),
      makeDesk({ roomId: 'room-1' }),
      makeDesk({ roomId: 'room-1' }),
    ]);
    expect(map.get('room-1')!.length).toBe(3);
    expect(map.size).toBe(1);
  });

  it('groups desks by room independently', () => {
    const map = groupDesksByRoom([
      makeDesk({ roomId: 'room-1' }),
      makeDesk({ roomId: 'room-2' }),
      makeDesk({ roomId: 'room-1' }),
      makeDesk({ roomId: 'room-3' }),
      makeDesk({ roomId: 'room-2' }),
    ]);
    expect(map.get('room-1')!.length).toBe(2);
    expect(map.get('room-2')!.length).toBe(2);
    expect(map.get('room-3')!.length).toBe(1);
    expect(map.size).toBe(3);
  });

  it('returns undefined for rooms with no desks', () => {
    const map = groupDesksByRoom([makeDesk({ roomId: 'room-1' })]);
    expect(map.get('room-empty')).toBeUndefined();
  });

  it('preserves desk objects by reference', () => {
    const desk = makeDesk({ roomId: 'room-1', label: 'Special Desk' });
    const map = groupDesksByRoom([desk]);
    expect(map.get('room-1')![0]).toBe(desk);
  });
});
