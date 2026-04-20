import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PublicAvailability } from '@shared/schema';
import { SupabaseDataStore } from '@/lib/supabaseDataStore';
import { supabaseClient } from '@/lib/supabaseClient';
import { loadPublicFloorPlan, type FloorPlanData } from '@/hooks/use-floor-plan';
import { isNonWorkingDay, DAY_LABELS } from '@/lib/workingDays';
import { formatLocalDate } from '@/lib/dateUtils';
import { buildAvailabilityMap, pickRandomAvailableDesk, getIsoDay } from '@/lib/bookingAvailability';
import { Loader2, CalendarCheck, ChevronLeft, Check, MapPin, CalendarDays } from 'lucide-react';
import { SpaceContactBar } from '@/components/shared/SpaceContactBar';
import { FloorPlanReadOnly } from '@/components/floor-plan/FloorPlanReadOnly';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { PoweredByFooter } from '@/components/booking/PoweredByFooter';

const SCARCITY_THRESHOLD = 3;

export default function PublicBookingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [availability, setAvailability] = useState<PublicAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);

  // Form state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('+');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingAssignments, setBookingAssignments] = useState<{ date: string; deskId: string; deskLabel: string }[]>([]);
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [paymentCancelled, setPaymentCancelled] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Handle payment return URL params
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      setSubmitted(true);
      setSearchParams({}, { replace: true });
    } else if (payment === 'cancelled') {
      setPaymentCancelled(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // All hooks must be above early returns
  const { availabilityMap, maxDate } = useMemo(() => {
    if (!availability) return { availabilityMap: {} as Record<string, number>, maxDate: new Date() };
    return buildAvailabilityMap(availability);
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
        <PoweredByFooter />
      </div>
    );
  }

  if (submitted) {
    const isPaid = bookingAssignments.length === 0; // Stripe redirect path sets submitted=true with no assignments
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg border p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">You're booked!</h1>
            <p className="text-gray-500 mt-3">
              {isPaid
                ? <>Your payment was successful and your desk at <span className="font-medium">{availability.org.name}</span> is reserved. Check your email for details!</>
                : bookingAssignments.length === 1
                  ? <>Your desk at <span className="font-medium">{availability.org.name}</span> is reserved. We're looking forward to seeing you!</>
                  : <>{bookingAssignments.length} desks at <span className="font-medium">{availability.org.name}</span> are reserved.</>
              }
            </p>
            {bookingAssignments.length > 0 && (
              <div className="mt-5 space-y-2 text-left">
                {bookingAssignments.map(a => {
                  const d = new Date(a.date + 'T00:00:00');
                  const dayLabel = DAY_LABELS[getIsoDay(d)];
                  const dateLabel = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
                  return (
                    <div key={a.date} className="flex items-center justify-between bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                      <span>{dayLabel}, {dateLabel}</span>
                      <span className="flex items-center gap-1 text-blue-500"><MapPin className="h-3.5 w-3.5" />{a.deskLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {floorPlan && bookingAssignments.length === 1 && (
              <div className="mt-4">
                <FloorPlanReadOnly
                  positions={floorPlan.positions}
                  objects={floorPlan.objects}
                  highlightDeskId={floorPlan.highlightDeskId}
                  highlightLabel={bookingAssignments[0].deskLabel}
                />
              </div>
            )}
            <SpaceContactBar
              phone={availability.org.contactPhone}
              email={availability.org.contactEmail}
              telegram={availability.org.contactTelegram}
              viberEnabled={availability.org.contactViberEnabled}
              whatsappEnabled={availability.org.contactWhatsappEnabled}
              className="mt-6 pt-6 border-t"
            />
          </div>
          <PoweredByFooter />
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

  const todayStr = formatLocalDate(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = formatLocalDate(tomorrow);

  const todayAvailable = (availabilityMap[todayStr] ?? 0) > 0 && !isNonWorkingDay(todayStr, org.workingDays);
  const tomorrowAvailable = (availabilityMap[tomorrowStr] ?? 0) > 0 && !isNonWorkingDay(tomorrowStr, org.workingDays);
  const todayIsWorkingDay = !isNonWorkingDay(todayStr, org.workingDays);
  const tomorrowIsWorkingDay = !isNonWorkingDay(tomorrowStr, org.workingDays);

  const dates: { date: string; dayLabel: string; dateLabel: string; available: number }[] = [];
  for (let i = 0; i <= org.maxDaysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatLocalDate(d);
    if (isNonWorkingDay(dateStr, org.workingDays)) continue;
    const available = availabilityMap[dateStr] ?? 0;
    if (available <= 0) continue;
    dates.push({
      date: dateStr,
      dayLabel: DAY_LABELS[getIsoDay(d)] || '',
      dateLabel: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      available,
    });
  }

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const step = showContactForm ? 2 : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDates.length === 0 || !visitorName.trim()) {
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
    setPaymentCancelled(false);

    try {
      if (availability.org.stripePublicBookingPayments && selectedDates.length === 1) {
        // Paid path — single-date only (multi-date Stripe is a future task)
        const { data, error: fnError } = await supabaseClient.functions.invoke('stripe-checkout', {
          body: {
            orgSlug,
            date: selectedDates[0],
            visitorName: visitorName.trim(),
            visitorPhone: visitorPhone.trim(),
            visitorNotes: visitorNotes.trim() || undefined,
            origin: window.location.origin,
          },
        });
        if (data?.error === 'no_desks_available') {
          setError('Sorry, all desks are now taken for this date. Please pick another.');
          setSelectedDates([]);
          return;
        }
        if (fnError || !data?.checkoutUrl) {
          setError('Payment setup failed. Please try again.');
          return;
        }
        window.location.href = data.checkoutUrl;
        return;
      }

      // Free path — assign desk per date, batch insert, single owner email
      const newAssignments: { date: string; deskId: string; deskLabel: string }[] = [];
      for (const date of selectedDates) {
        const desk = pickRandomAvailableDesk(allDesks, bookedSet, date);
        if (!desk) {
          setError(`Sorry, all desks are taken on ${date}. Please adjust your selection.`);
          setSubmitting(false);
          return;
        }
        bookedSet.add(`${desk.deskId}:${date}`);
        newAssignments.push({ date, deskId: desk.deskId, deskLabel: desk.label });
      }

      const title = [visitorPhone.trim(), visitorNotes.trim()].filter(Boolean).join(' | ') || null;
      const { error: insertError } = await supabaseClient.from('desk_bookings').insert(
        newAssignments.map(a => ({
          desk_id: a.deskId,
          date: a.date,
          start_date: a.date,
          end_date: a.date,
          status: 'booked',
          organization_id: org.id,
          visitor_name: visitorName.trim(),
          visitor_email: '',
          visitor_phone: visitorPhone.trim() || null,
          visitor_notes: visitorNotes.trim() || null,
          person_name: visitorName.trim(),
          title,
          created_at: new Date().toISOString(),
        }))
      );
      if (insertError) throw insertError;

      // ONE owner notification email listing all dates
      supabaseClient.functions.invoke('notify-public-booking-email', {
        body: {
          organizationId: org.id,
          visitorName: visitorName.trim(),
          visitorPhone: visitorPhone.trim() || null,
          dates: newAssignments.map(a => ({ date: a.date, deskLabel: a.deskLabel })),
          notes: visitorNotes.trim() || null,
        },
      }).catch(() => {});

      // Telegram notification for first date
      supabaseClient.functions.invoke('notify-public-booking', {
        body: {
          organization_id: org.id,
          visitor_name: visitorName.trim(),
          visitor_phone: visitorPhone.trim() || null,
          desk_id: newAssignments[0].deskId,
          date: newAssignments[0].date,
          notes: newAssignments.length > 1 ? `${newAssignments.length} days booked` : (visitorNotes.trim() || null),
        },
      }).catch(() => {});

      setBookingAssignments(newAssignments);
      setSubmitted(true);

      if (newAssignments.length === 1) {
        loadPublicFloorPlan(org.id, newAssignments[0].deskId, availability.rooms)
          .then((data) => { if (data) setFloorPlan(data); })
          .catch(() => {});
      }
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
            {paymentCancelled && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start justify-between mb-4">
                <p className="text-sm text-amber-700">Payment was cancelled. You can try again below.</p>
                <button onClick={() => setPaymentCancelled(false)} className="text-amber-400 hover:text-amber-600 ml-2 shrink-0">&times;</button>
              </div>
            )}

            {/* Step 1: Date selection */}
            {!showContactForm && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">When do you want to come?</h2>

                {dates.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No available dates in the next {org.maxDaysAhead} days.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        disabled={!todayAvailable}
                        onClick={() => todayAvailable && toggleDate(todayStr)}
                        className={`relative flex flex-col items-center py-1.5 px-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                          todayAvailable
                            ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <span className={`text-base font-bold ${todayAvailable ? 'text-gray-900' : 'text-gray-300'}`}>Today</span>
                        {todayAvailable ? (
                          <span className="text-xs text-gray-500 mt-0">
                            {(availabilityMap[todayStr] ?? 0) <= SCARCITY_THRESHOLD
                              ? `Only ${availabilityMap[todayStr]} left`
                              : `${availabilityMap[todayStr]} desks free`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 mt-0">
                            {todayIsWorkingDay ? 'Fully booked' : 'Closed'}
                          </span>
                        )}
                      </button>

                      <button
                        disabled={!tomorrowAvailable}
                        onClick={() => tomorrowAvailable && toggleDate(tomorrowStr)}
                        className={`relative flex flex-col items-center py-1.5 px-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                          tomorrowAvailable
                            ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <span className={`text-base font-bold ${tomorrowAvailable ? 'text-gray-900' : 'text-gray-300'}`}>Tomorrow</span>
                        {tomorrowAvailable ? (
                          <span className="text-xs text-gray-500 mt-0">
                            {(availabilityMap[tomorrowStr] ?? 0) <= SCARCITY_THRESHOLD
                              ? `Only ${availabilityMap[tomorrowStr]} left`
                              : `${availabilityMap[tomorrowStr]} desks free`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 mt-0">
                            {tomorrowIsWorkingDay ? 'Oops, we\'re full' : 'Closed'}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Pick more dates from calendar */}
                    {!showCalendar ? (
                      <button
                        onClick={() => setShowCalendar(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-sm font-medium text-gray-600 active:scale-[0.98]"
                      >
                        <CalendarDays className="h-4 w-4" />
                        Pick more dates
                      </button>
                    ) : (
                      <AvailabilityCalendar
                        today={today}
                        maxDate={maxDate}
                        workingDays={org.workingDays}
                        availabilityMap={availabilityMap}
                        onSelect={toggleDate}
                        onCancel={() => setShowCalendar(false)}
                        multiple
                        selectedDates={selectedDates}
                      />
                    )}

                    {selectedDates.length > 0 && (
                      <>
                        <div className="space-y-1.5">
                          {selectedDates.sort().map(dateStr => {
                            const info = dates.find(d => d.date === dateStr);
                            return (
                              <div key={dateStr} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg text-sm">
                                <span className="text-blue-900 font-medium">
                                  {info ? `${info.dayLabel}, ${info.dateLabel}` : dateStr}
                                </span>
                                <button onClick={() => toggleDate(dateStr)} className="text-blue-300 hover:text-blue-500 text-xs ml-2">✕</button>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setShowContactForm(true)}
                          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm active:scale-[0.98]"
                        >
                          Continue with {selectedDates.length} {selectedDates.length === 1 ? 'date' : 'dates'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Contact form (desk auto-assigned) */}
            {showContactForm && (
              <div>
                <button
                  onClick={() => { setShowContactForm(false); setError(''); }}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4 -mt-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Change dates
                </button>

                <div className="space-y-1.5 mb-5">
                  {selectedDates.sort().map(dateStr => {
                    const info = dates.find(d => d.date === dateStr);
                    return (
                      <div key={dateStr} className="bg-blue-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-blue-900 text-sm">
                            {info ? `${info.dayLabel}, ${info.dateLabel}` : dateStr}
                          </p>
                          <p className="text-xs text-blue-600 mt-0.5">Desk will be assigned</p>
                        </div>
                        <button onClick={() => toggleDate(dateStr)} className="text-blue-300 hover:text-blue-500 text-xs ml-2">✕</button>
                      </div>
                    );
                  })}
                </div>

                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Your details</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="visitor-name" className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                    <input
                      id="visitor-name"
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
                    <label htmlFor="visitor-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                    <input
                      id="visitor-phone"
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
                        {availability.org.stripePublicBookingPayments ? 'Redirecting to payment...' : 'Booking...'}
                      </span>
                    ) : availability.org.stripePublicBookingPayments && selectedDates.length === 1 ? (
                      `Pay ${formatCurrency(availability.org.defaultPricePerDay, availability.org.currency)} & Book`
                    ) : (
                      selectedDates.length > 1 ? `Book ${selectedDates.length} Days` : 'Book Desk'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <PoweredByFooter />
      </div>
    </div>
  );
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
}
