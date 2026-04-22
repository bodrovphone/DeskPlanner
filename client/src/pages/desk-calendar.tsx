import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import PersonModal from '@/components/members/PersonModal';
import BookingModal from '@/components/bookings/BookingModal';
import ShareBookingModal from '@/components/bookings/ShareBookingModal';
import AvailabilityRangeModal from '@/components/bookings/AvailabilityRangeModal';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import FloorPlanCalendarView from '@/components/calendar/FloorPlanCalendarView';
import CalendarNavigation from '@/components/calendar/CalendarNavigation';
import DeskGrid from '@/components/calendar/DeskGrid';
import MobileCalendar from '@/components/calendar/MobileCalendar';
import { DEFAULT_DESKS } from '@/lib/deskConfig';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  getWeekRange,
  getWeekRangeString,
  getMonthRange,
  getMonthRangeString,
  formatLocalDate,
} from '@/lib/dateUtils';
import { DeskBooking, Currency } from '@shared/schema';
import { useNextDates } from '@/hooks/use-next-dates';
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings';
import { useBookings } from '@/hooks/use-bookings';
import { useGenerateRecurringExpenses } from '@/hooks/use-expenses';
import { useBookingActions } from '@/hooks/use-booking-actions';
import { usePlanFreeze } from '@/hooks/use-plan-freeze';
import { useEndOngoingContract } from '@/hooks/use-end-ongoing-contract';
import { DEFAULT_WORKING_DAYS, isNonWorkingDay } from '@/lib/workingDays';

const MOBILE_BREAKPOINT = 1024;

