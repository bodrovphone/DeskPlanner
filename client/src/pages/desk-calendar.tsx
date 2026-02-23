import { useState, useEffect, useMemo, useRef } from 'react';
import PersonModal from '@/components/PersonModal';
import BookingModal from '@/components/BookingModal';
import AvailabilityRangeModal from '@/components/AvailabilityRangeModal';
import FloorPlanModal from '@/components/FloorPlanModal';
import DataMigrationModal from '@/components/DataMigrationModal';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarNavigation from '@/components/calendar/CalendarNavigation';
import DeskGrid from '@/components/calendar/DeskGrid';
import { DEFAULT_DESKS } from '@/lib/deskConfig';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  getWeekRange,
  getWeekRangeString,
  getMonthRange,
  getMonthRangeString,
} from '@/lib/dateUtils';
import { DeskBooking, Currency } from '@shared/schema';
import { useNextDates } from '@/hooks/use-next-dates';
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings';
import { useBookings } from '@/hooks/use-bookings';
import { useGenerateRecurringExpenses } from '@/hooks/use-expenses';
import { getCurrency } from '@/lib/settings';
import { useBookingActions } from '@/hooks/use-booking-actions';

export default function DeskCalendar() {
  const { legacyDesks, currentOrg } = useOrganization();
  const desks = legacyDesks.length > 0 ? legacyDesks : DEFAULT_DESKS;

  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
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
  const [isFloorPlanModalOpen, setIsFloorPlanModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

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
    if (currentOrg?.currency) {
      setCurrentCurrency(currentOrg.currency);
    } else {
      setCurrentCurrency(getCurrency());
    }
  }, [currentOrg?.currency]);

  // Auto-scroll to today's column
  useEffect(() => {
    if (viewMode === 'month' && monthOffset === 0 && tableRef.current) {
      const isToday = (ds: string) => ds === new Date().toISOString().split('T')[0];
      const todayIndex = currentDates.findIndex((day) => isToday(day.dateString));
      if (todayIndex >= 0) {
        setTimeout(() => {
          if (tableRef.current) {
            const columnWidth = 120;
            tableRef.current.scrollLeft = Math.max(0, todayIndex * columnWidth - 32);
          }
        }, 100);
      }
    }
  }, [viewMode, monthOffset, currentDates]);

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
    desks
  );

  const rangeString = viewMode === 'week' ? weekRangeString : monthRangeString;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CalendarHeader
        onFloorPlan={() => setIsFloorPlanModalOpen(true)}
        onSetAvailability={() => setIsRangeModalOpen(true)}
        onExport={handleExport}
        onMigrate={() => setIsMigrationModalOpen(true)}
      />

      <div>
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
        />

        <DeskGrid
          ref={tableRef}
          desks={desks}
          currentDates={currentDates}
          bookings={bookings}
          onDeskClick={handleDeskClick}
        />
      </div>

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
        onDiscard={handleDiscardBooking}
      />

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

      <AvailabilityRangeModal
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
        onApply={handleBulkAvailability}
      />

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
