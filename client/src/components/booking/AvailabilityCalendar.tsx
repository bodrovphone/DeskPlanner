import { Calendar } from '@/components/ui/calendar';
import { formatLocalDate } from '@/lib/dateUtils';
import { isDateDisabled } from '@/lib/bookingAvailability';
import { isNonWorkingDay } from '@/lib/workingDays';

interface AvailabilityCalendarProps {
  today: Date;
  maxDate: Date;
  workingDays: number[];
  availabilityMap: Record<string, number>;
  /** Called with the toggled date string (YYYY-MM-DD). In multi mode, parent toggles it in/out. */
  onSelect: (dateStr: string) => void;
  onCancel: () => void;
  multiple?: boolean;
  /** Hard cap on number of selections (e.g. flex remaining balance). */
  maxSelections?: number;
  /** Currently selected dates (controlled, only used in multiple mode). */
  selectedDates?: string[];
}

/**
 * Shared calendar picker for public and member self-booking pages.
 * Supports single and multiple date selection.
 */
export function AvailabilityCalendar({
  today,
  maxDate,
  workingDays,
  availabilityMap,
  onSelect,
  onCancel,
  multiple = false,
  maxSelections,
  selectedDates = [],
}: AvailabilityCalendarProps) {
  const atMax = maxSelections !== undefined && selectedDates.length >= maxSelections;
  const selectedDateObjs = selectedDates.map(d => new Date(d + 'T00:00:00'));

  const sharedProps = {
    weekStartsOn: 1 as const,
    fromDate: today,
    toDate: maxDate,
    className: 'rounded-xl border p-3 mx-auto',
    modifiers: {
      available: (date: Date) => {
        const dateStr = formatLocalDate(date);
        return (availabilityMap[dateStr] ?? 0) > 0
          && !isNonWorkingDay(dateStr, workingDays)
          && date >= today && date <= maxDate;
      },
    },
    modifiersClassNames: { available: '!text-lime-600 font-semibold' },
    classNames: { day_disabled: 'text-gray-500 opacity-100' },
  };

  if (multiple) {
    return (
      <div className="flex flex-col w-full items-center">
        <p className="text-xs text-gray-400 mb-1">Tap individual dates to select multiple</p>
        <Calendar
          {...sharedProps}
          mode="multiple"
          selected={selectedDateObjs}
          onSelect={(dates) => {
            if (!dates) return;
            const newSet = new Set(dates.map(d => formatLocalDate(d)));
            const oldSet = new Set(selectedDates);
            const added = [...newSet].find(d => !oldSet.has(d));
            const removed = [...oldSet].find(d => !newSet.has(d));
            if (added && !atMax) onSelect(added);
            else if (removed) onSelect(removed);
          }}
          disabled={(date: Date) => {
            if (isDateDisabled({ date, today, maxDate, workingDays, availabilityMap })) return true;
            const dateStr = formatLocalDate(date);
            return atMax && !selectedDates.includes(dateStr);
          }}
        />
        {selectedDates.length > 0 && (
          <p className="mt-2 text-sm font-medium text-amber-700">
            {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
          </p>
        )}
        <button
          onClick={onCancel}
          className="mt-2 text-sm text-gray-400 hover:text-gray-600 transition-colors self-center"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full items-center">
      <Calendar
        {...sharedProps}
        mode="single"
        selected={undefined}
        onSelect={(date) => { if (date) onSelect(formatLocalDate(date)); }}
        disabled={(date: Date) => isDateDisabled({ date, today, maxDate, workingDays, availabilityMap })}
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
