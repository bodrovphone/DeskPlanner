import { Desk } from '@shared/schema';

export const DEFAULT_DESKS: Desk[] = [
  { id: 'room1-desk1', room: 1, number: 1, label: 'Room 1, Desk 1' },
  { id: 'room1-desk2', room: 1, number: 2, label: 'Room 1, Desk 2' },
  { id: 'room1-desk3', room: 1, number: 3, label: 'Room 1, Desk 3' },
  { id: 'room1-desk4', room: 1, number: 4, label: 'Room 1, Desk 4' },
  { id: 'room2-desk1', room: 2, number: 5, label: 'Room 2, Desk 5' },
  { id: 'room2-desk2', room: 2, number: 6, label: 'Room 2, Desk 6' },
  { id: 'room2-desk3', room: 2, number: 7, label: 'Room 2, Desk 7' },
  { id: 'room2-desk4', room: 2, number: 8, label: 'Room 2, Desk 8' },
];

export const DESK_COUNT = DEFAULT_DESKS.length;

export function getDeskCount(): number {
  return DEFAULT_DESKS.length;
}
