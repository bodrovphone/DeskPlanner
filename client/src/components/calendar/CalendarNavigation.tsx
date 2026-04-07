import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, PlusCircle, Map, CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

function formatNextDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface RoomInfo {
  room: number;
  roomName: string;
}

interface CalendarNavigationProps {
  viewMode: 'week' | 'month' | 'floor-plan';
  setViewMode: (mode: 'week' | 'month' | 'floor-plan') => void;
  rangeString: string;
  onPrev: () => void;
  onNext: () => void;
  onQuickBook: () => void;
  quickBookDisabled: boolean;
  quickBookLoading: boolean;
  nextAvailableDate?: string;
  roomViewMode: 'all' | 'single';
  setRoomViewMode: (mode: 'all' | 'single') => void;
  rooms: RoomInfo[];
  selectedRoom: number | null;
  setSelectedRoom: (room: number) => void;
  // floor-plan mode controls
  mapDate?: string;
  setMapDate?: (date: string) => void;
  mapRooms?: { id?: string; name?: string }[];
  mapRoomId?: string;
  setMapRoomId?: (id: string) => void;
}

export default function CalendarNavigation({
  viewMode,
  setViewMode,
  rangeString,
  onPrev,
  onNext,
  onQuickBook,
  quickBookDisabled,
  quickBookLoading,
  nextAvailableDate,
  roomViewMode,
  setRoomViewMode,
  rooms,
  selectedRoom,
  setSelectedRoom,
  mapDate,
  setMapDate,
  mapRooms,
  mapRoomId,
  setMapRoomId,
}: CalendarNavigationProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  function addDays(dateStr: string, n: number) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {viewMode === 'floor-plan' && mapDate && setMapDate ? (
              <>
                <Button variant="outline" size="icon" onClick={() => setMapDate(addDays(mapDate, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setMapDate(addDays(mapDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="min-w-[160px] justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                      {formatDate(mapDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(mapDate + 'T00:00:00')}
                      onSelect={(d) => {
                        if (d) {
                          setMapDate(d.toISOString().split('T')[0]);
                          setDatePickerOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setMapDate(todayStr())}>
                  Today
                </Button>

                {mapRooms && mapRooms.length > 1 && mapRoomId !== undefined && setMapRoomId && (
                  <Select value={mapRoomId} onValueChange={setMapRoomId}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All rooms</SelectItem>
                      {mapRooms.map((r) => r.id && r.name ? (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ) : null)}
                    </SelectContent>
                  </Select>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={onPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={onNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-base font-medium text-gray-900 ml-2">
                  {rangeString}
                </span>
              </>
            )}

            {viewMode !== 'floor-plan' && rooms.length > 1 && (
              <>
                {rooms.length < 4 && (
                  <div className="flex rounded-md border border-gray-200 ml-4">
                    <Button
                      variant={roomViewMode === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setRoomViewMode('all')}
                      className={`rounded-r-none ${roomViewMode === 'all' ? 'bg-blue-100 text-blue-700' : ''}`}
                    >
                      All Rooms
                    </Button>
                    <Button
                      variant={roomViewMode === 'single' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setRoomViewMode('single')}
                      className={`rounded-l-none ${roomViewMode === 'single' ? 'bg-blue-100 text-blue-700' : ''}`}
                    >
                      By Room
                    </Button>
                  </div>
                )}

                {(roomViewMode === 'single' || rooms.length >= 4) && selectedRoom !== null && (
                  <Select
                    value={String(selectedRoom)}
                    onValueChange={(val) => setSelectedRoom(Number(val))}
                  >
                    <SelectTrigger className="w-[160px] h-9 ml-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.room} value={String(r.room)}>
                          {r.roomName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-gray-200">
              <Button
                variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className={`rounded-none rounded-l-md border-r ${viewMode === 'week' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className={`rounded-none border-r ${viewMode === 'month' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'floor-plan' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('floor-plan')}
                className={`rounded-none rounded-r-md ${viewMode === 'floor-plan' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                <Map className="h-3.5 w-3.5 mr-1" />
                Map
              </Button>
            </div>

            <Button
              onClick={onQuickBook}
              disabled={quickBookDisabled || quickBookLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {quickBookLoading
                ? 'Loading...'
                : nextAvailableDate
                  ? `Book ${formatNextDate(nextAvailableDate)}`
                  : 'Book Now'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
