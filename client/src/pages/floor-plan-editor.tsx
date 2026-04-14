import { useState, useEffect } from 'react';
import FloorPlanEditor from '@/components/floor-plan/FloorPlanEditor';
import { Monitor } from 'lucide-react';

const MOBILE_BREAKPOINT = 1024;

export default function FloorPlanEditorPage() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-4">
        <Monitor className="h-14 w-14 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-800">
          Your thumbs are too small for this
        </h2>
        <p className="text-gray-500 text-sm max-w-xs">
          The floor plan editor needs a real keyboard, a mouse, and ideally a cup of coffee.
          Come back on a computer and we'll let you rearrange the furniture.
        </p>
      </div>
    );
  }

  return <FloorPlanEditor />;
}
