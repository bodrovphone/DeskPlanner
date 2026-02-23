import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, CalendarX, Bell } from 'lucide-react';
import { BookedDate, ExpiringAssignment } from '@/hooks/use-next-dates';

interface NextDatesPanelProps {
  nextAvailableDates: string[];
  nextBookedDates: BookedDate[];
  expiringAssignments: ExpiringAssignment[];
  onAvailableDateClick?: (date: string) => void;
  onBookedDateClick?: (entry: BookedDate) => void;
  onExpiringClick?: (entry: ExpiringAssignment) => void;
}

export default function NextDatesPanel({
  nextAvailableDates,
  nextBookedDates,
  expiringAssignments,
  onAvailableDateClick,
  onBookedDateClick,
  onExpiringClick,
}: NextDatesPanelProps) {
  return (
    <Card className="mt-6">
      <CardContent className="p-4">
        {/* Available Dates Section */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <CalendarCheck className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-sm font-medium text-gray-900">Next Available Dates</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {nextAvailableDates.length > 0 ? (
              nextAvailableDates.map(date => {
                const dateObj = new Date(date + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const day = dateObj.getDate();
                return (
                  <button
                    key={date}
                    onClick={() => onAvailableDateClick?.(date)}
                    className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-left hover:bg-green-100 hover:border-green-300 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-green-700">{dayName}, {monthName} {day}</div>
                  </button>
                );
              })
            ) : (
              <span className="text-sm text-gray-500">No available dates found in the next 90 days</span>
            )}
          </div>
        </div>

        {/* Booked Dates Section */}
        {nextBookedDates.length > 0 && (
          <div>
            <div className="flex items-center mb-2">
              <CalendarX className="h-5 w-5 text-orange-600 mr-2" />
              <h3 className="text-sm font-medium text-gray-900">Next Booked Dates</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {nextBookedDates.map((entry) => {
                const dateObj = new Date(entry.date + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const day = dateObj.getDate();
                return (
                  <button
                    key={entry.date}
                    onClick={() => onBookedDateClick?.(entry)}
                    className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-left hover:bg-orange-100 hover:border-orange-300 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-orange-700">{dayName}, {monthName} {day}</div>
                    <div className="text-xs text-orange-600 mt-1">
                      {entry.names.join(', ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Expiring Assignments Section */}
        {expiringAssignments.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center mb-2">
              <Bell className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-sm font-medium text-gray-900">Assignments Expiring in Next 10 Days</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {expiringAssignments.map((entry, index) => {
                const dateObj = new Date(entry.date + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const day = dateObj.getDate();
                const isTodayDate = new Date().toISOString().split('T')[0] === entry.date;
                const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === entry.date;

                return (
                  <button
                    key={`${entry.date}-${entry.deskNumber}-${index}`}
                    onClick={() => onExpiringClick?.(entry)}
                    className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-left hover:bg-red-100 hover:border-red-300 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-red-700">
                      {dayName}, {monthName} {day}
                      {isTodayDate && <span className="ml-1 text-xs">(Today)</span>}
                      {isTomorrow && <span className="ml-1 text-xs">(Tomorrow)</span>}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      <div>{entry.personName}</div>
                      <div className="font-medium">Desk {entry.deskNumber}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
