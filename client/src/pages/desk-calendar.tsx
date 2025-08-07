import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DeskCell from '@/components/DeskCell';
import PersonModal from '@/components/PersonModal';
import AvailabilityRangeModal from '@/components/AvailabilityRangeModal';
import { 
  DESKS, 
  getBooking, 
  saveBooking, 
  deleteBooking, 
  bulkUpdateBookings,
  getDeskStats,
  exportData
} from '@/lib/localStorage';
import { getWeekRange, getWeekRangeString } from '@/lib/dateUtils';
import { DeskBooking, DeskStatus } from '@shared/schema';
import { generateDateRange } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';

export default function DeskCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<{
    booking: DeskBooking | null;
    deskId: string;
    date: string;
  } | null>(null);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const { toast } = useToast();

  const currentWeek = getWeekRange(weekOffset);
  const weekRangeString = getWeekRangeString(weekOffset);
  const dates = currentWeek.map(day => day.dateString);
  const stats = getDeskStats(dates);

  const handleDeskClick = useCallback((deskId: string, date: string) => {
    const booking = getBooking(deskId, date);
    
    if (booking?.status === 'assigned' || booking?.personName) {
      // Open person modal for assigned desks or desks with names
      setSelectedBooking({ booking, deskId, date });
      setIsPersonModalOpen(true);
    } else {
      // Cycle through statuses for other desks
      const currentStatus = booking?.status || 'available';
      const statusCycle: DeskStatus[] = ['available', 'booked', 'unavailable'];
      const currentIndex = statusCycle.indexOf(currentStatus);
      const nextIndex = (currentIndex + 1) % statusCycle.length;
      const nextStatus = statusCycle[nextIndex];

      if (nextStatus === 'available') {
        // Remove booking
        deleteBooking(deskId, date);
      } else {
        // Create or update booking
        const newBooking: DeskBooking = {
          id: `${deskId}-${date}`,
          deskId,
          date,
          status: nextStatus,
          createdAt: booking?.createdAt || new Date().toISOString(),
        };
        saveBooking(newBooking);
      }

      toast({
        title: "Desk Status Updated",
        description: `Desk status set to ${nextStatus}`,
      });
    }
  }, [toast]);

  const handlePersonSave = useCallback((personName: string) => {
    if (!selectedBooking) return;

    const { deskId, date } = selectedBooking;
    const newBooking: DeskBooking = {
      id: `${deskId}-${date}`,
      deskId,
      date,
      status: 'assigned',
      personName,
      createdAt: selectedBooking.booking?.createdAt || new Date().toISOString(),
    };

    saveBooking(newBooking);
    setSelectedBooking(null);
    
    toast({
      title: "Person Assigned",
      description: `${personName} assigned to desk`,
    });
  }, [selectedBooking, toast]);

  const handleBulkAvailability = useCallback((
    startDate: string,
    endDate: string,
    deskIds: string[],
    status: DeskStatus
  ) => {
    const dateRange = generateDateRange(startDate, endDate);
    bulkUpdateBookings(deskIds, dateRange, status);
    
    toast({
      title: "Bulk Update Applied",
      description: `${deskIds.length} desks updated for ${dateRange.length} days`,
    });
  }, [toast]);

  const handleExport = useCallback(() => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `desk-bookings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data Exported",
        description: "Booking data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="material-icon text-blue-600 text-2xl mr-3">domain</span>
              <h1 className="text-xl font-medium text-gray-900">Coworking Desk Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setIsRangeModalOpen(true)}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <span className="material-icon text-sm mr-2">date_range</span>
                Set Availability
              </Button>
              <Button
                onClick={handleExport}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <span className="material-icon text-sm mr-2">download</span>
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Calendar Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  className="p-2 rounded-full"
                >
                  <span className="material-icon text-gray-600">chevron_left</span>
                </Button>
                <div className="flex flex-col">
                  <h2 className="text-lg font-medium text-gray-900">{weekRangeString}</h2>
                  <p className="text-sm text-gray-500">Week View</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  className="p-2 rounded-full"
                >
                  <span className="material-icon text-gray-600">chevron_right</span>
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-gray-100 text-gray-700"
                >
                  Week
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 hover:bg-gray-100"
                >
                  Month
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Legend */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-600 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-600 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Booked</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Unavailable</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Person Assigned</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desk Management Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Date
                  </th>
                  {DESKS.map((desk) => (
                    <th
                      key={desk.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                    >
                      <div className="flex flex-col">
                        <span className={`font-semibold ${
                          desk.room === 1 ? 'text-blue-600' : 'text-pink-600'
                        }`}>
                          Room {desk.room}
                        </span>
                        <span>Desk {desk.number}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentWeek.map((day) => (
                  <tr key={day.dateString} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {day.dayName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {day.fullDate}
                        </span>
                      </div>
                    </td>
                    {DESKS.map((desk) => (
                      <td key={desk.id} className="px-2 py-3 text-center">
                        <DeskCell
                          deskId={desk.id}
                          date={day.dateString}
                          booking={getBooking(desk.id, day.dateString)}
                          onClick={() => handleDeskClick(desk.id, day.dateString)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Desk Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="material-icon text-green-600 text-2xl">check_circle</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Available</p>
                  <p className="text-lg font-semibold text-green-600">{stats.available}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="material-icon text-blue-600 text-2xl">person</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Assigned</p>
                  <p className="text-lg font-semibold text-blue-600">{stats.assigned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="material-icon text-orange-600 text-2xl">event_busy</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Booked</p>
                  <p className="text-lg font-semibold text-orange-600">{stats.booked}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="material-icon text-red-600 text-2xl">block</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Unavailable</p>
                  <p className="text-lg font-semibold text-red-600">{stats.unavailable}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Person Modal */}
      <PersonModal
        isOpen={isPersonModalOpen}
        onClose={() => {
          setIsPersonModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking?.booking || null}
        deskId={selectedBooking?.deskId || ''}
        date={selectedBooking?.date || ''}
        onSave={handlePersonSave}
      />

      {/* Availability Range Modal */}
      <AvailabilityRangeModal
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
        onApply={handleBulkAvailability}
      />
    </div>
  );
}
