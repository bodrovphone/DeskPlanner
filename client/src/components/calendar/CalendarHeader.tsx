import { Button } from '@/components/ui/button';
import CurrencySelector from '@/components/CurrencySelector';
import { Currency } from '@shared/schema';
import { Map, CalendarRange, Download } from 'lucide-react';

interface CalendarHeaderProps {
  onCurrencyChange: (currency: Currency) => void;
  onFloorPlan: () => void;
  onSetAvailability: () => void;
  onExport: () => void;
  onMigrate: () => void;
}

export default function CalendarHeader({
  onCurrencyChange,
  onFloorPlan,
  onSetAvailability,
  onExport,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <CurrencySelector onCurrencyChange={onCurrencyChange} />
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
  );
}
