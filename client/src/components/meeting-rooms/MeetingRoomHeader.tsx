import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { formatLocalDate } from '@/lib/dateUtils';

interface MeetingRoomHeaderProps {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  onDateChange: (date: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function MeetingRoomHeader({ date, onPrev, onNext, onDateChange }: MeetingRoomHeaderProps) {
  const [open, setOpen] = useState(false);
  const selected = new Date(date + 'T00:00:00');

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    onDateChange(formatLocalDate(d));
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <Button variant="outline" size="icon" onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 font-medium text-gray-900">
            <CalendarIcon className="h-4 w-4 text-gray-500 shrink-0" />
            {formatDate(date)}
            <span className="text-gray-400 font-normal text-sm hidden sm:inline">
              {selected.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
