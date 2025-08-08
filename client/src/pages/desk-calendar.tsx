import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DeskCell from '@/components/DeskCell';
import PersonModal from '@/components/PersonModal';
import BookingModal from '@/components/BookingModal';
import AvailabilityRangeModal from '@/components/AvailabilityRangeModal';
import FloorPlanModal from '@/components/FloorPlanModal';
import { 
  DESKS, 
  exportData
} from '@/lib/localStorage';
import { dataStore } from '@/lib/dataStore';
import { 
  getWeekRange, 
  getWeekRangeString, 
  getMonthRange, 
  getMonthRangeString 
} from '@/lib/dateUtils';
import { DeskBooking, DeskStatus, Currency } from '@shared/schema';
import { generateDateRange } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { currencySymbols, getCurrency } from '@/lib/settings';
import CurrencySelector from '@/components/CurrencySelector';
import WaitingList from '@/components/WaitingList';

export default function DeskCalendar() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<{
    booking: DeskBooking | null;
    deskId: string;
    date: string;
  } | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('BGN');
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [isFloorPlanModalOpen, setIsFloorPlanModalOpen] = useState(false);
  const { toast } = useToast();
  const tableRef = useRef<HTMLDivElement>(null);

  const currentWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const currentMonth = useMemo(() => getMonthRange(monthOffset), [monthOffset]);
  const weekRangeString = useMemo(() => getWeekRangeString(weekOffset), [weekOffset]);
  const monthRangeString = useMemo(() => getMonthRangeString(monthOffset), [monthOffset]);
  
  const currentDates = useMemo(() => viewMode === 'week' ? currentWeek : currentMonth, [viewMode, currentWeek, currentMonth]);
  const dates = useMemo(() => currentDates.map(day => day.dateString), [currentDates]);
  const [stats, setStats] = useState({ available: 0, assigned: 0, booked: 0 });
  const [bookings, setBookings] = useState<Record<string, DeskBooking>>({}); 
  const [nextAvailableDates, setNextAvailableDates] = useState<string[]>([]);
  const [nextBookedDates, setNextBookedDates] = useState<{ date: string, names: string[] }[]>([]);
  const [expiringAssignments, setExpiringAssignments] = useState<{ date: string, personName: string, deskNumber: number }[]>([]);
  
  // Helper function to check if date is weekend (moved here to be used in calculateNextDates)
  const isWeekend = (dateString: string): boolean => {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };
  
  // Calculate next available and booked dates
  const calculateNextDates = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const availableDates: string[] = [];
    const bookedDatesMap = new Map<string, Set<string>>();
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + 1); // Start from tomorrow, not today
    
    // Check up to 90 days ahead
    const maxDaysToCheck = 90;
    let daysChecked = 0;
    
    while ((availableDates.length < 5 || bookedDatesMap.size < 3) && daysChecked < maxDaysToCheck) {
      const dateString = checkDate.toISOString().split('T')[0];
      
      // Skip weekends
      if (!isWeekend(dateString)) {
        // Check each desk on this date
        let hasAvailableDesk = false;
        const bookedNames = new Set<string>();
        
        for (const desk of DESKS) {
          const booking = await dataStore.getBooking(desk.id, dateString);
          if (!booking) {
            // No booking means the desk is available
            hasAvailableDesk = true;
          } else if (booking.status === 'available') {
            // Explicitly marked as available
            hasAvailableDesk = true;
          } else if (booking.status === 'booked' && booking.personName) {
            // Booked (not assigned/paid)
            bookedNames.add(booking.personName);
          }
        }
        
        // Track available dates
        if (hasAvailableDesk && availableDates.length < 5) {
          availableDates.push(dateString);
        }
        
        // Track booked dates with names
        if (bookedNames.size > 0 && bookedDatesMap.size < 3) {
          bookedDatesMap.set(dateString, bookedNames);
        }
      }
      
      checkDate.setDate(checkDate.getDate() + 1);
      daysChecked++;
    }
    
    // Convert booked dates map to array format
    const bookedDates = Array.from(bookedDatesMap.entries()).map(([date, names]) => ({
      date,
      names: Array.from(names)
    }));
    
    // Check for expiring assignments in the next 10 days
    const expiring: { date: string, personName: string, deskNumber: number }[] = [];
    const checkDates: string[] = [];
    
    // Generate dates for the next 10 days
    for (let i = 1; i <= 10; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + i);
      checkDates.push(futureDate.toISOString().split('T')[0]);
    }
    
    for (const dateString of checkDates) {
      // Skip weekends for expiring assignments too
      if (!isWeekend(dateString)) {
        for (const desk of DESKS) {
          const booking = await dataStore.getBooking(desk.id, dateString);
          // Check if it's an assigned (paid) booking that will end on this date
          if (booking && booking.status === 'assigned' && booking.personName && booking.endDate === dateString) {
            expiring.push({
              date: dateString,
              personName: booking.personName,
              deskNumber: desk.number
            });
          }
        }
      }
    }
    
    return { available: availableDates, booked: bookedDates, expiring };
  }, []);

  // Load initial data and stats when dates change
  useEffect(() => {
    const loadData = async () => {
      const [allBookings, currentStats, nextDates] = await Promise.all([
        dataStore.getAllBookings(),
        dataStore.getDeskStats(dates),
        calculateNextDates()
      ]);
      setBookings(allBookings);
      setStats(currentStats);
      setNextAvailableDates(nextDates.available);
      setNextBookedDates(nextDates.booked);
      setExpiringAssignments(nextDates.expiring);
      setCurrentCurrency(getCurrency());
    };
    
    loadData();
  }, [dates, calculateNextDates]);

  // Auto-scroll to today's column when view changes
  useEffect(() => {
    if (viewMode === 'month' && monthOffset === 0 && tableRef.current) {
      const todayIndex = currentDates.findIndex(day => isToday(day.dateString));
      if (todayIndex >= 0) {
        // Scroll to today's column after a short delay to ensure DOM is ready
        setTimeout(() => {
          if (tableRef.current) {
            const columnWidth = 120; // min-width from CSS
            const scrollPosition = Math.max(0, (todayIndex * columnWidth) - 32); // 32px offset for sticky desk column
            tableRef.current.scrollLeft = scrollPosition;
          }
        }, 100);
      }
    }
  }, [viewMode, monthOffset, currentDates]);

  // Helper function to get booking for a desk/date
  const getBookingForCell = (deskId: string, date: string): DeskBooking | null => {
    const key = `${deskId}-${date}`;
    return bookings[key] || null;
  };

  // Helper function to check if date is today
  const isToday = (dateString: string): boolean => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    return dateString === todayString;
  };

  const handleDeskClick = useCallback(async (deskId: string, date: string, event?: React.MouseEvent) => {
    // Don't allow clicking on weekend days
    if (isWeekend(date)) {
      return;
    }
    
    const booking = await dataStore.getBooking(deskId, date);
    
    // Right click or Ctrl+Click for quick status cycling
    if (event?.ctrlKey || event?.button === 2) {
      event?.preventDefault();
      
      const currentStatus = booking?.status || 'available';
      const statusCycle: DeskStatus[] = ['available', 'booked'];
      const currentIndex = statusCycle.indexOf(currentStatus);
      const nextIndex = (currentIndex + 1) % statusCycle.length;
      const nextStatus = statusCycle[nextIndex];

      if (nextStatus === 'available') {
        await dataStore.deleteBooking(deskId, date);
      } else {
        const newBooking: DeskBooking = {
          id: `${deskId}-${date}`,
          deskId,
          date,
          startDate: date,
          endDate: date,
          status: nextStatus,
          personName: booking?.personName,
          title: booking?.title,
          price: booking?.price,
          currency: booking?.currency || currentCurrency || 'BGN',
          createdAt: booking?.createdAt || new Date().toISOString(),
        };
        await dataStore.saveBooking(newBooking);
      }
      
      // Refresh data
      const [allBookings, newStats, nextDates] = await Promise.all([
        dataStore.getAllBookings(),
        dataStore.getDeskStats(dates),
        calculateNextDates()
      ]);
      setBookings(allBookings);
      setStats(newStats);
      setNextAvailableDates(nextDates.available);
      setNextBookedDates(nextDates.booked);
      setExpiringAssignments(nextDates.expiring);

      toast({
        title: "Desk Status Updated",
        description: `Desk status set to ${nextStatus}`,
      });
      
      return;
    }
    
    if (booking?.status === 'booked' || booking?.status === 'assigned') {
      // Open booking modal for existing bookings to edit
      setSelectedBooking({ booking, deskId, date });
      setIsBookingModalOpen(true);
    } else if (booking?.status === 'available' || !booking) {
      // For available desks, open booking modal to create new booking
      setSelectedBooking({ booking: null, deskId, date });
      setIsBookingModalOpen(true);
    }
  }, [dates, toast, calculateNextDates, currentCurrency]);

  const handleBookingSave = useCallback(async (bookingData: {
    personName: string;
    title: string;
    price: number;
    status: DeskStatus;
    startDate: string;
    endDate: string;
    currency: Currency;
  }) => {
    if (!selectedBooking) return;

    const { deskId } = selectedBooking;
    
    // Generate all dates in the range
    const dateRange = generateDateRange(bookingData.startDate, bookingData.endDate);
    
    // Check for conflicts unless we're editing an existing booking
    if (!selectedBooking.booking) {
      const conflictDates: string[] = [];
      const conflictDetails: string[] = [];
      
      for (const date of dateRange) {
        const existingBooking = await dataStore.getBooking(deskId, date);
        if (existingBooking && existingBooking.status !== 'available') {
          conflictDates.push(date);
          const dateObj = new Date(date + 'T00:00:00');
          const formattedDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
          
          if (existingBooking.personName) {
            conflictDetails.push(`${formattedDate}: ${existingBooking.personName} (${existingBooking.status})`);
          } else {
            conflictDetails.push(`${formattedDate}: Desk is ${existingBooking.status}`);
          }
        }
      }
      
      if (conflictDates.length > 0) {
        const errorMessage = `Cannot create booking due to conflicts on the following dates:\n\n${conflictDetails.join('\n')}\n\nPlease choose different dates or select available time slots.`;
        throw new Error(errorMessage);
      }
    }
    
    const bookingsToCreate: DeskBooking[] = [];
    
    // Create a booking for each day in the range
    for (const date of dateRange) {
      const newBooking: DeskBooking = {
        id: `${deskId}-${date}`,
        deskId,
        date,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        status: bookingData.status,
        personName: bookingData.personName,
        title: bookingData.title,
        price: bookingData.price,
        currency: bookingData.currency || currentCurrency,
        createdAt: new Date().toISOString(),
      };
      bookingsToCreate.push(newBooking);
    }

    // Save all bookings in the range
    await dataStore.bulkUpdateBookings(bookingsToCreate);
    setSelectedBooking(null);
    
    // Refresh data
    const [allBookings, newStats, nextDates] = await Promise.all([
      dataStore.getAllBookings(),
      dataStore.getDeskStats(dates),
      calculateNextDates()
    ]);
    setBookings(allBookings);
    setStats(newStats);
    setNextAvailableDates(nextDates.available);
    setNextBookedDates(nextDates.booked);
    setExpiringAssignments(nextDates.expiring);
    
    const statusText = bookingData.status === 'assigned' ? 'assigned (paid)' : 'booked';
    const dayCount = dateRange.length;
    const currencySymbol = currencySymbols[bookingData.currency];
    toast({
      title: "Desk Booking Created",
      description: `${bookingData.personName} ${statusText} for ${dayCount} day${dayCount > 1 ? 's' : ''} - ${currencySymbol}${bookingData.price} total`,
    });
  }, [selectedBooking, dates, toast, calculateNextDates]);

  const handlePersonSave = useCallback(async (personName: string) => {
    if (!selectedBooking) return;

    const { deskId, date } = selectedBooking;
    const newBooking: DeskBooking = {
      id: `${deskId}-${date}`,
      deskId,
      date,
      startDate: selectedBooking.booking?.startDate || date,
      endDate: selectedBooking.booking?.endDate || date,
      status: 'assigned',
      personName,
      title: selectedBooking.booking?.title,
      price: selectedBooking.booking?.price,
      currency: selectedBooking.booking?.currency || currentCurrency || 'BGN',
      createdAt: selectedBooking.booking?.createdAt || new Date().toISOString(),
    };

    await dataStore.saveBooking(newBooking);
    setSelectedBooking(null);
    
    // Refresh data
    const [allBookings, newStats, nextDates] = await Promise.all([
      dataStore.getAllBookings(),
      dataStore.getDeskStats(dates),
      calculateNextDates()
    ]);
    setBookings(allBookings);
    setStats(newStats);
    setNextAvailableDates(nextDates.available);
    setNextBookedDates(nextDates.booked);
    setExpiringAssignments(nextDates.expiring);
    
    toast({
      title: "Person Assigned",
      description: `${personName} assigned to desk`,
    });
  }, [selectedBooking, dates, toast, calculateNextDates, currentCurrency]);

  const handleBulkAvailability = useCallback(async (
    startDate: string,
    endDate: string,
    deskIds: string[],
    status: DeskStatus
  ) => {
    const dateRange = generateDateRange(startDate, endDate);
    
    // Create booking updates for bulk operation
    const bulkBookings: DeskBooking[] = [];
    for (const deskId of deskIds) {
      for (const date of dateRange) {
        if (status === 'available') {
          // For available status, we delete the booking
          await dataStore.deleteBooking(deskId, date);
        } else {
          // For booked status, create a new booking
          const booking: DeskBooking = {
            id: `${deskId}-${date}`,
            deskId,
            date,
            startDate: date,
            endDate: date,
            status,
            personName: undefined,
            title: undefined,
            price: undefined,
            currency: currentCurrency || 'BGN',
            createdAt: new Date().toISOString(),
          };
          bulkBookings.push(booking);
        }
      }
    }
    
    if (bulkBookings.length > 0) {
      await dataStore.bulkUpdateBookings(bulkBookings);
    }
    
    // Refresh data
    const [allBookings, newStats, nextDates] = await Promise.all([
      dataStore.getAllBookings(),
      dataStore.getDeskStats(dates),
      calculateNextDates()
    ]);
    setBookings(allBookings);
    setStats(newStats);
    setNextAvailableDates(nextDates.available);
    setNextBookedDates(nextDates.booked);
    setExpiringAssignments(nextDates.expiring);
    
    toast({
      title: "Bulk Update Applied",
      description: `${deskIds.length} desks updated for ${dateRange.length} days`,
    });
  }, [dates, toast, calculateNextDates, currentCurrency]);

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
              <CurrencySelector onCurrencyChange={setCurrentCurrency} />
              <Button
                variant="outline"
                onClick={() => setIsFloorPlanModalOpen(true)}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <span className="material-icon text-sm mr-2">map</span>
                Floor Plan
              </Button>
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
                  onClick={() => {
                    if (viewMode === 'week') {
                      setWeekOffset(weekOffset - 1);
                    } else {
                      setMonthOffset(monthOffset - 1);
                    }
                  }}
                  className="p-2 rounded-full"
                >
                  <span className="material-icon text-gray-600">chevron_left</span>
                </Button>
                <div className="flex flex-col">
                  <h2 className="text-lg font-medium text-gray-900">
                    {viewMode === 'week' ? weekRangeString : monthRangeString}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {viewMode === 'week' ? 'Week View' : 'Month View'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (viewMode === 'week') {
                      setWeekOffset(weekOffset + 1);
                    } else {
                      setMonthOffset(monthOffset + 1);
                    }
                  }}
                  className="p-2 rounded-full"
                >
                  <span className="material-icon text-gray-600">chevron_right</span>
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className={viewMode === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className={viewMode === 'month' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
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
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Person Assigned</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desk Management Table */}
        <Card className="overflow-hidden">
          <div ref={tableRef} className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 sticky left-0 bg-gray-50 z-20">
                    Desk
                  </th>
                  {currentDates.map((day) => {
                    const isTodayColumn = isToday(day.dateString);
                    const isWeekendColumn = isWeekend(day.dateString);
                    return (
                      <th
                        key={day.dateString}
                        className={`px-3 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[120px] ${
                          isTodayColumn 
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-r-2 border-blue-300' 
                            : isWeekendColumn
                            ? 'bg-gray-100 text-gray-400'
                            : 'text-gray-500'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-semibold ${
                            isTodayColumn ? 'text-blue-900' : isWeekendColumn ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {day.dayName}
                          </span>
                          <span className="text-xs">
                            {day.fullDate}
                          </span>
                          {isTodayColumn && (
                            <span className="text-xs font-medium text-blue-600 mt-1">TODAY</span>
                          )}
                          {isWeekendColumn && (
                            <span className="text-xs font-medium text-gray-400 mt-1">WEEKEND</span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {DESKS.map((desk) => (
                  <tr key={desk.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">
                          Desk {desk.number}
                        </span>
                        <span className={`text-xs ${
                          desk.room === 1 ? 'text-blue-600' : 'text-pink-600'
                        }`}>
                          Room {desk.room}
                        </span>
                      </div>
                    </td>
                    {currentDates.map((day) => {
                      const isTodayColumn = isToday(day.dateString);
                      const isWeekendColumn = isWeekend(day.dateString);
                      return (
                        <td 
                          key={day.dateString} 
                          className={`px-2 py-3 text-center ${
                            isTodayColumn 
                              ? 'bg-blue-50 border-l-2 border-r-2 border-blue-300' 
                              : isWeekendColumn
                              ? 'bg-gray-100'
                              : ''
                          }`}
                        >
                          <DeskCell
                            deskId={desk.id}
                            date={day.dateString}
                            booking={getBookingForCell(desk.id, day.dateString)}
                            onClick={(e) => handleDeskClick(desk.id, day.dateString, e)}
                            isWeekend={isWeekendColumn}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Next Available and Booked Dates */}
        <Card className="mt-6">
          <CardContent className="p-4">
            {/* Available Dates Section */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <span className="material-icon text-green-600 text-xl mr-2">event_available</span>
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
                  <span className="material-icon text-orange-600 text-xl mr-2">event_busy</span>
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
                  <span className="material-icon text-red-600 text-xl mr-2">alarm</span>
                  <h3 className="text-sm font-medium text-gray-900">Assignments Expiring in Next 10 Days</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {expiringAssignments.map(({ date, personName, deskNumber }, index) => {
                    const dateObj = new Date(date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                    const day = dateObj.getDate();
                    const isToday = new Date().toISOString().split('T')[0] === date;
                    const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === date;
                    
                    return (
                      <div key={`${date}-${deskNumber}-${index}`} className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                        <div className="font-medium text-red-700">
                          {dayName}, {monthName} {day}
                          {isToday && <span className="ml-1 text-xs">(Today)</span>}
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

        {/* Waiting List */}
        <div className="mt-6">
          <WaitingList />
        </div>

        {/* Desk Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <span className="material-icon text-blue-600 text-2xl">person</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Assigned</p>
                  <p className="text-lg font-semibold text-blue-600">{stats.assigned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking?.booking || null}
        deskId={selectedBooking?.deskId || ''}
        date={selectedBooking?.date || ''}
        currency={currentCurrency}
        onSave={handleBookingSave}
      />

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

      {/* Floor Plan Modal */}
      <FloorPlanModal
        isOpen={isFloorPlanModalOpen}
        onClose={() => setIsFloorPlanModalOpen(false)}
      />
    </div>
  );
}
