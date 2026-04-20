import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PublicAvailability, Client } from '@shared/schema';
import { SupabaseDataStore } from '@/lib/supabaseDataStore';
import { supabaseClient } from '@/lib/supabaseClient';
import { loadPublicFloorPlan, type FloorPlanData } from '@/hooks/use-floor-plan';
import { isNonWorkingDay, DAY_LABELS } from '@/lib/workingDays';
import { formatLocalDate } from '@/lib/dateUtils';
import { buildAvailabilityMap, pickRandomAvailableDesk, getIsoDay } from '@/lib/bookingAvailability';
import { Loader2, CalendarCheck, Check, MapPin, CalendarDays, Package } from 'lucide-react';
import { SpaceContactBar } from '@/components/shared/SpaceContactBar';
import { FloorPlanReadOnly } from '@/components/floor-plan/FloorPlanReadOnly';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { PoweredByFooter } from '@/components/booking/PoweredByFooter';

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
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assignments, setAssignments] = useState<{ date: string; deskId: string; deskLabel: string }[]>([]);
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [updatedBalance, setUpdatedBalance] = useState<{ remaining: number; total: number } | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [flexConfig, setFlexConfig] = useState<{ days: number; price: number } | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<{ date: string; deskLabel: string }[]>([]);

  useEffect(() => {
    if (!orgSlug || !memberId) return;

    const todayStr = formatLocalDate(new Date());

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
    return buildAvailabilityMap(availability);
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
        <PoweredByFooter />
      </div>
    );
  }

  const flexRemaining = member.flexTotalDays - member.flexUsedDays;
  const noBalance = member.flexActive && flexRemaining <= 0;

  if (submitted) {
    const balance = updatedBalance || { remaining: flexRemaining - assignments.length, total: member.flexTotalDays };
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg border p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">You're in, {member.name}!</h1>
            <p className="text-gray-500 mt-3">
              {assignments.length === 1 ? 'Your desk' : `${assignments.length} desks`} at <span className="font-medium">{availability.org.name}</span> {assignments.length === 1 ? 'is' : 'are'} reserved.
            </p>
            <div className="mt-5 space-y-2 text-left">
              {assignments.map(a => {
                const d = new Date(a.date + 'T00:00:00');
                const label = `${DAY_LABELS[getIsoDay(d)]}, ${d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`;
                return (
                  <div key={a.date} className="flex items-center justify-between bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                    <span>{label}</span>
                    <span className="flex items-center gap-1 text-blue-500"><MapPin className="h-3.5 w-3.5" />{a.deskLabel}</span>
                  </div>
                );
              })}
            </div>
            {floorPlan && assignments.length === 1 && (
              <div className="mt-4">
                <FloorPlanReadOnly
                  positions={floorPlan.positions}
                  objects={floorPlan.objects}
                  highlightDeskId={floorPlan.highlightDeskId}
                  highlightLabel={assignments[0].deskLabel}
                />
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
                  setSelectedDates([]);
                  setError('');
                  setAssignments([]);
                  setFloorPlan(null);
                  setMember(prev => prev ? {
                    ...prev,
                    flexUsedDays: prev.flexTotalDays - balance.remaining,
                  } : prev);
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
          <PoweredByFooter />
        </div>
      </div>
    );
  }

  const { org, rooms, bookedSlots } = availability;
  const bookedSet = new Set(bookedSlots.map(s => `${s.deskId}:${s.date}`));
  const allDesks = rooms.flatMap(r => r.desks);

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

  const perVisitPrice = flexConfig && flexConfig.days > 0
    ? flexConfig.price / flexConfig.days
    : 0;

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleSubmit = async () => {
    if (selectedDates.length === 0) return;

    if (noBalance) {
      setError('Your flex balance is empty. Please contact the space manager.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Assign a desk for each selected date
      const newAssignments: { date: string; deskId: string; deskLabel: string }[] = [];
      for (const date of selectedDates) {
        const desk = pickRandomAvailableDesk(allDesks, bookedSet, date);
        if (!desk) {
          setError(`Sorry, no desks are available on ${date}. Please adjust your selection.`);
          setSubmitting(false);
          return;
        }
        bookedSet.add(`${desk.deskId}:${date}`);
        newAssignments.push({ date, deskId: desk.deskId, deskLabel: desk.label });
      }

      // Batch insert — atomic single Postgres statement
      const { error: insertError } = await supabaseClient
        .from('desk_bookings')
        .insert(newAssignments.map(a => ({
          desk_id: a.deskId,
          date: a.date,
          start_date: a.date,
          end_date: a.date,
          status: 'assigned',
          organization_id: org.id,
          person_name: member.name,
          client_id: parseInt(member.id, 10),
          is_flex: true,
          price: Math.round((perVisitPrice || 0) * 100) / 100,
          currency: org.currency || 'EUR',
          created_at: new Date().toISOString(),
        })));

      if (insertError) throw insertError;

      // Deduct N flex days in one update
      const n = newAssignments.length;
      if (member.flexActive) {
        await supabaseClient
          .from('clients')
          .update({ flex_used_days: member.flexUsedDays + n })
          .eq('id', parseInt(member.id, 10));

        setUpdatedBalance({
          remaining: member.flexTotalDays - (member.flexUsedDays + n),
          total: member.flexTotalDays,
        });
      }

      setAssignments(newAssignments);
      setSubmitted(true);

      // Load floor plan for the first assigned desk
      loadPublicFloorPlan(org.id, newAssignments[0].deskId, availability.rooms)
        .then((data) => { if (data) setFloorPlan(data); })
        .catch(() => {});

      // Fire-and-forget Telegram notification (first date only — summary)
      supabaseClient.functions.invoke('notify-public-booking', {
        body: {
          organization_id: org.id,
          visitor_name: member.name,
          visitor_phone: null,
          desk_id: newAssignments[0].deskId,
          date: newAssignments[0].date,
          notes: n > 1 ? `Flex plan self-booking (${n} days)` : 'Flex plan self-booking',
        },
      }).catch(() => {});

      // ONE confirmation email listing all dates
      if (member.email) {
        const newRemaining = member.flexTotalDays - (member.flexUsedDays + n);
        const emailType = newRemaining <= 0 ? 'last_day' : 'booking_confirmation';
        supabaseClient.functions.invoke('flex-email', {
          body: {
            type: emailType,
            clientId: parseInt(member.id, 10),
            organizationId: org.id,
            bookingDates: newAssignments.map(a => a.date),
            deskLabels: newAssignments.map(a => a.deskLabel),
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
            {upcomingBookings.length > 0 && selectedDates.length === 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Your upcoming bookings</h2>
                <div className="space-y-1.5">
                  {upcomingBookings.map(b => {
                    const d = new Date(b.date + 'T00:00:00');
                    return (
                      <div key={b.date} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                        <span className="text-gray-700">
                          {DAY_LABELS[getIsoDay(d)]}, {d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
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
            ) : (
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Pick your dates</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[{ dateStr: todayStr, label: 'Today', available: todayAvailable, isWorkingDay: todayIsWorkingDay },
                      { dateStr: tomorrowStr, label: 'Tomorrow', available: tomorrowAvailable, isWorkingDay: tomorrowIsWorkingDay }]
                      .map(({ dateStr, label, available, isWorkingDay }) => {
                        const selected = selectedDates.includes(dateStr);
                        const atCap = !selected && selectedDates.length >= flexRemaining;
                        const disabled = !available || atCap;
                        return (
                          <button
                            key={dateStr}
                            disabled={disabled}
                            onClick={() => available && !atCap && toggleDate(dateStr)}
                            className={`relative flex flex-col items-center py-1.5 px-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                              selected
                                ? 'border-amber-500 bg-amber-50 cursor-pointer'
                                : disabled
                                  ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
                                  : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 cursor-pointer'
                            }`}
                          >
                            {selected && (
                              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </span>
                            )}
                            <span className={`text-base font-bold ${disabled && !selected ? 'text-gray-300' : 'text-gray-900'}`}>{label}</span>
                            <span className={`text-xs mt-0 ${disabled && !selected ? 'text-gray-400' : 'text-gray-500'}`}>
                              {available ? `${availabilityMap[dateStr]} free` : isWorkingDay ? 'Full' : 'Closed'}
                            </span>
                          </button>
                        );
                      })}
                  </div>

                  {!showCalendar ? (
                    <button
                      onClick={() => setShowCalendar(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-sm font-medium text-gray-600 active:scale-[0.98]"
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
                      maxSelections={flexRemaining}
                      selectedDates={selectedDates}
                    />
                  )}

                  {selectedDates.length > 0 && (
                    <>
                      <div className="space-y-1.5">
                        {selectedDates.sort().map(dateStr => {
                          const d = new Date(dateStr + 'T00:00:00');
                          return (
                            <div key={dateStr} className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg text-sm">
                              <span className="text-amber-900 font-medium">
                                {DAY_LABELS[getIsoDay(d)]}, {d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                              </span>
                              <button onClick={() => toggleDate(dateStr)} className="text-amber-400 hover:text-amber-600 text-xs ml-2">✕</button>
                            </div>
                          );
                        })}
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
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
                          `Confirm ${selectedDates.length} Day${selectedDates.length > 1 ? 's' : ''} Booking`
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <PoweredByFooter />
      </div>
    </div>
  );
}

