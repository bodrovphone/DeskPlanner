import { Calendar } from '@/components/ui/calendar';
import { formatLocalDate } from '@/lib/dateUtils';
import { isDateDisabled } from '@/lib/bookingAvailability';
import { isNonWorkingDay } from '@/lib/workingDays';

interface AvailabilityCalendarProps {
  today: Date;
  maxDate: Date;
  workingDays: number[];
  availabilityMap: Record<string, number>;
  onSelect: (dateStr: string) => void;
  onCancel: () => void;
}

/**
 * Shared calendar picker for public and member self-booking pages.
 * Highlights days with availability, disables full/non-working/out-of-range days,
 * and returns the picked date as a local YYYY-MM-DD string.
 */
export function AvailabilityCalendar({
  today,
  maxDate,
  workingDays,
  availabilityMap,
  onSelect,
  onCancel,
}: AvailabilityCalendarProps) {
  return (
    <div className="flex flex-col items-center">
      <Calendar
        mode="single"
        weekStartsOn={1}
        selected={undefined}
        onSelect={(date) => { if (date) onSelect(formatLocalDate(date)); }}
        disabled={(date: Date) => isDateDisabled({
          date, today, maxDate, workingDays, availabilityMap,
        })}
        fromDate={today}
        toDate={maxDate}
        className="rounded-xl border p-3"
        modifiers={{
          available: (date: Date) => {
            const dateStr = formatLocalDate(date);
            return (availabilityMap[dateStr] ?? 0) > 0
              && !isNonWorkingDay(dateStr, workingDays)
              && date >= today && date <= maxDate;
          },
        }}
        modifiersClassNames={{
          available: '!text-lime-600 font-semibold',
        }}
        classNames={{
          day_disabled: 'text-gray-500 opacity-100',
        }}
      />
      <button
        onClick={onCancel}
        className="mt-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
