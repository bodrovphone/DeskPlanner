import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useBlocker } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFloorPlan } from '@/hooks/use-floor-plan';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, Plus, Trash2, RotateCcw, RotateCw, Loader2, Check } from 'lucide-react';
import type { OrgDesk } from '@shared/schema';
import type { DeskPosition, FloorPlanObject } from '@shared/schema';

// ─── Shape definitions ────────────────────────────────────────────────────────

type ShapeKey = 'pillar' | 'table' | 'couch' | 'door' | 'window' | 'wc' | 'kitchen' | 'wall';

const SHAPES: Record<ShapeKey, {
  label: string;
  w: number; h: number;
  radius: string; previewRadius: string;
  fill: string; stroke: string;
  canRotate: boolean;
}> = {
  pillar: {
    label: 'Pillar',
    w: 56, h: 56,
    radius: '50%', previewRadius: '50%',
    fill: '#f3f4f6', stroke: '#9ca3af',
    canRotate: false,
  },
  table: {
    label: 'Table',
    w: 100, h: 58,
    radius: '6px', previewRadius: '4px',
    fill: '#f3f4f6', stroke: '#6b7280',
    canRotate: true,
  },
  couch: {
    label: 'Couch',
    w: 96, h: 44,
    radius: '6px', previewRadius: '4px',
    fill: '#e5e7eb', stroke: '#6b7280',
    canRotate: true,
  },
  door: {
    label: 'Door',
    w: 48, h: 48,
    radius: '0 100% 0 0', previewRadius: '0 100% 0 0',
    fill: '#f9fafb', stroke: '#9ca3af',
    canRotate: true,
  },
  window: {
    label: 'Window',
    w: 80, h: 20,
    radius: '2px', previewRadius: '2px',
    fill: '#f3f4f6', stroke: '#9ca3af',
    canRotate: true,
  },
  wc: {
    label: 'WC',
    w: 48, h: 56,
    radius: '6px', previewRadius: '4px',
    fill: '#f3f4f6', stroke: '#6b7280',
    canRotate: false,
  },
  kitchen: {
    label: 'Kitchen',
    w: 80, h: 56,
    radius: '6px', previewRadius: '4px',
    fill: '#e5e7eb', stroke: '#6b7280',
    canRotate: true,
  },
  wall: {
    label: 'Wall',
    w: 160, h: 16,
    radius: '2px', previewRadius: '2px',
    fill: '#9ca3af', stroke: '#4b5563',
    canRotate: true,
  },
};

// Preview dimensions in the shapes panel (visual only, not canvas size)
const PREVIEW_SIZES: Record<ShapeKey, { w: number; h: number }> = {
  pillar:  { w: 22, h: 22 },
  table:   { w: 32, h: 18 },
  couch:   { w: 30, h: 13 },
  door:    { w: 22, h: 22 },
  window:  { w: 30, h:  7 },
  wc:      { w: 20, h: 20 },
  kitchen: { w: 28, h: 20 },
  wall:    { w: 36, h:  7 },
};

// Door arc moves to a different corner on each 90° CW rotation
function getDoorRadius(rotation: number): string {
  switch (((rotation % 360) + 360) % 360) {
    case 0:   return '0 100% 0 0'; // arc top-right
    case 90:  return '0 0 100% 0'; // arc bottom-right
    case 180: return '0 0 0 100%'; // arc bottom-left
    case 270: return '100% 0 0 0'; // arc top-left
    default:  return '0 100% 0 0';
  }
}

// ─── SVG floor-plan symbols ───────────────────────────────────────────────────

