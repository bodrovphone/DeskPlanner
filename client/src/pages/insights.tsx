import { useState, useMemo, useCallback } from 'react';
import NextDatesPanel from '@/components/calendar/NextDatesPanel';
import StatsCards from '@/components/calendar/StatsCards';
import BookingModal from '@/components/BookingModal';
import { useNextDates, BookedDate, ExpiringAssignment } from '@/hooks/use-next-dates';
import { useBookingStats } from '@/hooks/use-bookings';
import { useBookingActions } from '@/hooks/use-booking-actions';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DEFAULT_DESKS } from '@/lib/deskConfig';
import { getMonthRange, getMonthRangeString } from '@/lib/dateUtils';
import { DeskBooking, Currency } from '@shared/schema';

export default function InsightsPage() {
  const { legacyDesks, currentOrg } = useOrganization();
  const desks = legacyDesks.length > 0 ? legacyDesks : DEFAULT_DESKS;

  const monthDays = useMemo(() => getMonthRange(0), []);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dates = useMemo(() => {
    return monthDays
      .filter(d => {
        if (d.dateString <= today) return false; // Only future dates (starting tomorrow)
        const day = new Date(d.dateString + 'T00:00:00').getDay();
        return day !== 0 && day !== 6; // Exclude weekends
      })
      .map(d => d.dateString);
  }, [monthDays, today]);

  const { data: nextDatesData } = useNextDates();
  const { data: stats = { available: 0, assigned: 0, booked: 0 } } = useBookingStats(dates);

  const nextAvailableDates = nextDatesData?.available || [];
  const nextBookedDates = nextDatesData?.booked || [];
  const expiringAssignments = nextDatesData?.expiring || [];

  const currentCurrency: Currency = currentOrg?.currency || 'EUR';

  const [selectedBooking, setSelectedBooking] = useState<{
    booking: DeskBooking | null;
    deskId: string;
    date: string;
  } | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const {
    handleBookingSave,
    handleDiscardBooking,
  } = useBookingActions(
    currentCurrency,
    selectedBooking,
    setSelectedBooking,
    setIsBookingModalOpen,
    nextAvailableDates,
    desks
  );

  const handleAvailableDateClick = useCallback((date: string) => {
    setSelectedBooking({ booking: null, deskId: desks[0].id, date });
    setIsBookingModalOpen(true);
  }, [desks]);

  const handleBookedDateClick = useCallback((entry: BookedDate) => {
    setSelectedBooking({ booking: entry.booking, deskId: entry.deskId, date: entry.date });
    setIsBookingModalOpen(true);
  }, []);

  const handleExpiringClick = useCallback((entry: ExpiringAssignment) => {
    setSelectedBooking({ booking: entry.booking, deskId: entry.deskId, date: entry.date });
    setIsBookingModalOpen(true);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Insights</h1>

      <StatsCards
        stats={stats}
        label={`Remaining ${getMonthRangeString(0)} — ${dates.length} weekdays left`}
      />

      <NextDatesPanel
        nextAvailableDates={nextAvailableDates}
        nextBookedDates={nextBookedDates}
        expiringAssignments={expiringAssignments}
        onAvailableDateClick={handleAvailableDateClick}
        onBookedDateClick={handleBookedDateClick}
        onExpiringClick={handleExpiringClick}
      />

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
    </div>
  );
}
