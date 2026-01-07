import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DeskCell from '@/components/DeskCell';
import PersonModal from '@/components/PersonModal';
import BookingModal from '@/components/BookingModal';
import AvailabilityRangeModal from '@/components/AvailabilityRangeModal';
import FloorPlanModal from '@/components/FloorPlanModal';
import DataMigrationModal from '@/components/DataMigrationModal';
import { 
  DESKS
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
import { useNextDates } from '@/hooks/use-next-dates';
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings';
import { useBookings, useBookingStats } from '@/hooks/use-bookings';
import { useQueryClient } from '@tanstack/react-query';
import { currencySymbols, getCurrency } from '@/lib/settings';
import CurrencySelector from '@/components/CurrencySelector';
import WaitingList from '@/components/WaitingList';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';

export default function DeskCalendar() {
  const { user, signOut } = useAuth();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<{
    booking: DeskBooking | null;
    deskId: string;
    date: string;
  } | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('EUR');
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [isFloorPlanModalOpen, setIsFloorPlanModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tableRef = useRef<HTMLDivElement>(null);

  const currentWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const currentMonth = useMemo(() => getMonthRange(monthOffset), [monthOffset]);
  const weekRangeString = useMemo(() => getWeekRangeString(weekOffset), [weekOffset]);
  const monthRangeString = useMemo(() => getMonthRangeString(monthOffset), [monthOffset]);
  
  const currentDates = useMemo(() => viewMode === 'week' ? currentWeek : currentMonth, [viewMode, currentWeek, currentMonth]);
  const dates = useMemo(() => currentDates.map(day => day.dateString), [currentDates]);

  // Calculate date range for fetching bookings (first and last date in current view)
  const startDate = useMemo(() => dates.length > 0 ? dates[0] : undefined, [dates]);
  const endDate = useMemo(() => dates.length > 0 ? dates[dates.length - 1] : undefined, [dates]);

  // Use React Query hooks for data - fetch only bookings in the current date range
  const { data: bookings = {}, isLoading: bookingsLoading } = useBookings(startDate, endDate);
  const { data: stats = { available: 0, assigned: 0, booked: 0 }, isLoading: statsLoading } = useBookingStats(dates);
  const { data: nextDatesData, isLoading: nextDatesLoading, error: nextDatesError } = useNextDates();
  
  // Set up real-time subscriptions
  useRealtimeBookings();

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Extract data from hook with fallbacks
  const nextAvailableDates = nextDatesData?.available || [];
  const nextBookedDates = nextDatesData?.booked || [];
  const expiringAssignments = nextDatesData?.expiring || [];
  
  // Helper function to check if date is weekend
  const isWeekend = (dateString: string): boolean => {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  // Set current currency on load
  useEffect(() => {
    setCurrentCurrency(getCurrency());
  }, []);

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
      
      // Refresh React Query data
      queryClient.invalidateQueries({ queryKey: ['desk-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['desk-stats'] });
      queryClient.invalidateQueries({ queryKey: ['next-dates'] });

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
  }, [toast, currentCurrency]);

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

    const { deskId, booking: existingBooking } = selectedBooking;
    
    // Generate new date range
    const newDateRange = generateDateRange(bookingData.startDate, bookingData.endDate);
    
    // If editing existing booking, get the old date range for cleanup
    let oldDateRange: string[] = [];
    if (existingBooking) {
      oldDateRange = generateDateRange(existingBooking.startDate, existingBooking.endDate);
    }
    
    // Check for conflicts on new dates (excluding dates that are part of the existing booking)
    const conflictDates: string[] = [];
    const conflictDetails: string[] = [];
    
    for (const date of newDateRange) {
      // Skip conflict check if this date was part of the original booking
      if (existingBooking && oldDateRange.includes(date)) {
        continue;
      }
      
      const existingBookingOnDate = await dataStore.getBooking(deskId, date);
      if (existingBookingOnDate && existingBookingOnDate.status !== 'available') {
        conflictDates.push(date);
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
        
        if (existingBookingOnDate.personName) {
          conflictDetails.push(`${formattedDate}: ${existingBookingOnDate.personName} (${existingBookingOnDate.status})`);
        } else {
          conflictDetails.push(`${formattedDate}: Desk is ${existingBookingOnDate.status}`);
        }
      }
    }
    
    if (conflictDates.length > 0) {
      const errorMessage = `Cannot create booking due to conflicts on the following dates:\n\n${conflictDetails.join('\n')}\n\nPlease choose different dates or select available time slots.`;
      throw new Error(errorMessage);
    }
    
    // If editing existing booking, first delete bookings that are no longer needed
    if (existingBooking && oldDateRange.length > 0) {
      const datesToDelete = oldDateRange.filter(date => !newDateRange.includes(date));
      for (const date of datesToDelete) {
        await dataStore.deleteBooking(deskId, date);
      }
    }
    
    const bookingsToCreate: DeskBooking[] = [];
    
    // Create or update bookings for each day in the new range
    for (const date of newDateRange) {
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
        // Preserve original createdAt for existing bookings, use current time for new ones
        createdAt: (existingBooking && oldDateRange.includes(date)) ? 
                   existingBooking.createdAt : 
                   new Date().toISOString(),
      };
      bookingsToCreate.push(newBooking);
    }

    // Save all bookings in the range
    await dataStore.bulkUpdateBookings(bookingsToCreate);
    
    // Only refetch manually if not using real-time updates (localStorage mode)
    const storageType = import.meta.env.VITE_STORAGE_TYPE;
    if (storageType === 'localStorage') {
      // For localStorage, manually refetch since there's no real-time subscription
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['desk-bookings'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['desk-stats'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['next-dates'], type: 'active' })
      ]);
    }
    // For Supabase/hybrid modes, real-time subscription handles the refresh automatically
    
    const statusText = bookingData.status === 'assigned' ? 'assigned (paid)' : 'booked';
    const dayCount = newDateRange.length;
    const currencySymbol = currencySymbols[bookingData.currency];
    const isUpdate = existingBooking !== null;
    toast({
      title: isUpdate ? "Desk Booking Updated" : "Desk Booking Created",
      description: `${bookingData.personName} ${statusText} for ${dayCount} day${dayCount > 1 ? 's' : ''} - ${currencySymbol}${bookingData.price} total`,
    });
  }, [selectedBooking, toast, queryClient]);

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
    
    // Refresh React Query data
    queryClient.invalidateQueries({ queryKey: ['desk-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['desk-stats'] });
    queryClient.invalidateQueries({ queryKey: ['next-dates'] });
    
    toast({
      title: "Person Assigned",
      description: `${personName} assigned to desk`,
    });
  }, [selectedBooking, toast, currentCurrency]);

  const handleBulkAvailability = useCallback(async (
    startDate: string,
    endDate: string,
    deskIds: string[],
    status: DeskStatus
  ) => {
    const dateRange = generateDateRange(startDate, endDate);
    
    // Create booking updates for bulk operation
    const bulkBookings: DeskBooking[] = [];
    const bookingsToDelete: { deskId: string; date: string }[] = [];
    
    for (const deskId of deskIds) {
      for (const date of dateRange) {
        if (status === 'available') {
          // For available status, collect bookings to delete
          bookingsToDelete.push({ deskId, date });
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
    
    // Batch process all operations
    await Promise.all([
      // Use bulk delete if available, otherwise fall back to individual deletes
      bookingsToDelete.length > 0 ? (
        dataStore.bulkDeleteBookings ? 
          dataStore.bulkDeleteBookings(bookingsToDelete) :
          Promise.all(bookingsToDelete.map(({ deskId, date }) => 
            dataStore.deleteBooking(deskId, date).catch(error => 
              console.error(`Failed to delete booking ${deskId}-${date}:`, error)
            )
          ))
      ) : Promise.resolve(),
      // Bulk create/update bookings for non-available status
      bulkBookings.length > 0 ? dataStore.bulkUpdateBookings(bulkBookings) : Promise.resolve()
    ]);
    
    // Only refetch manually if not using real-time updates (localStorage mode)
    const storageType = import.meta.env.VITE_STORAGE_TYPE;
    if (storageType === 'localStorage') {
      // For localStorage, manually refetch since there's no real-time subscription
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['desk-bookings'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['desk-stats'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['next-dates'], type: 'active' })
      ]);
    }
    // For Supabase/hybrid modes, real-time subscription handles the refresh automatically
    
    toast({
      title: "Bulk Update Applied",
      description: `${deskIds.length} desks updated for ${dateRange.length} days`,
    });
  }, [toast, currentCurrency]);

  const handleExport = useCallback(async () => {
    try {
      // Get all bookings from the current data store
      const allBookings = await dataStore.getAllBookings();
      
      // Prepare export data
      const exportData = {
        bookings: allBookings,
        exportDate: new Date().toISOString(),
        version: '1.0',
        totalBookings: Object.keys(allBookings).length
      };
      
      const data = JSON.stringify(exportData, null, 2);
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
        description: `Successfully exported ${Object.keys(allBookings).length} bookings`,
      });
    } catch (error) {
      console.error('Export error:', error);
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
              <h1 className="text-lg sm:text-xl font-medium text-gray-900">
                <span className="hidden sm:inline">Coworking Desk Manager</span>
                <span className="sm:hidden">Desk Manager</span>
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <SyncStatusIndicator />
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
              <Button
                onClick={() => setIsMigrationModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <span className="material-icon text-sm mr-2">sync</span>
                Migrate
              </Button>
              <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <Button
                  onClick={() => signOut()}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex lg:hidden items-center space-x-2">
              <SyncStatusIndicator />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-3">
                <CurrencySelector onCurrencyChange={setCurrentCurrency} />
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsFloorPlanModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 justify-start"
                >
                  <span className="material-icon text-sm mr-2">map</span>
                  Floor Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRangeModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 justify-start"
                >
                  <span className="material-icon text-sm mr-2">date_range</span>
                  Set Availability
                </Button>
                <Button
                  onClick={() => {
                    handleExport();
                    setIsMobileMenuOpen(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 justify-start"
                >
                  <span className="material-icon text-sm mr-2">download</span>
                  Export
                </Button>
                <Button
                  onClick={() => {
                    setIsMigrationModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 justify-start"
                >
                  <span className="material-icon text-sm mr-2">sync</span>
                  Migrate
                </Button>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">{user?.email}</span>
                  <Button
                    onClick={() => signOut()}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                  className="p-2 rounded-full touch-manipulation"
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
                  className="p-2 rounded-full touch-manipulation"
                >
                  <span className="material-icon text-gray-600">chevron_right</span>
                </Button>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-end">
                <Button
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className={`touch-manipulation ${viewMode === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className={`touch-manipulation ${viewMode === 'month' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
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
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 sm:w-32 sticky left-0 bg-gray-50 z-20">
                    <span className="hidden sm:inline">Desk</span>
                    <span className="sm:hidden">D</span>
                  </th>
                  {currentDates.map((day) => {
                    const isTodayColumn = isToday(day.dateString);
                    const isWeekendColumn = isWeekend(day.dateString);
                    return (
                      <th
                        key={day.dateString}
                        className={`px-2 sm:px-3 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[100px] sm:min-w-[120px] ${
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
                    <td className="px-2 sm:px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">
                          <span className="sm:hidden">{desk.number}</span>
                          <span className="hidden sm:inline">Desk {desk.number}</span>
                        </span>
                        <span className={`text-[10px] sm:text-xs ${
                          desk.room === 1 ? 'text-blue-600' : 'text-pink-600'
                        }`}>
                          <span className="sm:hidden">R{desk.room}</span>
                          <span className="hidden sm:inline">Room {desk.room}</span>
                        </span>
                      </div>
                    </td>
                    {currentDates.map((day) => {
                      const isTodayColumn = isToday(day.dateString);
                      const isWeekendColumn = isWeekend(day.dateString);
                      return (
                        <td 
                          key={day.dateString} 
                          className={`px-1 sm:px-2 py-2 sm:py-3 text-center ${
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

      <DataMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </div>
  );
}
