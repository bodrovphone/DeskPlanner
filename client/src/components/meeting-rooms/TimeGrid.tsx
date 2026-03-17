import { Card } from '@/components/ui/card';
import { MeetingRoom, MeetingRoomBooking } from '@shared/schema';
import { currencySymbols } from '@/lib/settings';

// Time slots: 08:00 to 20:00 in 30-min increments (25 slots, last bookable start is 19:30)
const SLOT_COUNT = 24;
const START_HOUR = 8;

function slotLabel(index: number): string {
  const totalMinutes = START_HOUR * 60 + index * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToSlotIndex(isoString: string): number {
  const d = new Date(isoString);
  return (d.getHours() - START_HOUR) * 2 + (d.getMinutes() >= 30 ? 1 : 0);
}

function bookingRowSpan(booking: MeetingRoomBooking): number {
  const diffMs = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
  return Math.max(1, Math.round(diffMs / (30 * 60 * 1000)));
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type SlotState =
  | { type: 'empty' }
  | { type: 'booking_start'; booking: MeetingRoomBooking; rowSpan: number }
  | { type: 'covered' };

const ROOM_COLORS = [
  { header: 'bg-blue-50 text-blue-700', booking: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
  { header: 'bg-pink-50 text-pink-700', booking: 'bg-pink-100 border-pink-300 hover:bg-pink-200' },
  { header: 'bg-emerald-50 text-emerald-700', booking: 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200' },
  { header: 'bg-amber-50 text-amber-700', booking: 'bg-amber-100 border-amber-300 hover:bg-amber-200' },
  { header: 'bg-purple-50 text-purple-700', booking: 'bg-purple-100 border-purple-300 hover:bg-purple-200' },
  { header: 'bg-cyan-50 text-cyan-700', booking: 'bg-cyan-100 border-cyan-300 hover:bg-cyan-200' },
];

interface TimeGridProps {
  rooms: MeetingRoom[];
  bookings: MeetingRoomBooking[];
  onSlotClick: (roomId: string, slot: string) => void;
  onBookingClick: (booking: MeetingRoomBooking) => void;
  currency: string;
}

export default function TimeGrid({ rooms, bookings, onSlotClick, onBookingClick, currency }: TimeGridProps) {
  const currencySymbol = currencySymbols[currency] ?? currency;

  // Precompute slot states per room
  const slotStates: Record<string, SlotState[]> = {};
  for (const room of rooms) {
    const states: SlotState[] = Array.from({ length: SLOT_COUNT }, () => ({ type: 'empty' }));
    const roomBookings = bookings.filter(b => b.meetingRoomId === room.id);

    for (const booking of roomBookings) {
      const startIdx = timeToSlotIndex(booking.startTime);
      const rowSpan = bookingRowSpan(booking);
      if (startIdx >= 0 && startIdx < SLOT_COUNT) {
        states[startIdx] = { type: 'booking_start', booking, rowSpan };
        for (let i = startIdx + 1; i < Math.min(startIdx + rowSpan, SLOT_COUNT); i++) {
          states[i] = { type: 'covered' };
        }
      }
    }
    slotStates[room.id] = states;
  }

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => slotLabel(i));

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-14rem)] overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th className="w-16 min-w-[64px] px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase border-b border-r border-gray-200 sticky left-0 bg-white z-30" />
              {rooms.map((room, idx) => {
                const colors = ROOM_COLORS[idx % ROOM_COLORS.length];
                return (
                  <th
                    key={room.id}
                    className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide min-w-[160px] border-b border-r border-gray-200 ${colors.header}`}
                  >
                    <div>{room.name}</div>
                    <div className="font-normal text-xs opacity-70 mt-0.5">
                      {currencySymbol}{room.hourlyRate}/hr · {room.capacity} seats
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, slotIdx) => {
              const isHour = slotIdx % 2 === 0;
              return (
                <tr key={slot} className={isHour ? 'border-t border-gray-200' : 'border-t border-gray-100'}>
                  {/* Time label */}
                  <td className={`px-2 py-0 text-xs text-gray-400 sticky left-0 bg-white z-10 border-r border-gray-200 h-10 align-top pt-1 ${isHour ? 'font-medium text-gray-600' : ''}`}>
                    {isHour ? slot : ''}
                  </td>
                  {/* Room cells */}
                  {rooms.map((room, roomIdx) => {
                    const state = slotStates[room.id]?.[slotIdx];
                    if (!state || state.type === 'covered') return null;
                    const colors = ROOM_COLORS[roomIdx % ROOM_COLORS.length];

                    if (state.type === 'empty') {
                      return (
                        <td
                          key={room.id}
                          className="border-r border-gray-200 h-10 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => onSlotClick(room.id, slot)}
                        />
                      );
                    }

                    // booking_start
                    const { booking, rowSpan } = state;
                    return (
                      <td
                        key={room.id}
                        rowSpan={rowSpan}
                        className="border-r border-gray-200 p-1 align-top"
                      >
                        <div
                          className={`h-full min-h-[36px] rounded border cursor-pointer p-1.5 transition-colors ${colors.booking}`}
                          onClick={() => onBookingClick(booking)}
                        >
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {booking.personName || booking.title || 'Booking'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(booking.startTime)}–{formatTime(booking.endTime)}
                          </p>
                          {booking.price != null && (
                            <p className="text-xs text-gray-500">{currencySymbol}{booking.price}</p>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
