import React, { forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import DeskCell from '@/components/bookings/DeskCell';
import { DeskBooking, Desk } from '@shared/schema';
import { isNonWorkingDay, DEFAULT_WORKING_DAYS } from '@/lib/workingDays';

interface DateInfo {
  dateString: string;
  dayName: string;
  fullDate: string;
}

interface DeskGridProps {
  desks: Desk[];
  currentDates: DateInfo[];
  bookings: Record<string, DeskBooking>;
  onDeskClick: (deskId: string, date: string, event?: React.MouseEvent, booking?: DeskBooking | null) => void;
  workingDays?: number[];
}

function isToday(dateString: string): boolean {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  return dateString === todayString;
}

const ROOM_COLORS = ['text-blue-600', 'text-pink-600', 'text-emerald-600', 'text-amber-600', 'text-purple-600', 'text-cyan-600', 'text-rose-600', 'text-teal-600', 'text-orange-600', 'text-indigo-600', 'text-lime-600', 'text-fuchsia-600'];
const ROOM_BG_COLORS = ['bg-blue-50', 'bg-pink-50', 'bg-emerald-50', 'bg-amber-50', 'bg-purple-50', 'bg-cyan-50', 'bg-rose-50', 'bg-teal-50', 'bg-orange-50', 'bg-indigo-50', 'bg-lime-50', 'bg-fuchsia-50'];

const DeskGrid = forwardRef<HTMLDivElement, DeskGridProps>(
  ({ desks, currentDates, bookings, onDeskClick, workingDays = DEFAULT_WORKING_DAYS }, ref) => {
    const getBookingForCell = (deskId: string, date: string): DeskBooking | null => {
      const key = `${deskId}-${date}`;
      return bookings[key] || null;
    };

    // Group desks by room number
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

    const dateHeaderCells = currentDates.map((day) => {
      const isTodayColumn = isToday(day.dateString);
      const isNonWorking = isNonWorkingDay(day.dateString, workingDays);
      return (
        <th
          key={day.dateString}
          className={`px-3 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[120px] ${
            isTodayColumn
              ? 'bg-blue-50 text-blue-700 border-l-2 border-r-2 border-blue-300'
              : isNonWorking
              ? 'bg-gray-100 text-gray-400'
              : 'text-gray-500'
          }`}
        >
          <div className="flex flex-col">
            <span className={`font-semibold ${
              isTodayColumn ? 'text-blue-900' : isNonWorking ? 'text-gray-400' : 'text-gray-900'
            }`}>
              {day.dayName}
            </span>
            <span className="text-xs">{day.fullDate}</span>
            {isTodayColumn && (
              <span className="text-xs font-medium text-blue-600 mt-1">TODAY</span>
            )}
            {isNonWorking && (
              <span className="text-xs font-medium text-gray-400 mt-1">DAY OFF</span>
            )}
          </div>
        </th>
      );
    });

    const dateHeaderRow = (key: string) => (
      <tr key={key} className="bg-gray-50 border-b border-gray-200">
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40 sticky left-0 bg-gray-50 z-20">
          Desk
        </th>
        {dateHeaderCells}
      </tr>
    );

    return (
      <Card className="overflow-hidden">
        <div ref={ref} className="overflow-x-auto pr-4">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40 sticky left-0 bg-gray-50 z-40">
                  Desk
                </th>
                {dateHeaderCells}
              </tr>
            </thead>
            <tbody className="bg-white">
              {roomGroups.map((group, groupIdx) => {
                const colorClass = ROOM_COLORS[groupIdx % ROOM_COLORS.length];
                const bgClass = ROOM_BG_COLORS[groupIdx % ROOM_BG_COLORS.length];
                return (
                  <React.Fragment key={group.room}>
                    {groupIdx > 0 && dateHeaderRow(`date-header-room-${group.room}`)}
                    <tr className={`${bgClass} ${groupIdx > 0 ? 'border-t-4 border-gray-300' : 'border-t border-gray-200'}`}>
                      <td
                        className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${colorClass} sticky left-0 ${bgClass} z-10 whitespace-nowrap overflow-visible`}
                      >
                        {group.roomName}
                      </td>
                      {currentDates.map((day) => (
                        <td key={day.dateString} className={`${bgClass} py-1.5`} />
                      ))}
                    </tr>
                    {group.desks.map((desk) => (
                      <tr key={desk.id} className="hover:bg-gray-50 transition-colors border-t border-gray-200">
                        <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">
                              {desk.label
                                ? desk.label.replace(/^.+,\s*/, '')
                                : `Desk ${desk.number}`}
                            </span>
                            <span className="text-xs text-gray-400">
                              {desk.roomName || `Room ${desk.room}`}
                            </span>
                          </div>
                        </td>
                        {currentDates.map((day) => {
                          const isTodayColumn = isToday(day.dateString);
                          const isNonWorking = isNonWorkingDay(day.dateString, workingDays);
                          return (
                            <td
                              key={day.dateString}
                              className={`px-2 py-3 text-center ${
                                isTodayColumn
                                  ? 'bg-blue-50 border-l-2 border-r-2 border-blue-300'
                                  : isNonWorking
                                  ? 'bg-gray-100'
                                  : ''
                              }`}
                            >
                              <DeskCell
                                deskId={desk.id}
                                date={day.dateString}
                                booking={getBookingForCell(desk.id, day.dateString)}
                                onClick={(e) => onDeskClick(desk.id, day.dateString, e, getBookingForCell(desk.id, day.dateString))}
                                isNonWorkingDay={isNonWorking}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {roomGroups.length > 1 && dateHeaderRow('date-header-bottom')}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }
);

DeskGrid.displayName = 'DeskGrid';
export default DeskGrid;
