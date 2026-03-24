import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PublicAvailability, Client } from '@shared/schema';
import { SupabaseDataStore } from '@/lib/supabaseDataStore';
import { supabaseClient } from '@/lib/supabaseClient';
import { isNonWorkingDay, DAY_LABELS } from '@/lib/workingDays';
import { Loader2, CalendarCheck, Check, MapPin, CalendarDays, Package } from 'lucide-react';
import { SpaceContactBar } from '@/components/SpaceContactBar';
import { Calendar } from '@/components/ui/calendar';

/**
 * Member self-service booking page.
 * URL: /book/:memberId/:orgSlug
 *
 * Similar to public booking but:
 * - Shows member name + flex balance
 * - No name/phone form needed
 * - Creates "assigned" booking (not "booked")
 * - Deducts from flex balance
 */

export default function MemberBookingPage() {
  const { memberId, orgSlug } = useParams<{ memberId: string; orgSlug: string }>();
  const [availability, setAvailability] = useState<PublicAvailability | null>(null);
  const [member, setMember] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assignedDeskLabel, setAssignedDeskLabel] = useState('');
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [updatedBalance, setUpdatedBalance] = useState<{ remaining: number; total: number } | null>(null);
  const [flexConfig, setFlexConfig] = useState<{ days: number; price: number } | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<{ date: string; deskLabel: string }[]>([]);

  useEffect(() => {
    if (!orgSlug || !memberId) return;

    const todayStr = formatDateStr(new Date());

    Promise.all([
      SupabaseDataStore.getPublicAvailability(orgSlug),
      supabaseClient.from('clients').select('*').eq('id', parseInt(memberId, 10)).single(),
      supabaseClient.from('organizations').select('flex_plan_days, flex_plan_price, id').eq('slug', orgSlug).single(),
    ]).then(async ([avail, { data: clientRow }, { data: orgRow }]) => {
      if (avail && clientRow) {
        setAvailability(avail);
        if (orgRow?.flex_plan_days && orgRow?.flex_plan_price) {
          setFlexConfig({ days: orgRow.flex_plan_days, price: orgRow.flex_plan_price });
        }
        setMember({
          id: String(clientRow.id),
          organizationId: clientRow.organization_id,
          name: clientRow.name,
          contact: clientRow.contact || null,
          email: clientRow.email || null,
          phone: clientRow.phone || null,
          flexActive: clientRow.flex_active || false,
          flexTotalDays: clientRow.flex_total_days || 0,
          flexUsedDays: clientRow.flex_used_days || 0,
          flexStartDate: clientRow.flex_start_date || null,
          createdAt: clientRow.created_at,
          updatedAt: clientRow.updated_at,
        });
        // Fetch upcoming bookings for this member
        if (orgRow?.id) {
          const { data: bookingRows } = await supabaseClient
            .from('desk_bookings')
            .select('date, desk_id')
            .eq('client_id', parseInt(clientRow.id, 10))
            .eq('organization_id', orgRow.id)
            .gte('date', todayStr)
            .order('date')
            .limit(5);

          if (bookingRows && bookingRows.length > 0 && avail) {
            const deskMap = new Map<string, string>();
            for (const room of avail.rooms) {
              for (const desk of room.desks) {
                deskMap.set(desk.deskId, desk.label);
              }
            }
            // Deduplicate by date (multi-day bookings have one row per date)
            const seen = new Set<string>();
            const upcoming: { date: string; deskLabel: string }[] = [];
            for (const row of bookingRows) {
              if (!seen.has(row.date)) {
                seen.add(row.date);
                upcoming.push({ date: row.date, deskLabel: deskMap.get(row.desk_id) || row.desk_id });
              }
            }
            setUpcomingBookings(upcoming);
          }
        }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [orgSlug, memberId]);

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
      const dateStr = formatDateStr(d);
      const bookedCount = allDesks.filter(desk => bookedSet.has(`${desk.deskId}:${dateStr}`)).length;
      map[dateStr] = totalDesks - bookedCount;
    }
    return { availabilityMap: map, maxDate: max };
  }, [availability]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (notFound || !availability || !member) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <CalendarCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900">Not found</h1>
          <p className="text-gray-500 mt-1">This booking link is invalid or has expired.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const flexRemaining = member.flexTotalDays - member.flexUsedDays;
  const noBalance = member.flexActive && flexRemaining <= 0;

  if (submitted) {
    const balance = updatedBalance || { remaining: flexRemaining - 1, total: member.flexTotalDays };
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg border p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">You're in, {member.name}!</h1>
            <p className="text-gray-500 mt-3">
              Your desk at <span className="font-medium">{availability.org.name}</span> is reserved.
            </p>
            {assignedDeskLabel && (
              <div className="mt-5 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                <MapPin className="h-4 w-4" />
                {assignedDeskLabel}
              </div>
            )}
            {member.flexActive && (
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium">
                <Package className="h-4 w-4" />
                {balance.remaining}/{balance.total} days remaining
              </div>
            )}
            {balance.remaining > 0 && (
              <button
                onClick={() => {
                  setSubmitted(false);
                  setSelectedDate(null);
                  setError('');
                  setAssignedDeskLabel('');
                  // Update member state with new balance
                  setMember(prev => prev ? {
                    ...prev,
                    flexUsedDays: prev.flexTotalDays - balance.remaining,
                  } : prev);
                  // Refresh availability to exclude newly booked slot
                  if (orgSlug) {
                    SupabaseDataStore.getPublicAvailability(orgSlug).then(a => { if (a) setAvailability(a); });
                  }
                }}
                className="mt-5 w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-sm active:scale-[0.98]"
              >
                Book another day
              </button>
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
          <Footer />
        </div>
      </div>
    );
  }

  const { org, rooms, bookedSlots } = availability;
  const bookedSet = new Set(bookedSlots.map(s => `${s.deskId}:${s.date}`));
  const allDesks = rooms.flatMap(r => r.desks);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateStr(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = formatDateStr(tomorrow);

  const todayAvailable = (availabilityMap[todayStr] ?? 0) > 0 && !isNonWorkingDay(todayStr, org.workingDays);
  const tomorrowAvailable = (availabilityMap[tomorrowStr] ?? 0) > 0 && !isNonWorkingDay(tomorrowStr, org.workingDays);
  const todayIsWorkingDay = !isNonWorkingDay(todayStr, org.workingDays);
  const tomorrowIsWorkingDay = !isNonWorkingDay(tomorrowStr, org.workingDays);

  const isDateDisabled = (date: Date) => {
    const dateStr = formatDateStr(date);
    if (date < today || date > maxDate) return true;
    if (isNonWorkingDay(dateStr, org.workingDays)) return true;
    if ((availabilityMap[dateStr] ?? 0) <= 0) return true;
    return false;
  };

  const getRandomAvailableDesk = (date: string) => {
    const availableDesks = allDesks.filter(desk => !bookedSet.has(`${desk.deskId}:${date}`));
    if (availableDesks.length === 0) return null;
    return availableDesks[Math.floor(Math.random() * availableDesks.length)];
  };

  const perVisitPrice = flexConfig && flexConfig.days > 0
    ? flexConfig.price / flexConfig.days
    : 0;

  const handleSubmit = async () => {
    if (!selectedDate) return;

    if (noBalance) {
      setError('Your flex balance is empty. Please contact the space manager.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const desk = getRandomAvailableDesk(selectedDate);
      if (!desk) {
        setError('Sorry, all desks just got booked. Please pick another date.');
        setSubmitting(false);
        return;
      }

      // Create an assigned booking with flex flag
      const { error: insertError } = await supabaseClient
        .from('desk_bookings')
        .insert({
          desk_id: desk.deskId,
          date: selectedDate,
          start_date: selectedDate,
          end_date: selectedDate,
          status: 'assigned',
          organization_id: org.id,
          person_name: member.name,
          client_id: parseInt(member.id, 10),
          is_flex: true,
          price: Math.round((perVisitPrice || 0) * 100) / 100,
          currency: org.currency || 'EUR',
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Deduct flex day
      if (member.flexActive) {
        await supabaseClient.rpc('increment_flex_used_days', {
          p_client_id: parseInt(member.id, 10),
        });
        const newUsed = member.flexUsedDays + 1;

        setUpdatedBalance({
          remaining: member.flexTotalDays - newUsed,
          total: member.flexTotalDays,
        });
      }

      setAssignedDeskLabel(desk.label);
      setSubmitted(true);

      // Fire-and-forget booking confirmation email (or last-day email if balance is now 0)
      if (member.email) {
        const newRemaining = member.flexTotalDays - (member.flexUsedDays + 1);
        const emailType = newRemaining <= 0 ? 'last_day' : 'booking_confirmation';
        supabaseClient.functions.invoke('flex-email', {
          body: {
            type: emailType,
            clientId: parseInt(member.id, 10),
            organizationId: org.id,
            bookingDate: selectedDate,
            deskLabel: desk.label,
          },
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Member booking error:', err);
      setError('Failed to book. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          {/* Header */}
          <div className="bg-amber-500 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              {org.logoUrl && (
                <img src={org.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-1 shrink-0" />
              )}
              <div className="flex-1">
                <h1 className="text-xl font-bold">{org.name}</h1>
                <p className="text-amber-100 text-sm mt-0.5">Welcome, {member.name}</p>
              </div>
            </div>
          </div>

          {/* Flex balance bar */}
          {member.flexActive && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <Package className="h-4 w-4" />
                <span>Flex balance</span>
              </div>
              <span className={`text-sm font-bold ${noBalance ? 'text-red-600' : 'text-amber-800'}`}>
                {flexRemaining}/{member.flexTotalDays} days
              </span>
            </div>
          )}

          <div className="p-6">
            {upcomingBookings.length > 0 && !selectedDate && (
              <div className="mb-5">
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Your upcoming bookings</h2>
                <div className="space-y-1.5">
                  {upcomingBookings.map(b => {
                    const d = new Date(b.date + 'T00:00:00');
                    const jsDay = d.getDay();
                    const isoDay = jsDay === 0 ? 7 : jsDay;
                    return (
                      <div key={b.date} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                        <span className="text-gray-700">
                          {DAY_LABELS[isoDay]}, {d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-gray-400 text-xs">{b.deskLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {noBalance ? (
              <div className="text-center py-6">
                <Package className="h-10 w-10 text-red-300 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">No flex days remaining</p>
                <p className="text-gray-500 text-sm mt-1">Contact the space manager to renew your plan.</p>
                <SpaceContactBar
                  phone={availability.org.contactPhone}
                  email={availability.org.contactEmail}
                  telegram={availability.org.contactTelegram}
                  viberEnabled={availability.org.contactViberEnabled}
                  whatsappEnabled={availability.org.contactWhatsappEnabled}
                  className="mt-6 pt-4 border-t"
                />
              </div>
            ) : !selectedDate ? (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Pick a date</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={!todayAvailable}
                      onClick={() => setSelectedDate(todayStr)}
                      className={`flex flex-col items-center py-4 px-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                        todayAvailable
                          ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 cursor-pointer'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                      }`}
                    >
                      <span className={`text-lg font-bold ${todayAvailable ? 'text-gray-900' : 'text-gray-300'}`}>Today</span>
                      <span className={`text-xs mt-0.5 ${todayAvailable ? 'text-gray-500' : 'text-gray-400'}`}>
                        {todayAvailable ? `${availabilityMap[todayStr]} free` : todayIsWorkingDay ? 'Full' : 'Closed'}
                      </span>
                    </button>
                    <button
                      disabled={!tomorrowAvailable}
                      onClick={() => setSelectedDate(tomorrowStr)}
                      className={`flex flex-col items-center py-4 px-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                        tomorrowAvailable
                          ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 cursor-pointer'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                      }`}
                    >
                      <span className={`text-lg font-bold ${tomorrowAvailable ? 'text-gray-900' : 'text-gray-300'}`}>Tomorrow</span>
                      <span className={`text-xs mt-0.5 ${tomorrowAvailable ? 'text-gray-500' : 'text-gray-400'}`}>
                        {tomorrowAvailable ? `${availabilityMap[tomorrowStr]} free` : tomorrowIsWorkingDay ? 'Full' : 'Closed'}
                      </span>
                    </button>
                  </div>

                  {!showCalendar ? (
                    <button
                      onClick={() => setShowCalendar(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-sm font-medium text-gray-600 active:scale-[0.98]"
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
                            return (availabilityMap[dateStr] ?? 0) > 0
                              && !isNonWorkingDay(dateStr, org.workingDays)
                              && date >= today && date <= maxDate;
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
              </div>
            ) : (
              <div>
                <button
                  onClick={() => { setSelectedDate(null); setError(''); }}
                  className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 mb-4 -mt-1"
                >
                  <CalendarDays className="h-4 w-4" />
                  Change date
                </button>

                <div className="bg-amber-50 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-amber-900">
                      {(() => {
                        const d = new Date(selectedDate + 'T00:00:00');
                        const jsDay = d.getDay();
                        const isoDay = jsDay === 0 ? 7 : jsDay;
                        return `${DAY_LABELS[isoDay]}, ${d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`;
                      })()}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">A desk will be assigned for you</p>
                  </div>
                  <CalendarCheck className="h-5 w-5 text-amber-400" />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-xl transition-colors text-sm active:scale-[0.98]"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Booking...
                    </span>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

function formatDateStr(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