function DeskSymbol({ label, rotation }: { label: string; rotation: number }) {
  // Strip room prefix ("Room 1, Desk 3" → "Desk 3"), then cap at 7 chars
  const stripped = label.includes(', ') ? label.slice(label.lastIndexOf(', ') + 2) : label;
  const short = stripped.length > 7 ? stripped.slice(0, 7) : stripped;
  const fontSize = short.length > 5 ? 9 : 11;
  return (
    <svg
      viewBox="0 0 72 72" width="100%" height="100%"
      style={{ display: 'block', transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
    >
      {/* Desk surface */}
      <rect x="4" y="4" width="64" height="46" rx="6"
        fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      {/* Chair back arc */}
      <path d="M 12 52 Q 36 70 60 52"
        fill="#bfdbfe" stroke="#3b82f6" strokeWidth="2" />
      {/* Label — counter-rotated so it stays upright */}
      <text x="36" y="31" textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fontWeight="700" fill="#1d4ed8"
        fontFamily="system-ui,sans-serif"
        transform={`rotate(${-rotation}, 36, 31)`}>
        {short}
      </text>
    </svg>
  );
}


function ShapeSymbol({ shape, fill, stroke }: { shape: ShapeKey; fill: string; stroke: string }) {
  const sw = 2;
  const svgStyle: React.CSSProperties = { display: 'block' };
  switch (shape) {
    case 'pillar':
      return (
        <svg viewBox="0 0 56 56" width="100%" height="100%" style={svgStyle}>
          <circle cx="28" cy="28" r="25" fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Cross-hatch — standard architectural pillar marker */}
          <line x1="10" y1="10" x2="46" y2="46" stroke={stroke} strokeWidth="1" opacity="0.4" />
          <line x1="46" y1="10" x2="10" y2="46" stroke={stroke} strokeWidth="1" opacity="0.4" />
        </svg>
      );
    case 'table':
      return (
        // preserveAspectRatio="none" so it stretches correctly when rotated
        <svg viewBox="0 0 100 58" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          {/* Table top */}
          <rect x="6" y="10" width="88" height="38" rx="5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Chairs — two per long side */}
          <rect x="14" y="2" width="18" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="68" y="2" width="18" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="14" y="48" width="18" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="68" y="48" width="18" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'couch':
      return (
        <svg viewBox="0 0 96 44" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          {/* Back rest */}
          <rect x="2" y="2" width="92" height="16" rx="5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Seat cushions */}
          <rect x="12" y="18" width="34" height="20" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="50" y="18" width="34" height="20" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          {/* Armrests */}
          <rect x="2" y="18" width="10" height="20" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x="84" y="18" width="10" height="20" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Feet */}
          <rect x="6"  y="38" width="6" height="5" rx="1" fill={stroke} />
          <rect x="84" y="38" width="6" height="5" rx="1" fill={stroke} />
        </svg>
      );
    case 'door':
      // CSS border-radius handles the quarter-circle; just render a thin threshold line
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" style={svgStyle}>
          {/* Wall segment (left + bottom edges) */}
          <line x1="2" y1="2" x2="2" y2="46"  stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <line x1="2" y1="46" x2="46" y2="46" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          {/* Door swing arc */}
          <path d="M 2 2 A 44 44 0 0 1 46 46" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
          {/* Door leaf */}
          <line x1="2" y1="2" x2="46" y2="2" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'window':
      return (
        <svg viewBox="0 0 80 20" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          {/* Outer frame */}
          <rect x="1" y="1" width="78" height="18" rx="1" fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Two mullions dividing into 3 panes */}
          <line x1="27" y1="2" x2="27" y2="18" stroke={stroke} strokeWidth="1.5" />
          <line x1="53" y1="2" x2="53" y2="18" stroke={stroke} strokeWidth="1.5" />
          {/* Glazing highlight */}
          <rect x="3"  y="3" width="22" height="14" rx="1" fill={stroke} opacity="0.1" />
          <rect x="29" y="3" width="22" height="14" rx="1" fill={stroke} opacity="0.1" />
          <rect x="55" y="3" width="22" height="14" rx="1" fill={stroke} opacity="0.1" />
        </svg>
      );
    case 'wc':
      return (
        <svg viewBox="0 0 48 56" width="100%" height="100%" style={svgStyle}>
          {/* Tank */}
          <rect x="8" y="2" width="32" height="16" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Bowl outer */}
          <path d="M 6 20 Q 4 54 24 54 Q 44 54 42 20 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Seat ring */}
          <path d="M 8 22 Q 6 50 24 50 Q 42 50 40 22 Z" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
          {/* Flush button */}
          <circle cx="24" cy="10" r="3" fill={stroke} opacity="0.4" />
        </svg>
      );
    case 'kitchen':
      return (
        <svg viewBox="0 0 80 56" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          {/* Counter */}
          <rect x="2" y="2" width="76" height="52" rx="5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* 4 burners (2×2 grid) */}
          <circle cx="24" cy="19" r="10" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="24" cy="19" r="5"  fill="none" stroke={stroke} strokeWidth="1" />
          <circle cx="56" cy="19" r="10" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="56" cy="19" r="5"  fill="none" stroke={stroke} strokeWidth="1" />
          <circle cx="24" cy="41" r="9"  fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="24" cy="41" r="4"  fill="none" stroke={stroke} strokeWidth="1" />
          <circle cx="56" cy="41" r="9"  fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="56" cy="41" r="4"  fill="none" stroke={stroke} strokeWidth="1" />
        </svg>
      );
    case 'wall':
      return (
        <svg viewBox="0 0 160 16" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          {/* Solid wall segment — filled rectangle with subtle inner line */}
          <rect x="0" y="0" width="160" height="16" fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1="0" y1="8" x2="160" y2="8" stroke={stroke} strokeWidth="0.5" opacity="0.3" />
        </svg>
      );
    default:
      return null;
  }
}

