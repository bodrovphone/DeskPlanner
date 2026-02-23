import { useCallback } from 'react';
import { dataStore } from '@/lib/dataStore';
import { DeskBooking, DeskStatus, Currency, Desk } from '@shared/schema';
import { generateDateRange } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { currencySymbols } from '@/lib/settings';

function isWeekend(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function invalidateBookingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['desk-bookings'] });
  queryClient.invalidateQueries({ queryKey: ['desk-stats'] });
  queryClient.invalidateQueries({ queryKey: ['next-dates'] });
}

async function refetchLocalStorageQueries(queryClient: ReturnType<typeof useQueryClient>) {
  const storageType = import.meta.env.VITE_STORAGE_TYPE;
  if (storageType === 'localStorage') {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['desk-bookings'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['desk-stats'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['next-dates'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['monthly-stats'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['date-range-stats'], type: 'active' }),
    ]);
  }
}

interface SelectedBooking {
  booking: DeskBooking | null;
  deskId: string;
  date: string;
}

export function useBookingActions(
  currentCurrency: Currency,
  selectedBooking: SelectedBooking | null,
  setSelectedBooking: (b: SelectedBooking | null) => void,
  setIsBookingModalOpen: (v: boolean) => void,
  nextAvailableDates: string[],
  desks: Desk[],
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDeskClick = useCallback(async (deskId: string, date: string, event?: React.MouseEvent) => {
    if (isWeekend(date)) return;

    const booking = await dataStore.getBooking(deskId, date);

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
          currency: booking?.currency || currentCurrency || 'EUR',
          createdAt: booking?.createdAt || new Date().toISOString(),
        };
        await dataStore.saveBooking(newBooking);
      }

      invalidateBookingQueries(queryClient);
      toast({
        title: 'Desk Status Updated',
        description: `Desk status set to ${nextStatus}`,
      });
      return;
    }

    if (booking?.status === 'booked' || booking?.status === 'assigned') {
      setSelectedBooking({ booking, deskId, date });
      setIsBookingModalOpen(true);
    } else if (booking?.status === 'available' || !booking) {
      setSelectedBooking({ booking: null, deskId, date });
      setIsBookingModalOpen(true);
    }
  }, [toast, currentCurrency, queryClient, setSelectedBooking, setIsBookingModalOpen]);

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
    const newDateRange = generateDateRange(bookingData.startDate, bookingData.endDate);

    let oldDateRange: string[] = [];
    if (existingBooking) {
      oldDateRange = generateDateRange(existingBooking.startDate, existingBooking.endDate);
    }

    const conflictDetails: string[] = [];
    for (const date of newDateRange) {
      if (existingBooking && oldDateRange.includes(date)) continue;
      const existingBookingOnDate = await dataStore.getBooking(deskId, date);
      if (existingBookingOnDate && existingBookingOnDate.status !== 'available') {
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        });
        if (existingBookingOnDate.personName) {
          conflictDetails.push(`${formattedDate}: ${existingBookingOnDate.personName} (${existingBookingOnDate.status})`);
        } else {
          conflictDetails.push(`${formattedDate}: Desk is ${existingBookingOnDate.status}`);
        }
      }
    }

    if (conflictDetails.length > 0) {
      throw new Error(`Cannot create booking due to conflicts on the following dates:\n\n${conflictDetails.join('\n')}\n\nPlease choose different dates or select available time slots.`);
    }

    if (existingBooking && oldDateRange.length > 0) {
      const datesToDelete = oldDateRange.filter(date => !newDateRange.includes(date));
      for (const date of datesToDelete) {
        await dataStore.deleteBooking(deskId, date);
      }
    }

    const bookingsToCreate: DeskBooking[] = newDateRange.map(date => ({
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
      createdAt: (existingBooking && oldDateRange.includes(date))
        ? existingBooking.createdAt
        : new Date().toISOString(),
    }));

    await dataStore.bulkUpdateBookings(bookingsToCreate);
    await refetchLocalStorageQueries(queryClient);

    const statusText = bookingData.status === 'assigned' ? 'assigned (paid)' : 'booked';
    const dayCount = newDateRange.length;
    const currencySymbol = currencySymbols[bookingData.currency];
    const isUpdate = existingBooking !== null;
    toast({
      title: isUpdate ? 'Desk Booking Updated' : 'Desk Booking Created',
      description: `${bookingData.personName} ${statusText} for ${dayCount} day${dayCount > 1 ? 's' : ''} - ${currencySymbol}${bookingData.price} total`,
    });
  }, [selectedBooking, toast, queryClient, currentCurrency]);

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
      currency: selectedBooking.booking?.currency || currentCurrency || 'EUR',
      createdAt: selectedBooking.booking?.createdAt || new Date().toISOString(),
    };

    await dataStore.saveBooking(newBooking);
    setSelectedBooking(null);
    invalidateBookingQueries(queryClient);
    toast({
      title: 'Person Assigned',
      description: `${personName} assigned to desk`,
    });
  }, [selectedBooking, toast, currentCurrency, queryClient, setSelectedBooking]);

  const handleBulkAvailability = useCallback(async (
    startDate: string,
    endDate: string,
    deskIds: string[],
    status: DeskStatus,
  ) => {
    const dateRange = generateDateRange(startDate, endDate);
    const bulkBookings: DeskBooking[] = [];
    const bookingsToDelete: { deskId: string; date: string }[] = [];

    for (const deskId of deskIds) {
      for (const date of dateRange) {
        if (status === 'available') {
          bookingsToDelete.push({ deskId, date });
        } else {
          bulkBookings.push({
            id: `${deskId}-${date}`,
            deskId,
            date,
            startDate: date,
            endDate: date,
            status,
            personName: undefined,
            title: undefined,
            price: undefined,
            currency: currentCurrency || 'EUR',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    await Promise.all([
      bookingsToDelete.length > 0
        ? (dataStore.bulkDeleteBookings
            ? dataStore.bulkDeleteBookings(bookingsToDelete)
            : Promise.all(bookingsToDelete.map(({ deskId, date }) =>
                dataStore.deleteBooking(deskId, date).catch(error =>
                  console.error(`Failed to delete booking ${deskId}-${date}:`, error)
                )
              )))
        : Promise.resolve(),
      bulkBookings.length > 0 ? dataStore.bulkUpdateBookings(bulkBookings) : Promise.resolve(),
    ]);

    await refetchLocalStorageQueries(queryClient);
    toast({
      title: 'Bulk Update Applied',
      description: `${deskIds.length} desks updated for ${dateRange.length} days`,
    });
  }, [toast, currentCurrency, queryClient]);

  const handleExport = useCallback(async () => {
    try {
      const allBookings = await dataStore.getAllBookings();
      const exportData = {
        bookings: allBookings,
        exportDate: new Date().toISOString(),
        version: '1.0',
        totalBookings: Object.keys(allBookings).length,
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
        title: 'Data Exported',
        description: `Successfully exported ${Object.keys(allBookings).length} bookings`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleQuickBook = useCallback(async () => {
    if (nextAvailableDates.length === 0) {
      toast({
        title: 'No Availability',
        description: 'No available desks found in the next 30 days',
        variant: 'destructive',
      });
      return;
    }

    const firstAvailableDate = nextAvailableDates[0];
    for (const desk of desks) {
      const booking = await dataStore.getBooking(desk.id, firstAvailableDate);
      if (!booking || booking.status === 'available') {
        setSelectedBooking({ booking: null, deskId: desk.id, date: firstAvailableDate });
        setIsBookingModalOpen(true);
        return;
      }
    }

    toast({
      title: 'No Available Desk',
      description: 'Could not find an available desk',
      variant: 'destructive',
    });
  }, [nextAvailableDates, toast, setSelectedBooking, setIsBookingModalOpen]);

  const handleDiscardBooking = useCallback(async () => {
    if (!selectedBooking) return;
    const { deskId, booking } = selectedBooking;
    if (!booking) return;

    const dateRange = generateDateRange(booking.startDate, booking.endDate);
    await Promise.all(
      dateRange.map(date => dataStore.deleteBooking(deskId, date))
    );

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['desk-stats'] });
    queryClient.invalidateQueries({ queryKey: ['next-dates'] });

    toast({
      title: 'Booking Discarded',
      description: `Removed booking for ${booking.personName}`,
    });
  }, [selectedBooking, queryClient, toast]);

  return {
    handleDeskClick,
    handleBookingSave,
    handlePersonSave,
    handleBulkAvailability,
    handleExport,
    handleQuickBook,
    handleDiscardBooking,
  };
}
