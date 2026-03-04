import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import DeskCell from '@/components/DeskCell';
import { useSwipe } from '@/hooks/use-mobile';
import { getThreeDayRange, getThreeDayRangeString } from '@/lib/dateUtils';
import { DeskBooking, Desk } from '@shared/schema';
import {
  PlusCircle,
  Map,
  CalendarRange,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MobileCalendarProps {
  desks: Desk[];
  bookings: Record<string, DeskBooking>;
  onDeskClick: (deskId: string, date: string, event?: React.MouseEvent) => void;
  onQuickBook: () => void;
  quickBookDisabled: boolean;
  quickBookLoading: boolean;
  onFloorPlan: () => void;
  onSetAvailability: () => void;
  onExport: () => void;
}

function isToday(dateString: string): boolean {
  return dateString === new Date().toISOString().split('T')[0];
}

function isWeekend(dateString: string): boolean {
  const day = new Date(dateString + 'T00:00:00').getDay();
  return day === 0 || day === 6;
}

const ROOM_COLORS = ['text-blue-600', 'text-pink-600', 'text-emerald-600', 'text-amber-600', 'text-purple-600', 'text-cyan-600'];
const ROOM_BG_COLORS = ['bg-blue-50', 'bg-pink-50', 'bg-emerald-50', 'bg-amber-50', 'bg-purple-50', 'bg-cyan-50'];

export default function MobileCalendar({
  desks,
  bookings,
  onDeskClick,
  onQuickBook,
  quickBookDisabled,
  quickBookLoading,
  onFloorPlan,
  onSetAvailability,
  onExport,
}: MobileCalendarProps) {
  const [offset, setOffset] = useState(0);

  const days = useMemo(() => getThreeDayRange(offset), [offset]);
  const rangeString = useMemo(() => getThreeDayRangeString(offset), [offset]);

  const handleSwipeLeft = useCallback(() => setOffset((o) => o + 1), []);
  const handleSwipeRight = useCallback(() => setOffset((o) => o - 1), []);
  const swipeHandlers = useSwipe(handleSwipeLeft, handleSwipeRight);

  const getBooking = (deskId: string, date: string): DeskBooking | null => {
    return bookings[`${deskId}-${date}`] || null;
  };

  // Group desks by room
  const roomGroups: { room: number; roomName: string; desks: Desk[] }[] = [];
  for (const desk of desks) {
    const last = roomGroups[roomGroups.length - 1];
    if (last && last.room === desk.room) {
      last.desks.push(desk);
    } else {
      roomGroups.push({
        room: desk.room,
        roomName: desk.roomName || `Room ${desk.room}`,
        desks: [desk],
      });
    }
  }

  return (
    <div {...swipeHandlers}>
      {/* Action row */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          onClick={onQuickBook}
          disabled={quickBookDisabled || quickBookLoading}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white touch-manipulation h-10"
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          {quickBookLoading ? 'Loading...' : 'Book'}
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="icon"
          onClick={onFloorPlan}
          className="h-10 w-10 touch-manipulation"
          title="Floor Plan"
        >
          <Map className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onSetAvailability}
          className="h-10 w-10 touch-manipulation"
          title="Set Availability"
        >
          <CalendarRange className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onExport}
          className="h-10 w-10 touch-manipulation"
          title="Export"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-3 bg-white rounded-lg border px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOffset((o) => o - 1)}
          className="h-10 w-10 touch-manipulation"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <span className="text-sm font-medium text-gray-900">{rangeString}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOffset((o) => o + 1)}
          className="h-10 w-10 touch-manipulation"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </Button>
      </div>

      {/* Desk grid */}
      <div className="space-y-3">
        {roomGroups.map((group, groupIdx) => {
          const colorClass = ROOM_COLORS[groupIdx % ROOM_COLORS.length];
          const bgClass = ROOM_BG_COLORS[groupIdx % ROOM_BG_COLORS.length];
          return (
            <div key={group.room} className="space-y-2">
              {/* Room header */}
              <div className={`${bgClass} rounded-lg px-3 py-2`}>
                <span className={`text-xs font-semibold uppercase tracking-wider ${colorClass}`}>
                  {group.roomName}
                </span>
              </div>

              {/* Desks */}
              {group.desks.map((desk) => (
                <div key={desk.id} className="bg-white rounded-lg border overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
                    <span className="text-sm font-semibold text-gray-900">
                      {desk.label
                        ? desk.label.replace(/^.+,\s*/, '')
                        : `Desk ${desk.number}`}
                    </span>
                  </div>
                  {/* 3-column grid */}
                  <div className="grid grid-cols-3">
                    {days.map((day) => {
                      const today = isToday(day.dateString);
                      const weekend = isWeekend(day.dateString);
                      return (
                        <div
                          key={day.dateString}
                          className={`p-1.5 ${
                            today
                              ? 'bg-blue-50 border-x border-blue-200'
                              : weekend
                              ? 'bg-gray-50'
                              : ''
                          }`}
                        >
                          <div className={`text-center mb-1 ${
                            today ? 'text-blue-700' : weekend ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <div className="text-[11px] font-medium">
                              {day.dayName}
                              {today && <span className="ml-1 text-[9px] font-semibold text-blue-600">TODAY</span>}
                            </div>
                            <div className="text-[10px]">{day.fullDate}</div>
                          </div>
                          <DeskCell
                            deskId={desk.id}
                            date={day.dateString}
                            booking={getBooking(desk.id, day.dateString)}
                            onClick={(e) => onDeskClick(desk.id, day.dateString, e)}
                            isWeekend={weekend}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
