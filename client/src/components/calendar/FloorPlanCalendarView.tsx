import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarIcon, Loader2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import StatusLegend from '@/components/calendar/StatusLegend';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFloorPlan } from '@/hooks/use-floor-plan';
import { useBookings } from '@/hooks/use-bookings';
import { DeskSymbol, ShapeSymbol, SHAPES, getDoorRadius } from '@/components/floor-plan-symbols';
import type { DeskPosition, FloorPlanObject, DeskBooking } from '@shared/schema';

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_COLORS = {
  available: { fill: '#dcfce7', stroke: '#16a34a' },
  booked:    { fill: '#fed7aa', stroke: '#ea580c' },
  assigned:  { fill: '#dbeafe', stroke: '#3b82f6' },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FloorPlanCalendarViewProps {
  onDeskClick: (deskId: string, date: string, event: React.MouseEvent, booking: DeskBooking | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FloorPlanCalendarView({ onDeskClick }: FloorPlanCalendarViewProps) {
  const { rooms, desks } = useOrganization();
  const { loadRoomLayout } = useFloorPlan();

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [positions, setPositions] = useState<DeskPosition[]>([]);
  const [objects, setObjects] = useState<FloorPlanObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { data: bookings = {} } = useBookings(selectedDate, selectedDate);

  // Load all rooms' layout on mount / when rooms change
  const loadAll = useCallback(async () => {
    if (rooms.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(rooms.map((r) => loadRoomLayout(r.id)));
      setPositions(results.flatMap((r) => r.positions));
      setObjects(results.flatMap((r) => r.objects));
    } finally {
      setLoading(false);
    }
  }, [rooms, loadRoomLayout]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const isEmpty = !loading && positions.length === 0 && objects.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Date navigation toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addDays(d, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[160px] justify-start">
              <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
              {formatDate(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={new Date(selectedDate + 'T00:00:00')}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(d.toISOString().split('T')[0]);
                  setDatePickerOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500"
          onClick={() => setSelectedDate(todayStr())}
        >
          Today
        </Button>
      </div>

      {/* Canvas */}
      <div
        className="relative rounded-lg border bg-gray-50 overflow-auto"
        style={{
          minHeight: 520,
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading floor plan…</span>
          </div>
        )}

        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 pointer-events-none">
            <Map className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No floor plan configured</p>
            <p className="text-xs text-gray-400">Go to Floor Plan Editor to arrange your desks</p>
          </div>
        )}

        {/* Shape tiles — non-interactive */}
        {objects.map((obj) => {
          const cfg = SHAPES[obj.shape];
          if (!cfg) return null;
          const borderRadius = obj.shape === 'door' ? getDoorRadius(obj.rotation) : cfg.radius;
          return (
            <div
              key={obj.id}
              style={{
                position: 'absolute',
                left: obj.x,
                top: obj.y,
                width: obj.w,
                height: obj.h,
                borderRadius,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: cfg.w,
                  height: cfg.h,
                  marginLeft: -cfg.w / 2,
                  marginTop: -cfg.h / 2,
                  transform: `rotate(${obj.rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <ShapeSymbol shape={obj.shape} fill={cfg.fill} stroke={cfg.stroke} />
              </div>
            </div>
          );
        })}

        {/* Desk tiles — clickable, status-coloured */}
        {positions.map((pos) => {
          const orgDesk = desks.find((d) => d.id === pos.deskId);
          if (!orgDesk) return null;

          const bookingKey = `${orgDesk.deskId}-${selectedDate}`;
          const booking = bookings[bookingKey] ?? null;
          const status = (booking?.status as keyof typeof STATUS_COLORS | undefined) ?? 'available';
          const { fill, stroke } = STATUS_COLORS[status];

          return (
            <div
              key={pos.id}
              role="button"
              tabIndex={0}
              title={orgDesk.label}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: pos.w,
                height: pos.h,
                cursor: 'pointer',
                borderRadius: 10,
                overflow: 'hidden',
                outline: 'none',
              }}
              className="hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 transition-shadow"
              onClick={(e) => onDeskClick(orgDesk.deskId, selectedDate, e, booking)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDeskClick(orgDesk.deskId, selectedDate, e as unknown as React.MouseEvent, booking);
                }
              }}
            >
              <DeskSymbol
                label={orgDesk.label}
                rotation={pos.rotation}
                fill={fill}
                stroke={stroke}
              />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="pt-1">
        <StatusLegend />
      </div>
    </div>
  );
}
