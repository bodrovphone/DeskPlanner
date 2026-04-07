import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Map } from 'lucide-react';
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

const PADDING = 48;

// ─── Props ────────────────────────────────────────────────────────────────────

interface FloorPlanCalendarViewProps {
  selectedDate: string;
  selectedRoomId: string; // 'all' or a room UUID
  onDeskClick: (deskId: string, date: string, event: React.MouseEvent, booking: DeskBooking | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FloorPlanCalendarView({ selectedDate, selectedRoomId, onDeskClick }: FloorPlanCalendarViewProps) {
  const { rooms, desks } = useOrganization();
  const { loadRoomLayout } = useFloorPlan();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [allPositions, setAllPositions] = useState<DeskPosition[]>([]);
  const [allObjects, setAllObjects] = useState<FloorPlanObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [contentSize, setContentSize] = useState({ w: 0, h: 0 });

  const { data: bookings = {} } = useBookings(selectedDate, selectedDate);

  // Filter by selected room
  const positions = selectedRoomId === 'all'
    ? allPositions
    : allPositions.filter((p) => p.roomId === selectedRoomId);
  const objects = selectedRoomId === 'all'
    ? allObjects
    : allObjects.filter((o) => o.roomId === selectedRoomId);

  // Load all rooms' layout on mount / when rooms change
  const loadAll = useCallback(async () => {
    if (rooms.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(rooms.map((r) => loadRoomLayout(r.id)));
      setAllPositions(results.flatMap((r) => r.positions));
      setAllObjects(results.flatMap((r) => r.objects));
    } finally {
      setLoading(false);
    }
  }, [rooms, loadRoomLayout]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Compute scale + center offset to fit content in canvas
  const computeLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || (positions.length === 0 && objects.length === 0)) return;

    const allItems = [
      ...positions.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h })),
      ...objects.map((o) => ({ x: o.x, y: o.y, w: o.w, h: o.h })),
    ];

    const contentW = Math.max(...allItems.map((i) => i.x + i.w)) + PADDING;
    const contentH = Math.max(...allItems.map((i) => i.y + i.h)) + PADDING;
    setContentSize({ w: contentW, h: contentH });

    const { width, height } = canvas.getBoundingClientRect();
    const s = Math.min(width / contentW, height / contentH, 1);
    setScale(s);
    setOffset({
      x: Math.max((width - contentW * s) / 2, 0),
      y: Math.max((height - contentH * s) / 2, 0),
    });
  }, [positions, objects]);

  useEffect(() => {
    if (!loading) computeLayout();
  }, [loading, computeLayout]);

  useEffect(() => {
    window.addEventListener('resize', computeLayout);
    return () => window.removeEventListener('resize', computeLayout);
  }, [computeLayout]);

  const isEmpty = !loading && positions.length === 0 && objects.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={canvasRef}
        className="relative rounded-lg border bg-gray-50 overflow-hidden"
        style={{
          height: 'calc(100vh - 195px)',
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: `${32 * scale}px ${32 * scale}px`,
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

        {!loading && !isEmpty && (
          <div
            style={{
              position: 'absolute',
              top: offset.y,
              left: offset.x,
              width: contentSize.w,
              height: contentSize.h,
              transformOrigin: '0 0',
              transform: `scale(${scale})`,
            }}
          >
            {objects.map((obj) => {
              const cfg = SHAPES[obj.shape];
              if (!cfg) return null;
              const borderRadius = obj.shape === 'door' ? getDoorRadius(obj.rotation) : cfg.radius;
              return (
                <div
                  key={obj.id}
                  style={{
                    position: 'absolute',
                    left: obj.x, top: obj.y,
                    width: obj.w, height: obj.h,
                    borderRadius, overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%', top: '50%',
                      width: cfg.w, height: cfg.h,
                      marginLeft: -cfg.w / 2, marginTop: -cfg.h / 2,
                      transform: `rotate(${obj.rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <ShapeSymbol shape={obj.shape} fill={cfg.fill} stroke={cfg.stroke} />
                  </div>
                </div>
              );
            })}

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
                    left: pos.x, top: pos.y,
                    width: pos.w, height: pos.h,
                    cursor: 'pointer',
                    borderRadius: 10, overflow: 'hidden', outline: 'none',
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
                  <DeskSymbol label={orgDesk.label} rotation={pos.rotation} fill={fill} stroke={stroke} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-1">
        <StatusLegend />
      </div>
    </div>
  );
}