const DESK_SIZE = 72;
const ROTATE_STEP = 90;
const AUTOSAVE_INTERVAL = 10_000; // 10 seconds

// ─── Canvas object ────────────────────────────────────────────────────────────

type CanvasObject = {
  id: string;
  type: 'desk' | 'shape';
  shape?: ShapeKey;
  label: string;
  deskId?: string;
  roomId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

let placementOffset = 0;
function nextOffset() {
  const off = placementOffset;
  placementOffset = (placementOffset + 36) % 180;
  return off;
}

function toDbPositions(objects: CanvasObject[], orgId: string): DeskPosition[] {
  return objects
    .filter((o) => o.type === 'desk' && o.deskId)
    .map((o) => ({
      id: '',
      organizationId: orgId,
      roomId: o.roomId,
      deskId: o.deskId!,
      x: o.x, y: o.y, w: o.w, h: o.h,
      rotation: o.rotation,
    }));
}

function toDbObjects(objects: CanvasObject[], orgId: string): FloorPlanObject[] {
  return objects
    .filter((o) => o.type === 'shape' && o.shape)
    .map((o) => ({
      id: '',
      organizationId: orgId,
      roomId: o.roomId,
      shape: o.shape!,
      x: o.x, y: o.y, w: o.w, h: o.h,
      rotation: o.rotation,
    }));
}

// ─── DraggableTile ────────────────────────────────────────────────────────────

interface TileProps {
  obj: CanvasObject;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onRotate: (id: string, delta: number) => void;
}

function DraggableTile({ obj, canvasRef, selected, onSelect, onRemove, onMove, onRotate }: TileProps) {
  const x = useMotionValue(obj.x);
  const y = useMotionValue(obj.y);

  const isShape = obj.type === 'shape';
  const cfg = isShape && obj.shape ? SHAPES[obj.shape] : null;

  // Door uses CSS border-radius for the quarter-circle; others are rectangular
  const borderRadius = isShape && cfg
    ? (obj.shape === 'door' ? getDoorRadius(obj.rotation) : cfg.radius)
    : '10px';

  function stopAndRotate(e: React.MouseEvent, delta: number) {
    e.stopPropagation();
    onRotate(obj.id, delta);
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={canvasRef}
      style={{
        x, y,
        position: 'absolute', left: 0, top: 0,
        width: obj.w, height: obj.h,
        cursor: 'grab', zIndex: selected ? 20 : 10,
        touchAction: 'none',
      }}
      whileDrag={{ scale: 1.06, zIndex: 50, cursor: 'grabbing' }}
      onDragEnd={() => onMove(obj.id, x.get(), y.get())}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Visual container — clips SVG to shape boundary */}
      <div
        className={`w-full h-full select-none overflow-hidden shadow-sm relative ${
          selected ? 'ring-2 ring-offset-1 ring-blue-400' : ''
        }`}
        style={{ borderRadius }}
      >
        {obj.type === 'desk' ? (
          <DeskSymbol label={obj.label} rotation={obj.rotation} />
        ) : cfg ? (
          // Render SVG at natural (0°) dimensions, centered in the container,
          // then CSS-rotate so all 4 angles look correct without distortion.
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: cfg.w,
            height: cfg.h,
            marginLeft: -cfg.w / 2,
            marginTop: -cfg.h / 2,
            transform: `rotate(${obj.rotation}deg)`,
            transformOrigin: 'center center',
          }}>
            <ShapeSymbol shape={obj.shape!} fill={cfg.fill} stroke={cfg.stroke} />
          </div>
        ) : null}
      </div>

      {selected && (
        <>
          <button
            className="absolute -top-2.5 -right-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center z-30 shadow"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <X className="h-3 w-3" />
          </button>

          {(obj.type === 'desk' || (isShape && obj.shape && SHAPES[obj.shape].canRotate)) && (
            <>
              <button
                className="absolute -bottom-2.5 -left-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center z-30 shadow"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => stopAndRotate(e, -ROTATE_STEP)}
                title="Rotate CCW"
              >
                <RotateCcw className="h-2.5 w-2.5" />
              </button>
              <button
                className="absolute -bottom-2.5 -right-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center z-30 shadow"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => stopAndRotate(e, ROTATE_STEP)}
                title="Rotate CW"
              >
                <RotateCw className="h-2.5 w-2.5" />
              </button>
            </>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Save status indicator ────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      {status === 'saving' && (
        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
      )}
      {status === 'saved' && (
        <><Check className="h-3.5 w-3.5 text-green-500" /> Saved</>
      )}
      {status === 'error' && (
        <span className="text-red-400">Save failed</span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FloorPlanEditor() {
  const { rooms, desks, currentOrg } = useOrganization();
  const { loadRoomLayout, saveRoomLayout } = useFloorPlan();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id ?? '');
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadedRooms, setLoadedRooms] = useState<Set<string>>(new Set());
  const [dirtyRooms, setDirtyRooms] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [combinedMode, setCombinedMode] = useState(false);
  const [combineDialogOpen, setCombineDialogOpen] = useState(false);

  const visibleObjects = combinedMode
    ? objects
    : objects.filter((o) => o.roomId === selectedRoomId);
  const placedDeskIds = new Set(visibleObjects.filter((o) => o.type === 'desk').map((o) => o.deskId!));
  const roomDesks = combinedMode
    ? desks.filter((d) => !placedDeskIds.has(d.id))
    : desks.filter((d) => d.roomId === selectedRoomId && !placedDeskIds.has(d.id));
  const hasDirtyRooms = dirtyRooms.size > 0;

  // ── Load room data on first visit ──
  useEffect(() => {
    if (!selectedRoomId || loadedRooms.has(selectedRoomId)) return;

    loadRoomLayout(selectedRoomId).then(({ positions, objects: shapes }) => {
      setLoadedRooms((prev) => new Set([...prev, selectedRoomId]));

      const deskObjs: CanvasObject[] = positions.map((p) => {
        const desk = desks.find((d) => d.id === p.deskId);
        return {
          id: uid(),
          type: 'desk',
          label: desk?.label ?? p.deskId,
          deskId: p.deskId,
          roomId: p.roomId,
          x: p.x, y: p.y, w: p.w, h: p.h,
          rotation: p.rotation,
        };
      });

      const shapeObjs: CanvasObject[] = shapes.map((s) => ({
        id: uid(),
        type: 'shape',
        shape: s.shape,
        label: SHAPES[s.shape].label,
        roomId: s.roomId,
        x: s.x, y: s.y, w: s.w, h: s.h,
        rotation: s.rotation,
      }));

      setObjects((prev) => [
        ...prev.filter((o) => o.roomId !== selectedRoomId),
        ...deskObjs,
        ...shapeObjs,
      ]);
    });
  }, [selectedRoomId, loadedRooms, loadRoomLayout, desks]);

  // ── Save a single room ──
  const saveRoom = useCallback(async (roomId: string, allObjects: CanvasObject[]) => {
    if (!currentOrg) return;
    const roomObjs = allObjects.filter((o) => o.roomId === roomId);
    await saveRoomLayout(
      roomId,
      toDbPositions(roomObjs, currentOrg.id),
      toDbObjects(roomObjs, currentOrg.id),
    );
  }, [currentOrg, saveRoomLayout]);

  // ── Auto-save every 10s for dirty rooms ──
  const dirtyRoomsRef = useRef(dirtyRooms);
  const objectsRef = useRef(objects);
  dirtyRoomsRef.current = dirtyRooms;
  objectsRef.current = objects;

  useEffect(() => {
    const timer = setInterval(async () => {
      if (dirtyRoomsRef.current.size === 0) return;
      const rooms = [...dirtyRoomsRef.current];
      setSaveStatus('saving');
      try {
        await Promise.all(rooms.map((r) => saveRoom(r, objectsRef.current)));
        setDirtyRooms(new Set());
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [saveRoom]);

  // ── beforeunload guard (browser tab close / refresh) ──
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRoomsRef.current.size === 0) return;
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // ── React Router navigation guard ──
  const blocker = useBlocker(hasDirtyRooms);

  // ── Mark room dirty ──
  function markDirty(roomId?: string) {
    if (combinedMode) {
      setDirtyRooms(new Set(rooms.map((r) => r.id)));
    } else {
      setDirtyRooms((prev) => new Set([...prev, roomId ?? selectedRoomId]));
    }
    setSaveStatus('idle');
  }

  // ── Enter combined mode: load all unloaded rooms first ──
  async function enterCombinedMode() {
    const unloaded = rooms.filter((r) => !loadedRooms.has(r.id));
    for (const room of unloaded) {
      const { positions, objects: shapes } = await loadRoomLayout(room.id);
      setLoadedRooms((prev) => new Set([...prev, room.id]));
      const deskObjs: CanvasObject[] = positions.map((p) => {
        const desk = desks.find((d) => d.id === p.deskId);
        return { id: uid(), type: 'desk', label: desk?.label ?? p.deskId, deskId: p.deskId, roomId: p.roomId, x: p.x, y: p.y, w: p.w, h: p.h, rotation: p.rotation };
      });
      const shapeObjs: CanvasObject[] = shapes.map((s) => ({
        id: uid(), type: 'shape', shape: s.shape, label: SHAPES[s.shape].label, roomId: s.roomId, x: s.x, y: s.y, w: s.w, h: s.h, rotation: s.rotation,
      }));
      setObjects((prev) => [...prev.filter((o) => o.roomId !== room.id), ...deskObjs, ...shapeObjs]);
    }
    setCombinedMode(true);
    setCombineDialogOpen(false);
  }

  // ── Canvas helpers ──
  function canvasCenter() {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { w: rect?.width ?? 600, h: rect?.height ?? 400 };
  }

  function addDesk(desk: OrgDesk) {
    const { w, h } = canvasCenter();
    const off = nextOffset();
    setObjects((prev) => [
      ...prev,
      {
        id: uid(), type: 'desk',
        label: desk.label, deskId: desk.id, roomId: desk.roomId,
        x: w / 2 - DESK_SIZE / 2 + off - 90,
        y: h / 2 - DESK_SIZE / 2 + off - 90,
        w: DESK_SIZE, h: DESK_SIZE, rotation: 0,
      },
    ]);
    markDirty();
    setSelectedId(null);
  }

  function addShape(key: ShapeKey) {
    const cfg = SHAPES[key];
    const { w, h } = canvasCenter();
    const off = nextOffset();
    const shapeRoomId = combinedMode ? (rooms[0]?.id ?? selectedRoomId) : selectedRoomId;
    setObjects((prev) => [
      ...prev,
      {
        id: uid(), type: 'shape', shape: key,
        label: cfg.label, roomId: shapeRoomId,
        x: w / 2 - cfg.w / 2 + off - 90,
        y: h / 2 - cfg.h / 2 + off - 90,
        w: cfg.w, h: cfg.h, rotation: 0,
      },
    ]);
    markDirty();
    setSelectedId(null);
  }

  function removeObject(id: string) {
    const obj = objects.find((o) => o.id === id);
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (obj) markDirty(obj.roomId);
    setSelectedId(null);
  }

  function updatePosition(id: string, x: number, y: number) {
    const obj = objects.find((o) => o.id === id);
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, x, y } : o)));
    if (obj) markDirty(obj.roomId);
  }

  function updateRotation(id: string, delta: number) {
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const rotation = ((o.rotation + delta) % 360 + 360) % 360;
        if (o.type === 'desk') {
          // Desks are square — just track rotation for the SVG transform
          return { ...o, rotation };
        }
        // Non-circular shapes: swap w/h and re-centre
        return {
          ...o, rotation,
          w: o.h, h: o.w,
          x: o.x + (o.w - o.h) / 2,
          y: o.y + (o.h - o.w) / 2,
        };
      })
    );
    markDirty();
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="border-b bg-white px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="font-semibold text-gray-900 text-sm">Floor Plan</h1>
        <SaveIndicator status={saveStatus} />
        <div className="flex-1" />
        {rooms.length >= 2 && (
          combinedMode ? (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
              onClick={() => { setCombinedMode(false); setSelectedId(null); }}
            >
              Split view
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => setCombineDialogOpen(true)}
            >
              Combine rooms
            </Button>
          )
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => {
            if (combinedMode) {
              setObjects([]);
              setDirtyRooms(new Set(rooms.map((r) => r.id)));
            } else {
              setObjects((prev) => prev.filter((o) => o.roomId !== selectedRoomId));
              markDirty();
            }
            setSelectedId(null);
            placementOffset = 0;
          }}
          disabled={visibleObjects.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {combinedMode ? 'Clear all' : 'Clear room'}
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundColor: '#f9fafb',
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
          onClick={(e) => { if (e.target === canvasRef.current) setSelectedId(null); }}
        >
          {visibleObjects.map((obj) => (
            <DraggableTile
              key={obj.id}
              obj={obj}
              canvasRef={canvasRef}
              selected={selectedId === obj.id}
              onSelect={() => setSelectedId((cur) => (cur === obj.id ? null : obj.id))}
              onRemove={() => removeObject(obj.id)}
              onMove={updatePosition}
              onRotate={updateRotation}
            />
          ))}

          {visibleObjects.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <p className="text-gray-400 text-sm text-center max-w-xs">
                Add desks or shapes from the panel on the right.
              </p>
              <p className="text-gray-300 text-xs">
                Drag to reposition · click to select · rotate or remove
              </p>
            </div>
          )}

          {selectedId && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
              Drag to move · ↺↻ to rotate · × to remove
            </div>
          )}
        </div>

        {/* Right Panel */}
        <aside className="w-56 border-l bg-white flex flex-col shrink-0">

          {/* Room tabs */}
          <div className="border-b shrink-0">
            {rooms.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No rooms found</p>
            ) : combinedMode ? (
              <div className="px-3 py-2.5 text-xs font-medium text-blue-600 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                All rooms combined
              </div>
            ) : (
              <div className="flex overflow-x-auto">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => { setSelectedRoomId(room.id); setSelectedId(null); }}
                    className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                      selectedRoomId === room.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {room.name}
                    {dirtyRooms.has(room.id) && (
                      <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shapes */}
          <div className="border-b p-3 shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
              Shapes
            </p>
            <div className="grid grid-cols-4 gap-1">
              {(Object.entries(SHAPES) as [ShapeKey, typeof SHAPES[ShapeKey]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => addShape(key)}
                  title={`Add ${cfg.label}`}
                  className="flex flex-col items-center gap-1 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className="group-hover:scale-110 transition-transform overflow-hidden"
                    style={{
                      width: PREVIEW_SIZES[key].w,
                      height: PREVIEW_SIZES[key].h,
                      borderRadius: key === 'door' ? cfg.previewRadius : undefined,
                    }}
                  >
                    <ShapeSymbol shape={key} fill={cfg.fill} stroke={cfg.stroke} />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium leading-none">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Unplaced desks */}
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-1 mb-2 pt-1">
              Desks to place
            </p>
            {!loadedRooms.has(selectedRoomId) ? (
              <div className="flex items-center gap-1.5 px-1 text-xs text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            ) : roomDesks.length === 0 ? (
              <p className="text-xs text-gray-400 px-1 italic">All desks placed ✓</p>
            ) : (
              <div className="space-y-0.5">
                {roomDesks.map((desk) => (
                  <button
                    key={desk.id}
                    onClick={() => addDesk(desk)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 group"
                  >
                    <span className="h-7 w-7 rounded-md bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {desk.label.length <= 3 ? desk.label : desk.label.slice(0, 2)}
                    </span>
                    <span className="truncate text-xs font-medium text-gray-700 group-hover:text-blue-700 flex-1">
                      {desk.label}
                    </span>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-blue-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

        </aside>
      </div>

      {/* Combine rooms confirmation dialog */}
      <AlertDialog open={combineDialogOpen} onOpenChange={setCombineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Combine rooms on canvas</AlertDialogTitle>
            <AlertDialogDescription>
              This shows all rooms together on one canvas so you can lay out the full space.
              Desks stay linked to their original rooms — nothing changes in the calendar or bookings.
              You can switch back to split view at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => enterCombinedMode()}>
              Combine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* React Router navigation blocker dialog */}
      <AlertDialog open={blocker.state === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved floor plan changes. They will be auto-saved in a few seconds — or you can leave now and lose them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => blocker.proceed?.()}
            >
              Leave without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
