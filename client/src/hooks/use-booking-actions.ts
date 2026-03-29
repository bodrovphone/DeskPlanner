import { useCallback } from 'react';
import { useDataStore } from '@/contexts/DataStoreContext';
import { DeskBooking, DeskStatus, Currency, Desk } from '@shared/schema';
import { generateDateRange } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { currencySymbols } from '@/lib/settings';
import { isNonWorkingDay, DEFAULT_WORKING_DAYS } from '@/lib/workingDays';
import { supabaseClient } from '@/lib/supabaseClient';

export function invalidateBookingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['desk-bookings'] });
  queryClient.invalidateQueries({ queryKey: ['desk-stats'] });
  queryClient.invalidateQueries({ queryKey: ['next-dates'] });
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
  workingDays: number[] = DEFAULT_WORKING_DAYS,
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dataStore = useDataStore();

  const handleDeskClick = useCallback(async (deskId: string, date: string, event?: React.MouseEvent, existingBooking?: DeskBooking | null) => {
    if (isNonWorkingDay(date, workingDays)) return;

    const booking = existingBooking ?? null;

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
  }, [toast, currentCurrency, queryClient, setSelectedBooking, setIsBookingModalOpen, dataStore, workingDays]);

  const handleBookingSave = useCallback(async (bookingData: {
    personName: string;
    title: string;
    price: number;
    status: DeskStatus;
    startDate: string;
    endDate: string;
    currency: Currency;
    clientId?: string;
    isFlex?: boolean;
    newDeskId?: string;
  }) => {
    if (!selectedBooking) return;

    const { deskId: originalDeskId, booking: existingBooking } = selectedBooking;
    const deskId = bookingData.newDeskId || originalDeskId;
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
      // Delete ALL old dates from the ORIGINAL desk — not just removed ones.
      // This avoids duplicate rows when the existing booking has a different
      // numeric ID than the new upsert, and handles desk changes correctly.
      if (dataStore.bulkDeleteBookings) {
        await dataStore.bulkDeleteBookings(oldDateRange.map(date => ({ deskId: originalDeskId, date })));
      } else {
        for (const date of oldDateRange) {
          await dataStore.deleteBooking(originalDeskId, date);
        }
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
      clientId: bookingData.clientId,
      isFlex: bookingData.isFlex,
      createdAt: (existingBooking && oldDateRange.includes(date))
        ? existingBooking.createdAt
        : new Date().toISOString(),
    }));

    await dataStore.bulkUpdateBookings(bookingsToCreate);

    // Deduct flex days if this is a new flex booking
    if (bookingData.isFlex && bookingData.clientId && !existingBooking && dataStore.deductFlexDay) {
      const newDaysCount = newDateRange.length;
      for (let i = 0; i < newDaysCount; i++) {
        await dataStore.deductFlexDay(bookingData.clientId);
      }
      // Fire-and-forget booking confirmation email for flex member
      supabaseClient.functions.invoke('flex-email', {
        body: {
          type: 'booking_confirmation',
          clientId: parseInt(bookingData.clientId, 10),
          organizationId: bookingsToCreate[0]?.organizationId,
          bookingDate: bookingData.startDate,
          deskLabel: desks.find(d => d.id === selectedBooking.deskId)?.label || selectedBooking.deskId,
        },
      }).catch(() => {});
    }

    invalidateBookingQueries(queryClient);

    const statusText = bookingData.status === 'assigned' ? 'assigned (paid)' : 'booked';
    const dayCount = newDateRange.length;
    const currencySymbol = currencySymbols[bookingData.currency];
    const isUpdate = existingBooking !== null;
    const deskChanged = bookingData.newDeskId && bookingData.newDeskId !== originalDeskId;
    const movedLabel = deskChanged ? ` → ${desks.find(d => d.id === deskId)?.label || deskId}` : '';
    toast({
      title: isUpdate ? (deskChanged ? 'Booking Moved' : 'Desk Booking Updated') : 'Desk Booking Created',
      description: `${bookingData.personName} ${statusText} for ${dayCount} day${dayCount > 1 ? 's' : ''} - ${currencySymbol}${bookingData.price} total${movedLabel}`,
    });
  }, [selectedBooking, toast, queryClient, currentCurrency, dataStore]);

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
  }, [selectedBooking, toast, currentCurrency, queryClient, setSelectedBooking, dataStore]);

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

    invalidateBookingQueries(queryClient);
    toast({
      title: 'Bulk Update Applied',
      description: `${deskIds.length} desks updated for ${dateRange.length} days`,
    });
  }, [toast, currentCurrency, queryClient, dataStore]);

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
  }, [toast, dataStore]);

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
  }, [nextAvailableDates, toast, setSelectedBooking, setIsBookingModalOpen, dataStore]);

  const handleDiscardBooking = useCallback(async () => {
    if (!selectedBooking) return;
    const { deskId, booking } = selectedBooking;
    if (!booking) return;

    const dateRange = generateDateRange(booking.startDate, booking.endDate);
    await Promise.all(
      dateRange.map(date => dataStore.deleteBooking(deskId, date))
    );

    invalidateBookingQueries(queryClient);

    toast({
      title: 'Booking Discarded',
      description: `Removed booking for ${booking.personName}`,
    });
  }, [selectedBooking, queryClient, toast, dataStore]);

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
