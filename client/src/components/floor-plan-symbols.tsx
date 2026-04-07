// Shared floor-plan SVG symbols and shape definitions.
// Imported by both FloorPlanEditor (editor) and FloorPlanCalendarView (read-only view).

import React from 'react';

// ─── Shape definitions ────────────────────────────────────────────────────────

export type ShapeKey = 'pillar' | 'table' | 'couch' | 'door' | 'window' | 'wc' | 'kitchen' | 'wall';

export const SHAPES: Record<ShapeKey, {
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
export const PREVIEW_SIZES: Record<ShapeKey, { w: number; h: number }> = {
  pillar:  { w: 22, h: 22 },
  table:   { w: 32, h: 18 },
  couch:   { w: 30, h: 13 },
  door:    { w: 22, h: 22 },
  window:  { w: 30, h:  7 },
  wc:      { w: 20, h: 20 },
  kitchen: { w: 28, h: 20 },
  wall:    { w: 36, h:  7 },
};

// Door arc corner shifts on each 90° CW rotation
export function getDoorRadius(rotation: number): string {
  switch (((rotation % 360) + 360) % 360) {
    case 0:   return '0 100% 0 0';
    case 90:  return '0 0 100% 0';
    case 180: return '0 0 0 100%';
    case 270: return '100% 0 0 0';
    default:  return '0 100% 0 0';
  }
}

// ─── DeskSymbol ───────────────────────────────────────────────────────────────

interface DeskSymbolProps {
  label: string;
  rotation: number;
  /** Override fill for status colours in calendar view */
  fill?: string;
  /** Override stroke for status colours in calendar view */
  stroke?: string;
}

export function DeskSymbol({ label, rotation, fill = '#dbeafe', stroke = '#3b82f6' }: DeskSymbolProps) {
  const stripped = label.includes(', ') ? label.slice(label.lastIndexOf(', ') + 2) : label;
  const short = stripped.length > 7 ? stripped.slice(0, 7) : stripped;
  const fontSize = short.length > 5 ? 9 : 11;
  // Derive text colour from stroke (darken for readability)
  const textFill = stroke;
  // Chair fill slightly lighter than desk fill
  const chairFill = fill;

  return (
    <svg
      viewBox="0 0 72 72" width="100%" height="100%"
      style={{ display: 'block', transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
    >
      <rect x="4" y="4" width="64" height="46" rx="6" fill={fill} stroke={stroke} strokeWidth="2" />
      <path d="M 12 52 Q 36 70 60 52" fill={chairFill} stroke={stroke} strokeWidth="2" />
      <text
        x="36" y="31" textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fontWeight="700" fill={textFill}
        fontFamily="system-ui,sans-serif"
        transform={`rotate(${-rotation}, 36, 31)`}
      >
        {short}
      </text>
    </svg>
  );
}

// ─── ShapeSymbol ──────────────────────────────────────────────────────────────

export function ShapeSymbol({ shape, fill, stroke }: { shape: ShapeKey; fill: string; stroke: string }) {
  const sw = 2;
  const svgStyle: React.CSSProperties = { display: 'block' };
  switch (shape) {
    case 'pillar':
      return (
        <svg viewBox="0 0 56 56" width="100%" height="100%" style={svgStyle}>
          <circle cx="28" cy="28" r="25" fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1="10" y1="10" x2="46" y2="46" stroke={stroke} strokeWidth="1" opacity="0.4" />
          <line x1="46" y1="10" x2="10" y2="46" stroke={stroke} strokeWidth="1" opacity="0.4" />
        </svg>
      );
    case 'table':
      return (
        <svg viewBox="0 0 100 58" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          <rect x="6" y="10" width="88" height="38" rx="5" fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x="14" y="2" width="18" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="68" y="2" width="18" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="14" y="48" width="18" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="68" y="48" width="18" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'couch':
      return (
        <svg viewBox="0 0 96 44" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          <rect x="2" y="2" width="92" height="16" rx="5" fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x="12" y="18" width="34" height="20" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="50" y="18" width="34" height="20" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <rect x="2" y="18" width="10" height="20" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x="84" y="18" width="10" height="20" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x="6"  y="38" width="6" height="5" rx="1" fill={stroke} />
          <rect x="84" y="38" width="6" height="5" rx="1" fill={stroke} />
        </svg>
      );
    case 'door':
      return (
        <svg viewBox="0 0 48 48" width="100%" height="100%" style={svgStyle}>
          <line x1="2" y1="2" x2="2" y2="46"  stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <line x1="2" y1="46" x2="46" y2="46" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M 2 2 A 44 44 0 0 1 46 46" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="2" y1="2" x2="46" y2="2" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'window':
      return (
        <svg viewBox="0 0 80 20" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          <rect x="1" y="1" width="78" height="18" rx="1" fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1="27" y1="2" x2="27" y2="18" stroke={stroke} strokeWidth="1.5" />
          <line x1="53" y1="2" x2="53" y2="18" stroke={stroke} strokeWidth="1.5" />
          <rect x="3"  y="3" width="22" height="14" rx="1" fill={stroke} opacity="0.1" />
          <rect x="29" y="3" width="22" height="14" rx="1" fill={stroke} opacity="0.1" />
          <rect x="55" y="3" width="22" height="14" rx="1" fill={stroke} opacity="0.1" />
        </svg>
      );
    case 'wc':
      return (
        <svg viewBox="0 0 48 56" width="100%" height="100%" style={svgStyle}>
          <rect x="8" y="2" width="32" height="16" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d="M 6 20 Q 4 54 24 54 Q 44 54 42 20 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d="M 8 22 Q 6 50 24 50 Q 42 50 40 22 Z" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
          <circle cx="24" cy="10" r="3" fill={stroke} opacity="0.4" />
        </svg>
      );
    case 'kitchen':
      return (
        <svg viewBox="0 0 80 56" width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
          <rect x="2" y="2" width="76" height="52" rx="5" fill={fill} stroke={stroke} strokeWidth={sw} />
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
          <rect x="0" y="0" width="160" height="16" fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1="0" y1="8" x2="160" y2="8" stroke={stroke} strokeWidth="0.5" opacity="0.3" />
        </svg>
      );
    default:
      return null;
  }
}
