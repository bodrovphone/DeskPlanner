import { useEffect, useRef, useState, useCallback } from 'react';
import { DeskSymbol, ShapeSymbol, SHAPES, getDoorRadius } from '@/components/floor-plan/floor-plan-symbols';
import type { DeskPosition, FloorPlanObject } from '@shared/schema';

const PADDING = 48;
const DESK_DEFAULT   = { fill: '#f3f4f6', stroke: '#9ca3af' };
const DESK_HIGHLIGHT = { fill: '#fed7aa', stroke: '#ea580c' };

interface FloorPlanReadOnlyProps {
  positions: DeskPosition[];
  objects: FloorPlanObject[];
  /** Org desk UUID to highlight in orange. All others rendered grey. */
  highlightDeskId: string | null;
  /** Label to show on the highlighted desk (e.g. "Room 1, Desk A"). */
  highlightLabel?: string;
}

export function FloorPlanReadOnly({ positions, objects, highlightDeskId, highlightLabel }: FloorPlanReadOnlyProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale]           = useState(1);
  const [offset, setOffset]         = useState({ x: 0, y: 0 });
  const [contentSize, setContentSize] = useState({ w: 0, h: 0 });

  const computeLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || (positions.length === 0 && objects.length === 0)) return;

    const allItems = [
      ...positions.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h })),
      ...objects.map((o)  => ({ x: o.x, y: o.y, w: o.w, h: o.h })),
    ];

    const contentW = Math.max(...allItems.map((i) => i.x + i.w)) + PADDING;
    const contentH = Math.max(...allItems.map((i) => i.y + i.h)) + PADDING;
    setContentSize({ w: contentW, h: contentH });

    const { width, height } = canvas.getBoundingClientRect();
    const s = Math.min(width / contentW, height / contentH, 1);
    setScale(s);
    setOffset({
      x: Math.max((width  - contentW * s) / 2, 0),
      y: Math.max((height - contentH * s) / 2, 0),
    });
  }, [positions, objects]);

  useEffect(() => { computeLayout(); }, [computeLayout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => computeLayout());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [computeLayout]);

  if (positions.length === 0 && objects.length === 0) return null;

  return (
    <div
      ref={canvasRef}
      className="relative rounded-xl border bg-gray-50 overflow-hidden w-full"
      style={{
        aspectRatio: '4 / 3',
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: `${32 * scale}px ${32 * scale}px`,
      }}
    >
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
          const isHighlight = pos.deskId === highlightDeskId;
          const { fill, stroke } = isHighlight ? DESK_HIGHLIGHT : DESK_DEFAULT;
          const label = isHighlight ? (highlightLabel ?? '') : '';
          return (
            <div
              key={pos.id}
              style={{
                position: 'absolute',
                left: pos.x, top: pos.y,
                width: pos.w, height: pos.h,
                borderRadius: 10, overflow: 'hidden',
                zIndex: isHighlight ? 1 : 0,
              }}
            >
              <DeskSymbol label={label} rotation={pos.rotation} fill={fill} stroke={stroke} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
