import { Button } from '@/components/ui/button';
import StatusLegend from '@/components/calendar/StatusLegend';
import { Map, CalendarRange, Download } from 'lucide-react';

interface StatusCounts {
  available: number;
  booked: number;
  assigned: number;
}

interface CalendarHeaderProps {
  onFloorPlan: () => void;
  onSetAvailability: () => void;
  onExport: () => void;
  statusCounts?: StatusCounts;
  totalDeskDays?: number;
}

export default function CalendarHeader({
  onFloorPlan,
  onSetAvailability,
  onExport,
  statusCounts,
  totalDeskDays,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onFloorPlan}
        >
          <Map className="h-4 w-4 mr-2" />
          Floor Plan
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSetAvailability}
        >
          <CalendarRange className="h-4 w-4 mr-2" />
          Availability
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
      <StatusLegend counts={statusCounts} totalDeskDays={totalDeskDays} />
    </div>
  );
}
