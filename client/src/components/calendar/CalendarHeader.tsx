import { Button } from '@/components/ui/button';
import StatusLegend from '@/components/calendar/StatusLegend';
import { CalendarRange, Download } from 'lucide-react';

interface StatusCounts {
  available: number;
  booked: number;
  assigned: number;
}

interface CalendarHeaderProps {
  onSetAvailability: () => void;
  onExport: () => void;
  statusCounts?: StatusCounts;
  stripePaidCount?: number;
  totalDeskDays?: number;
}

export default function CalendarHeader({
  onSetAvailability,
  onExport,
  statusCounts,
  stripePaidCount,
  totalDeskDays,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
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
      <StatusLegend counts={statusCounts} totalDeskDays={totalDeskDays} stripePaidCount={stripePaidCount} />
    </div>
  );
}