export default function DeskCalendar() {
  const { legacyDesks, currentOrg, rooms: orgRooms } = useOrganization();
  const desks = legacyDesks.length > 0 ? legacyDesks : DEFAULT_DESKS;
  const workingDays = currentOrg?.workingDays ?? DEFAULT_WORKING_DAYS;

  // Derive unique rooms from desks
  const rooms = useMemo(() => {
    const seen = new Map<number, string>();
    for (const desk of desks) {
      if (!seen.has(desk.room)) {
        seen.set(desk.room, desk.roomName || `Room ${desk.room}`);
      }
    }
    return Array.from(seen, ([room, roomName]) => ({ room, roomName }));
  }, [desks]);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'floor-plan'>('week');
  const [mapDate, setMapDate] = useState(() => formatLocalDate(new Date()));
  const [mapRoomId, setMapRoomId] = useState('all');
  const [roomViewMode, setRoomViewMode] = useState<'all' | 'single'>(() =>
    rooms.length >= 4 ? 'single' : 'all'
  );
  const [selectedRoom, setSelectedRoom] = useState<number | null>(() =>
    rooms.length >= 4 ? rooms[0]?.room ?? null : rooms[0]?.room ?? null
  );
  // Reset room view defaults when rooms change (e.g. org switch)
  useEffect(() => {
    setRoomViewMode(rooms.length >= 4 ? 'single' : 'all');
    setSelectedRoom(rooms[0]?.room ?? null);
  }, [rooms]);

  const filteredDesks = useMemo(
    () => roomViewMode === 'single' && selectedRoom !== null
      ? desks.filter((d) => d.room === selectedRoom)
      : desks,
    [desks, roomViewMode, selectedRoom]
  );

  const handleRoomViewChange = useCallback((mode: 'all' | 'single') => {
    setRoomViewMode(mode);
    if (mode === 'single' && selectedRoom === null && rooms.length > 0) {
      setSelectedRoom(rooms[0].room);
    }
  }, [selectedRoom, rooms]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<{
    booking: DeskBooking | null;
    deskId: string;
    date: string;
  } | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(currentOrg?.currency || 'EUR');
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const currentWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const currentMonth = useMemo(() => getMonthRange(monthOffset), [monthOffset]);
  const weekRangeString = useMemo(() => getWeekRangeString(weekOffset), [weekOffset]);
  const monthRangeString = useMemo(() => getMonthRangeString(monthOffset), [monthOffset]);

  const currentDates = useMemo(
    () => (viewMode === 'week' ? currentWeek : currentMonth),
    [viewMode, currentWeek, currentMonth]
  );
  const dates = useMemo(() => currentDates.map((day) => day.dateString), [currentDates]);

  const startDate = useMemo(() => (dates.length > 0 ? dates[0] : undefined), [dates]);
  const endDate = useMemo(() => (dates.length > 0 ? dates[dates.length - 1] : undefined), [dates]);

  const { data: bookings = {} } = useBookings(startDate, endDate);
  const { data: nextDatesData, isLoading: nextDatesLoading } = useNextDates();

  useRealtimeBookings();

  const generateRecurringExpenses = useGenerateRecurringExpenses();
  useEffect(() => {
    const today = new Date();
    generateRecurringExpenses.mutate(
      { year: today.getFullYear(), month: today.getMonth() },
      {
        onSuccess: (generated) => {
          if (generated.length > 0) {
            console.log(`Auto-generated ${generated.length} recurring expense(s)`);
          }
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextAvailableDates = nextDatesData?.available || [];

  useEffect(() => {
    setCurrentCurrency(currentOrg?.currency || 'EUR');
  }, [currentOrg?.currency]);

  // Auto-scroll to today's column (desktop only)
  useEffect(() => {
    if (viewMode === 'month' && monthOffset === 0 && tableRef.current && !isMobile) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayIndex = currentDates.findIndex((day) => day.dateString === todayStr);
      if (todayIndex >= 0) {
        setTimeout(() => {
          if (tableRef.current) {
            const columnWidth = 120;
            tableRef.current.scrollLeft = Math.max(0, todayIndex * columnWidth - 32);
          }
        }, 100);
      }
    }
  }, [viewMode, monthOffset, currentDates, isMobile]);

  const {
    handleDeskClick,
    handleBookingSave,
    handlePersonSave,
    handleBulkAvailability,
    handleExport,
    handleQuickBook,
    handleDiscardBooking,
  } = useBookingActions(
    currentCurrency,
    selectedBooking,
    setSelectedBooking,
    setIsBookingModalOpen,
    nextAvailableDates,
    desks,
    workingDays
  );

  const { freeze: freezePlanMutation } = usePlanFreeze();
  const endOngoingContractMutation = useEndOngoingContract();

  const rangeString = viewMode === 'week' ? weekRangeString : monthRangeString;

  const statusCounts = useMemo(() => {
    const counts = { available: 0, booked: 0, assigned: 0, stripePaid: 0 };
    for (const desk of filteredDesks) {
      for (const day of currentDates) {
        if (isNonWorkingDay(day.dateString, workingDays)) continue;
        const key = `${desk.id}-${day.dateString}`;
        const booking = bookings[key];
        const status = booking?.status;
        if (status === 'booked' && booking?.personName) counts.booked++;
        else if (status === 'assigned' && booking?.personName) counts.assigned++;
        else counts.available++;
        if (booking?.paymentStatus === 'paid') counts.stripePaid++;
      }
    }
    return counts;
  }, [filteredDesks, currentDates, bookings, workingDays]);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
      {isMobile ? (
        <MobileCalendar
          desks={filteredDesks}
          bookings={bookings}
          onDeskClick={handleDeskClick}
          onQuickBook={handleQuickBook}
          quickBookDisabled={nextAvailableDates.length === 0}
          quickBookLoading={nextDatesLoading}
          onSetAvailability={() => setIsRangeModalOpen(true)}
          onExport={handleExport}
          workingDays={workingDays}
        />
      ) : (
        <>
          <CalendarHeader
            onSetAvailability={() => setIsRangeModalOpen(true)}
            onExport={handleExport}
            statusCounts={statusCounts}
            stripePaidCount={statusCounts.stripePaid}
            totalDeskDays={statusCounts.available + statusCounts.booked + statusCounts.assigned}
          />

          <CalendarNavigation
            viewMode={viewMode}
            setViewMode={setViewMode}
            rangeString={rangeString}
            onPrev={() => {
              if (viewMode === 'week') setWeekOffset(weekOffset - 1);
              else setMonthOffset(monthOffset - 1);
            }}
            onNext={() => {
              if (viewMode === 'week') setWeekOffset(weekOffset + 1);
              else setMonthOffset(monthOffset + 1);
            }}
            onQuickBook={handleQuickBook}
            quickBookDisabled={nextAvailableDates.length === 0}
            quickBookLoading={nextDatesLoading}
            nextAvailableDate={nextAvailableDates[0]}
            roomViewMode={roomViewMode}
            setRoomViewMode={handleRoomViewChange}
            rooms={rooms}
            selectedRoom={selectedRoom}
            setSelectedRoom={setSelectedRoom}
            mapDate={mapDate}
            setMapDate={setMapDate}
            mapWorkingDays={workingDays}
            mapRooms={currentOrg?.floorPlanCombined ? [] : orgRooms}
            mapRoomId={mapRoomId}
            setMapRoomId={setMapRoomId}
          />

          {viewMode === 'floor-plan' ? (
            <FloorPlanCalendarView selectedDate={mapDate} selectedRoomId={mapRoomId} onDeskClick={handleDeskClick} />
          ) : (
            <DeskGrid
              ref={tableRef}
              desks={filteredDesks}
              currentDates={currentDates}
              bookings={bookings}
              onDeskClick={handleDeskClick}
              workingDays={workingDays}
            />
          )}
        </>
      )}

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking?.booking || null}
        deskId={selectedBooking?.deskId || ''}
        date={selectedBooking?.date || ''}
        desks={desks}
        currency={currentCurrency}
        onSave={handleBookingSave}
        onDiscard={handleDiscardBooking}
        onFreezePlan={async (pausedAt) => {
          const b = selectedBooking?.booking;
          if (!b || !b.clientId) return;
          await freezePlanMutation.mutateAsync({
            clientId: b.clientId,
            clientName: b.personName ?? 'member',
            startDate: b.startDate,
            endDate: b.endDate,
            pausedAt,
          });
        }}
        onEndContract={async (newEndDate) => {
          const b = selectedBooking?.booking;
          if (!b) return;
          await endOngoingContractMutation.mutateAsync({
            deskId: b.deskId,
            clientId: b.clientId ?? null,
            startDate: b.startDate,
            newEndDate,
            personName: b.personName ?? 'member',
          });
        }}
        onShare={(savedData) => {
          // Ensure selectedBooking has a booking object (needed for new bookings)
          if (selectedBooking && !selectedBooking.booking) {
            setSelectedBooking({
              ...selectedBooking,
              booking: {
                id: `${selectedBooking.deskId}-${savedData.startDate}`,
                deskId: selectedBooking.deskId,
                date: selectedBooking.date,
                startDate: savedData.startDate,
                endDate: savedData.endDate,
                status: savedData.status,
                personName: savedData.personName,
                title: savedData.title,
                price: savedData.price,
                currency: savedData.currency,
                createdAt: new Date().toISOString(),
              },
            });
          }
          setIsBookingModalOpen(false);
          setIsShareModalOpen(true);
        }}
      />

      {selectedBooking?.booking && (
        <ShareBookingModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking.booking}
          deskLabel={desks.find(d => d.id === selectedBooking.deskId)?.label || selectedBooking.deskId}
          spaceName={currentOrg?.name || 'Coworking Space'}
          roomName={desks.find(d => d.id === selectedBooking.deskId)?.roomName || ''}
        />
      )}

      <PersonModal
        isOpen={isPersonModalOpen}
        onClose={() => {
          setIsPersonModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking?.booking || null}
        deskId={selectedBooking?.deskId || ''}
        date={selectedBooking?.date || ''}
        desks={desks}
        onSave={handlePersonSave}
      />

      <AvailabilityRangeModal
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
        desks={desks}
        onApply={handleBulkAvailability}
      />

    </div>
  );
}
