import { Button } from '@/components/ui/button';
import StatusLegend from '@/components/calendar/StatusLegend';
import { Map, CalendarRange, Download } from 'lucide-react';

interface CalendarHeaderProps {
  onFloorPlan: () => void;
  onSetAvailability: () => void;
  onExport: () => void;
  onMigrate: () => void;
}

export default function CalendarHeader({
  onFloorPlan,
  onSetAvailability,
  onExport,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onFloorPlan}
        >
          <Map className="h-4 w-4 mr-1" />
          Floor Plan
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSetAvailability}
        >
          <CalendarRange className="h-4 w-4 mr-1" />
          Set Availability
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>
      <StatusLegend />
    </div>
  );
}
