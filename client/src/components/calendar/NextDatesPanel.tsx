import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, CalendarX, Bell } from 'lucide-react';

interface NextDatesPanelProps {
  nextAvailableDates: string[];
  nextBookedDates: { date: string; names: string[] }[];
  expiringAssignments: { date: string; personName: string; deskNumber: number }[];
}

export default function NextDatesPanel({
  nextAvailableDates,
  nextBookedDates,
  expiringAssignments,
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
                  <div key={date} className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <div className="font-medium text-green-700">{dayName}, {monthName} {day}</div>
                  </div>
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
              {nextBookedDates.map(({ date, names }) => {
                const dateObj = new Date(date + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const day = dateObj.getDate();
                return (
                  <div key={date} className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                    <div className="font-medium text-orange-700">{dayName}, {monthName} {day}</div>
                    <div className="text-xs text-orange-600 mt-1">
                      {names.join(', ')}
                    </div>
                  </div>
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
              {expiringAssignments.map(({ date, personName, deskNumber }, index) => {
                const dateObj = new Date(date + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const day = dateObj.getDate();
                const isTodayDate = new Date().toISOString().split('T')[0] === date;
                const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === date;

                return (
                  <div key={`${date}-${deskNumber}-${index}`} className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <div className="font-medium text-red-700">
                      {dayName}, {monthName} {day}
                      {isTodayDate && <span className="ml-1 text-xs">(Today)</span>}
                      {isTomorrow && <span className="ml-1 text-xs">(Tomorrow)</span>}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      <div>{personName}</div>
                      <div className="font-medium">Desk {deskNumber}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
