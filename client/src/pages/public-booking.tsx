import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PublicAvailability } from '@shared/schema';
import { SupabaseDataStore } from '@/lib/supabaseDataStore';
import { supabaseClient } from '@/lib/supabaseClient';
import { isNonWorkingDay, DAY_LABELS } from '@/lib/workingDays';
import { Loader2, CalendarCheck, ChevronLeft, Check, MapPin, CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';

const SCARCITY_THRESHOLD = 3;

export default function PublicBookingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [availability, setAvailability] = useState<PublicAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('+');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assignedDeskLabel, setAssignedDeskLabel] = useState('');
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!orgSlug) return;
    SupabaseDataStore.getPublicAvailability(orgSlug).then((data) => {
      if (data) {
        setAvailability(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [orgSlug]);

  // All hooks must be above early returns
  const { availabilityMap, maxDate } = useMemo(() => {
    if (!availability) return { availabilityMap: {} as Record<string, number>, maxDate: new Date() };
    const { org, rooms, bookedSlots } = availability;
    const bookedSet = new Set(bookedSlots.map(s => `${s.deskId}:${s.date}`));
    const allDesks = rooms.flatMap(r => r.desks);
    const totalDesks = allDesks.length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const map: Record<string, number> = {};
    const max = new Date(now);
    max.setDate(now.getDate() + org.maxDaysAhead);
    for (let i = 0; i <= org.maxDaysAhead; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const bookedCount = allDesks.filter(desk => bookedSet.has(`${desk.deskId}:${dateStr}`)).length;
      map[dateStr] = totalDesks - bookedCount;
    }
    return { availabilityMap: map, maxDate: max };
  }, [availability]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound || !availability) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <CalendarCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900">Not available</h1>
          <p className="text-gray-500 mt-1">This space doesn't have online booking enabled, or doesn't exist.</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg border p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">You're booked!</h1>
            <p className="text-gray-500 mt-3">
              Your desk at <span className="font-medium">{availability.org.name}</span> is reserved. We're looking forward to seeing you at the space!
            </p>
            {assignedDeskLabel && (
              <div className="mt-5 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                <MapPin className="h-4 w-4" />
                {assignedDeskLabel}
              </div>
            )}
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  const { org, rooms, bookedSlots } = availability;
  const bookedSet = new Set(bookedSlots.map(s => `${s.deskId}:${s.date}`));
  const allDesks = rooms.flatMap(r => r.desks);
  const totalDesks = allDesks.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDateStr = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatDateStr(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = formatDateStr(tomorrow);

  const todayAvailable = (availabilityMap[todayStr] ?? 0) > 0 && !isNonWorkingDay(todayStr, org.workingDays);
  const tomorrowAvailable = (availabilityMap[tomorrowStr] ?? 0) > 0 && !isNonWorkingDay(tomorrowStr, org.workingDays);
  const todayIsWorkingDay = !isNonWorkingDay(todayStr, org.workingDays);
  const tomorrowIsWorkingDay = !isNonWorkingDay(tomorrowStr, org.workingDays);

  // For the calendar: disable dates that are full, non-working, or out of range
  const isDateDisabled = (date: Date) => {
    const dateStr = formatDateStr(date);
    if (date < today || date > maxDate) return true;
    if (isNonWorkingDay(dateStr, org.workingDays)) return true;
    if ((availabilityMap[dateStr] ?? 0) <= 0) return true;
    return false;
  };

  // Generate dates list (still needed for selectedDateInfo)
  const dates: { date: string; dayLabel: string; dateLabel: string; available: number }[] = [];
  for (let i = 0; i <= org.maxDaysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatDateStr(d);
    if (isNonWorkingDay(dateStr, org.workingDays)) continue;
    const available = availabilityMap[dateStr] ?? 0;
    if (available <= 0) continue;
    const jsDay = d.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    dates.push({
      date: dateStr,
      dayLabel: DAY_LABELS[isoDay] || '',
      dateLabel: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      available,
    });
  }

  // Pick a random available desk for the selected date
  const getRandomAvailableDesk = (date: string) => {
    const availableDesks = allDesks.filter(desk => !bookedSet.has(`${desk.deskId}:${date}`));
    if (availableDesks.length === 0) return null;
    return availableDesks[Math.floor(Math.random() * availableDesks.length)];
  };

  const selectedDateInfo = dates.find(d => d.date === selectedDate);
  const step = selectedDate ? 2 : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !visitorName.trim()) {
      setError('Please fill in your name.');
      return;
    }

    const phoneDigits = visitorPhone.replace(/[^0-9]/g, '');
    if (!visitorPhone.startsWith('+') || phoneDigits.length < 7) {
      setError('Please enter a valid phone number with country code (e.g. +359 888 123 456).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const desk = getRandomAvailableDesk(selectedDate);
      if (!desk) {
        setError('Sorry, all desks just got booked for this date. Please pick another.');
        setSubmitting(false);
        return;
      }

      const { data: orgData } = await supabaseClient
        .from('organizations')
        .select('id')
        .eq('slug', org.slug)
        .limit(1)
        .single();

      if (!orgData) {
        setError('Could not find the organization. Please try again.');
        setSubmitting(false);
        return;
      }

      await SupabaseDataStore.submitPublicBooking({
        organizationId: orgData.id,
        deskId: desk.deskId,
        date: selectedDate,
        visitorName: visitorName.trim(),
        visitorEmail: '',
        visitorPhone: visitorPhone.trim(),
        visitorNotes: visitorNotes.trim() || undefined,
      });

      setAssignedDeskLabel(desk.label);
      setSubmitted(true);
    } catch (err) {
      console.error('Public booking error:', err);
      setError('Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              {org.logoUrl && (
                <img src={org.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-1 shrink-0" />
              )}
              <div>
                <h1 className="text-xl font-bold">{org.name}</h1>
                <p className="text-blue-100 text-sm mt-0.5">Book a desk</p>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 px-6 pt-5 pb-1">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
          </div>

          <div className="p-6">
            {/* Step 1: Date selection */}
            {!selectedDate && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">When do you want to come?</h2>

                {dates.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No available dates in the next {org.maxDaysAhead} days.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Today & Tomorrow quick buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        disabled={!todayAvailable}
                        onClick={() => setSelectedDate(todayStr)}
                        className={`relative flex flex-col items-center py-4 px-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                          todayAvailable
                            ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <span className={`text-lg font-bold ${todayAvailable ? 'text-gray-900' : 'text-gray-300'}`}>Today</span>
                        {todayAvailable ? (
                          <span className="text-xs text-gray-500 mt-0.5">
                            {(availabilityMap[todayStr] ?? 0) <= SCARCITY_THRESHOLD
                              ? `Only ${availabilityMap[todayStr]} left`
                              : `${availabilityMap[todayStr]} desks free`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 mt-0.5">
                            {todayIsWorkingDay ? 'Fully booked' : 'Closed'}
                          </span>
                        )}
                      </button>

                      <button
                        disabled={!tomorrowAvailable}
                        onClick={() => setSelectedDate(tomorrowStr)}
                        className={`relative flex flex-col items-center py-4 px-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                          tomorrowAvailable
                            ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <span className={`text-lg font-bold ${tomorrowAvailable ? 'text-gray-900' : 'text-gray-300'}`}>Tomorrow</span>
                        {tomorrowAvailable ? (
                          <span className="text-xs text-gray-500 mt-0.5">
                            {(availabilityMap[tomorrowStr] ?? 0) <= SCARCITY_THRESHOLD
                              ? `Only ${availabilityMap[tomorrowStr]} left`
                              : `${availabilityMap[tomorrowStr]} desks free`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 mt-0.5">
                            {tomorrowIsWorkingDay ? 'Oops, we\'re full' : 'Closed'}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Pick another date */}
                    {!showCalendar ? (
                      <button
                        onClick={() => setShowCalendar(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-sm font-medium text-gray-600 active:scale-[0.98]"
                      >
                        <CalendarDays className="h-4 w-4" />
                        Pick another date
                      </button>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Calendar
                          mode="single"
                          weekStartsOn={1}
                          selected={undefined}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(formatDateStr(date));
                              setShowCalendar(false);
                            }
                          }}
                          disabled={isDateDisabled}
                          fromDate={today}
                          toDate={maxDate}
                          className="rounded-xl border p-3"
                          modifiers={{
                            available: (date: Date) => {
                              const dateStr = formatDateStr(date);
                              const avail = availabilityMap[dateStr] ?? 0;
                              return avail > 0 && !isNonWorkingDay(dateStr, org.workingDays) && date >= today && date <= maxDate;
                            },
                          }}
                          modifiersClassNames={{
                            available: '!text-lime-600 font-semibold',
                          }}
                          classNames={{
                            day_disabled: 'text-gray-500 opacity-100',
                          }}
                        />
                        <button
                          onClick={() => setShowCalendar(false)}
                          className="mt-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Contact form (desk auto-assigned) */}
            {selectedDate && (
              <div>
                <button
                  onClick={() => { setSelectedDate(null); setError(''); }}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4 -mt-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Change date
                </button>

                {selectedDateInfo && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">
                        {selectedDateInfo.dayLabel}, {selectedDateInfo.dateLabel}
                      </p>
                      <p className="text-xs text-blue-600 mt-0.5">A desk will be assigned for you</p>
                    </div>
                    <CalendarCheck className="h-5 w-5 text-blue-400" />
                  </div>
                )}

                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Your details</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                    <input
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                    <input
                      type="tel"
                      value={visitorPhone}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (!val.startsWith('+')) val = '+' + val.replace(/^\+*/, '');
                        setVisitorPhone(val);
                      }}
                      required
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
                      placeholder="+359 888 123 456"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Double-check this number -- it's how the space manager will reach you. A wrong digit means an awkward call to a stranger and an empty desk.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                    <textarea
                      value={visitorNotes}
                      onChange={(e) => setVisitorNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-shadow"
                      placeholder="Anything the space manager should know"
                    />
                  </div>

                  <p className="text-xs text-gray-400">
                    By submitting, you agree that your contact details will be shared with the space manager for booking purposes.
                  </p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm active:scale-[0.98]"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Booking...
                      </span>
                    ) : (
                      'Book Desk'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="text-center mt-6">
      <a
        href="https://ohmydesk.app"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
      >
        Powered by OhMyDesk
      </a>
    </div>
  );
}
