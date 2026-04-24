import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Desk, DeskBooking, DeskStatus, Currency, Client, PlanType } from '@shared/schema';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDataStore } from '@/contexts/DataStoreContext';
import { currencySymbols } from '@/lib/settings';
import { Armchair, CalendarX, User, AlertCircle, Loader2, Check, Trash2, X, Share2, Package, ArrowRightLeft, Snowflake, CalendarDays, CalendarRange, Calendar, Infinity as InfinityIcon, StopCircle, BadgeCheck, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatLocalDate } from '@/lib/dateUtils';
import { Checkbox } from '@/components/ui/checkbox';
import ClientAutocomplete from '@/components/members/ClientAutocomplete';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { computePlanEnd, planAutoPrice, inferPlanFromBooking } from '@/lib/planDates';

const MAX_CONFLICT_SUGGESTIONS = 6;

const PLAN_META: Record<Exclude<PlanType, 'flex'>, { icon: typeof Calendar; label: string }> = {
  day_pass: { icon: Calendar, label: 'Day pass' },
  weekly: { icon: CalendarDays, label: 'Weekly' },
  monthly: { icon: CalendarRange, label: 'Monthly' },
  custom: { icon: ArrowRightLeft, label: 'Custom' },
};
const PLAN_TOGGLE_ORDER: Array<Exclude<PlanType, 'flex'>> = ['day_pass', 'weekly', 'monthly', 'custom'];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: DeskBooking | null;
  deskId: string;
  date: string;
  desks: Desk[];
  currency: Currency;
  onSave: (bookingData: {
    personName: string;
    title: string;
    price: number;
    status: DeskStatus;
    startDate: string;
    endDate: string;
    currency: Currency;
    clientId?: string;
    isFlex?: boolean;
    isOngoing?: boolean;
    planType?: PlanType;
    newDeskId?: string;
  }) => Promise<void>;
  onDiscard?: () => Promise<void>;
  onFreezePlan?: (pausedAt: string) => Promise<void>;
  onEndContract?: (newEndDate: string) => Promise<void>;
  onMarkOngoingPaid?: () => Promise<unknown>;
  onShare?: (savedData: { personName: string; startDate: string; endDate: string; status: DeskStatus; title: string; price: number; currency: Currency; clientId?: string }) => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  booking,
  deskId,
  date,
  desks,
  currency,
  onSave,
  onDiscard,
  onFreezePlan,
  onEndContract,
  onMarkOngoingPaid,
  onShare,
}: BookingModalProps) {
  const { currentOrg } = useOrganization();
  const dataStore = useDataStore();
  const defaultPrice = currentOrg?.defaultPricePerDay ?? 8;
  const flexConfigured = !!(currentOrg?.flexPlanDays && currentOrg.flexPlanDays > 0 && currentOrg?.flexPlanPrice && currentOrg.flexPlanPrice > 0);
  const flexPerVisit = flexConfigured ? (currentOrg!.flexPlanPrice! / currentOrg!.flexPlanDays!) : 0;
  const [personName, setPersonName] = useState('');
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const flexClient = selectedClient?.flexActive ? selectedClient : null;
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<DeskStatus>('assigned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [conflictError, setConflictError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [freezeDate, setFreezeDate] = useState('');
  const [isFreezing, setIsFreezing] = useState(false);
  const [shareOnSave, setShareOnSave] = useState(false);
  const [isOngoing, setIsOngoing] = useState(false);
  const [endContractDialogOpen, setEndContractDialogOpen] = useState(false);
  const [endContractDate, setEndContractDate] = useState('');
  const [isEndingContract, setIsEndingContract] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [newDeskId, setNewDeskId] = useState<string>(deskId);
  const [availableDesks, setAvailableDesks] = useState<Desk[]>([]);
  const [loadingDesks, setLoadingDesks] = useState(false);
  const [planKey, setPlanKey] = useState<PlanType>('day_pass');
  const [busyDeskIds, setBusyDeskIds] = useState<Set<string>>(new Set());
  const planChangedByUser = useRef(false);

  const weeklyEnabled = !!(currentOrg?.weeklyPlanPrice && currentOrg.weeklyPlanPrice > 0);
  const monthlyEnabled = !!(currentOrg?.monthlyPlanPrice && currentOrg.monthlyPlanPrice > 0);
  const availablePlans = useMemo<PlanType[]>(() => {
    const plans: PlanType[] = ['day_pass'];
    if (weeklyEnabled) plans.push('weekly');
    if (monthlyEnabled) plans.push('monthly');
    plans.push('custom');
    return plans;
  }, [weeklyEnabled, monthlyEnabled]);

  useEffect(() => {
    if (isOpen) {
      setPersonName(booking?.personName || '');
      setClientId(booking?.clientId);
      setSelectedClient(null);
      setTitle(booking?.title || '');
      setPrice(booking?.price?.toString() || String(defaultPrice));
      setStatus(booking?.status || 'assigned');
      setNewDeskId(deskId);

      // Handle date logic more carefully
      if (booking) {
        // For existing bookings, check if it's a single-day or multi-day booking
        const isSingleDay = booking.startDate === booking.endDate;

        if (isSingleDay) {
          // Single-day booking: use the clicked date for both start and end
          setStartDate(date);
          setEndDate(date);
        } else {
          // Multi-day booking: preserve the original date range
          setStartDate(booking.startDate);
          setEndDate(booking.endDate);
        }
      } else {
        // New booking: use the clicked date
        setStartDate(date);
        setEndDate(date);
      }

      setConflictError('');
      setConfirmDiscard(false);
      setFreezeDialogOpen(false);
      setShareOnSave(false);
      setEndDateTouched(isOpen && !!booking && booking.startDate !== booking.endDate);
      setPlanKey(booking ? inferPlanFromBooking(booking) : 'day_pass');
      setIsOngoing(!!booking?.isOngoing);
      setEndContractDialogOpen(false);
    }
  }, [isOpen, booking, date]);

  // When the user manually switches plan, reset the auto-price. Skip during
  // modal initialization (planKey set from existing booking on open).
  useEffect(() => {
    if (!planChangedByUser.current) return;
    planChangedByUser.current = false;
    if (!isOpen) return;
    if (planKey === 'custom' || planKey === 'flex') return;
    const auto = planAutoPrice(planKey, currentOrg);
    if (auto != null) setPrice(auto.toString());
    setEndDateTouched(false);
  }, [planKey]);

  // Slave endDate to startDate for fixed-length plans; only setState if the
  // computed value actually differs to avoid needless re-renders.
  useEffect(() => {
    if (!isOpen) return;
    if (planKey === 'custom' || planKey === 'flex') return;
    if (!startDate) return;
    const nextEnd = computePlanEnd(planKey, startDate);
    if (nextEnd !== endDate) setEndDate(nextEnd);
  }, [planKey, startDate]);

  // Ongoing is only valid for monthly plans (rolling renewal) that are
  // operator-assigned. Keeps revenue/member-reporting semantics simple since
  // every ongoing booking flows through the same dedicated-plan query path.
  const ongoingEligible = planKey === 'monthly'
    && status === 'assigned'
    && !flexClient;
  useEffect(() => {
    if (!ongoingEligible && isOngoing) setIsOngoing(false);
  }, [ongoingEligible, isOngoing]);

  // Scan the current range for conflicts (applies to both new and existing
  // bookings — a plan can stretch dates beyond what the user clicked).
  useEffect(() => {
    if (!isOpen || !startDate || !endDate) {
      setAvailableDesks(desks);
      setBusyDeskIds(new Set());
      return;
    }
    let cancelled = false;
    setLoadingDesks(true);

    dataStore.getBookingsForDateRange(startDate, endDate).then(allBookings => {
      if (cancelled) return;

      const busy = new Set<string>();
      for (const b of allBookings) {
        // Ignore every row that belongs to the booking being edited. Bookings
        // are stored one row per day (id = `${deskId}-${date}`) so matching by
        // id only excludes the clicked day — the other days of a multi-day
        // plan would otherwise flag the desk as busy against itself.
        if (
          booking &&
          b.deskId === booking.deskId &&
          b.date >= booking.startDate &&
          b.date <= booking.endDate
        ) continue;
        if (b.status !== 'available') {
          busy.add(b.deskId);
        }
      }

      // Dropdown keeps the current desk as an option even if "busy" so the user
      // can always stay put; suggestions exclude it (see freeDesks below).
      const dropdown = desks.filter(d => d.id === deskId || !busy.has(d.id));
      setAvailableDesks(dropdown);
      setBusyDeskIds(busy);
      setLoadingDesks(false);
    }).catch(() => {
      if (!cancelled) {
        setAvailableDesks(desks);
        setBusyDeskIds(new Set());
        setLoadingDesks(false);
      }
    });

    return () => { cancelled = true; };
  }, [isOpen, booking, startDate, endDate, deskId, desks, dataStore]);

  const activeDeskId = newDeskId || deskId;
  const hasDeskConflict = !!startDate && !!endDate && busyDeskIds.has(activeDeskId);
  const freeDesks = useMemo(
    () => desks.filter(d => d.id !== activeDeskId && !busyDeskIds.has(d.id)),
    [desks, busyDeskIds, activeDeskId],
  );

  // Fetch selected client data (used for flex plan + freeze window checks)
  useEffect(() => {
    if (!clientId || !dataStore.getClientById) {
      setSelectedClient(null);
      return;
    }
    let cancelled = false;
    dataStore.getClientById(clientId).then(c => {
      if (!cancelled) {
        setSelectedClient(c ?? null);
        // Auto-fill per-visit price for flex members — only for new bookings
        if (c?.flexActive && flexPerVisit > 0 && !booking) {
          setPrice(flexPerVisit.toFixed(2));
          setStatus('assigned');
        }
      }
    });
    return () => { cancelled = true; };
  }, [clientId, flexPerVisit, booking, dataStore]);

  const handleSave = async () => {
    const trimmedName = personName.trim();
    const trimmedTitle = title.trim();
    const typedPrice = parseFloat(price);
    // Flex bookings must always carry the per-visit price. If the price
    // field was left at 0 (e.g. client selected before org data loaded, or
    // planKey effect wiped it), fall back to the computed flex rate so we
    // never persist a 0 flex booking.
    const parsedPrice = flexClient && flexPerVisit > 0 && (isNaN(typedPrice) || typedPrice === 0)
      ? flexPerVisit
      : typedPrice;

    if (trimmedName && parsedPrice >= 0 && startDate && endDate) {
      try {
        setIsLoading(true);
        setConflictError('');
        await onSave({
          personName: trimmedName,
          title: trimmedTitle,
          price: parsedPrice,
          status: status,
          startDate: startDate,
          endDate: endDate,
          currency: currency,
          clientId: clientId,
          isFlex: !!flexClient,
          isOngoing: isOngoing && ongoingEligible,
          planType: flexClient ? 'flex' : planKey,
          newDeskId: newDeskId !== deskId ? newDeskId : undefined,
        });
        if (onShare && shareOnSave) {
          onShare({
            personName: trimmedName,
            startDate,
            endDate,
            status,
            title: trimmedTitle,
            price: parsedPrice,
            currency,
            clientId,
          });
        } else {
          onClose();
        }
      } catch (error: any) {
        if (error.message && error.message.includes('conflict')) {
          setConflictError(error.message);
        } else {
          setConflictError('An error occurred while saving the booking.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleDiscard = async () => {
    if (!onDiscard) return;
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    try {
      setIsDiscarding(true);
      await onDiscard();
      onClose();
    } catch (error) {
      setConflictError('Failed to discard booking.');
    } finally {
      setIsDiscarding(false);
      setConfirmDiscard(false);
    }
  };

  const openFreezeDialog = () => {
    const today = formatLocalDate(new Date());
    // Default to whichever is later: today or the plan's start (can't freeze
    // before the plan started — past days already count as revenue anyway).
    const defaultDate = booking && booking.startDate > today ? booking.startDate : today;
    setFreezeDate(defaultDate);
    setFreezeDialogOpen(true);
  };

  const openEndContractDialog = () => {
    const today = formatLocalDate(new Date());
    const defaultDate = booking && booking.startDate > today ? booking.startDate : today;
    setEndContractDate(defaultDate);
    setEndContractDialogOpen(true);
  };

  const handleEndContractConfirm = async () => {
    if (!onEndContract || !endContractDate) return;
    try {
      setIsEndingContract(true);
      await onEndContract(endContractDate);
      setEndContractDialogOpen(false);
      onClose();
    } catch (error) {
      setConflictError('Failed to end contract.');
    } finally {
      setIsEndingContract(false);
    }
  };

  const handleMarkOngoingPaid = async () => {
    if (!onMarkOngoingPaid) return;
    try {
      setIsMarkingPaid(true);
      await onMarkOngoingPaid();
      onClose();
    } catch (error) {
      setConflictError('Failed to mark as paid.');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleFreezeConfirm = async () => {
    if (!onFreezePlan || !freezeDate) return;
    try {
      setIsFreezing(true);
      await onFreezePlan(freezeDate);
      setFreezeDialogOpen(false);
      onClose();
    } catch (error) {
      setConflictError('Failed to freeze plan.');
    } finally {
      setIsFreezing(false);
    }
  };

  const isExistingBooking = booking && booking.status !== 'available';

  const desk = desks.find(d => d.id === deskId);

  // Safely format the date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Invalid Date';

    try {
      // Ensure the date string is in YYYY-MM-DD format
      const parsedDate = new Date(dateStr + 'T00:00:00');
      if (isNaN(parsedDate.getTime())) {
        return dateStr; // Return original string if parsing fails
      }

      return parsedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateStr; // Return original string if error
    }
  };

  const formattedDate = formatDate(date);

  const isValidForm = personName.trim() &&
                     price.trim() && !isNaN(parseFloat(price)) && parseFloat(price) >= 0 &&
                     startDate && endDate && startDate <= endDate &&
                     !hasDeskConflict;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5 text-blue-600" />
            Book Desk
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Label className="text-sm font-medium text-blue-900">Desk Information</Label>
            <p className="text-sm text-blue-800 mt-1">
              {(desks.find(d => d.id === activeDeskId) ?? desk)?.label} - {formattedDate}
            </p>
          </div>

          {booking && (
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Move to another desk
              </Label>
              <Select value={newDeskId} onValueChange={setNewDeskId} disabled={loadingDesks}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const roomGroups = new Map<number, Desk[]>();
                    for (const d of availableDesks) {
                      const group = roomGroups.get(d.room) || [];
                      group.push(d);
                      roomGroups.set(d.room, group);
                    }
                    return Array.from(roomGroups.entries()).map(([roomNum, roomDesks]) => (
                      <SelectGroup key={roomNum}>
                        <SelectLabel>{roomDesks[0]?.roomName || `Room ${roomNum}`}</SelectLabel>
                        {roomDesks.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.label}{d.id === deskId ? ' (current)' : ''}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ));
                  })()}
                </SelectContent>
              </Select>
              {newDeskId !== deskId && (
                <p className="text-xs text-amber-600 mt-1">Booking will be moved to {desks.find(d => d.id === newDeskId)?.label}</p>
              )}
            </div>
          )}

          {/* Plan selector — hidden for flex members since flex has its own flow */}
          {!flexClient && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Plan</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {PLAN_TOGGLE_ORDER.map((key) => {
                  const enabled = availablePlans.includes(key);
                  const selected = planKey === key;
                  const { icon: Icon, label } = PLAN_META[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!enabled}
                      onClick={() => { planChangedByUser.current = true; setPlanKey(key); }}
                      className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        !enabled ? 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400' :
                        selected
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                      title={enabled ? label : `${label} plan not configured`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className={planKey === 'custom' || planKey === 'flex' ? 'grid grid-cols-2 gap-2 sm:gap-4' : ''}>
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                {planKey === 'day_pass' ? 'Date *' : 'Start Date *'}
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartDate(newStart);
                  if (planKey === 'custom' && (!endDateTouched || newStart > endDate)) {
                    setEndDate(newStart);
                  }
                }}
                className="mt-1"
                required
              />
              {planKey !== 'custom' && planKey !== 'day_pass' && planKey !== 'flex' && endDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Covers {startDate} → {endDate}
                </p>
              )}
            </div>
            {(planKey === 'custom' || planKey === 'flex') && (
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                  End Date *
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setEndDateTouched(true);
                  }}
                  min={startDate}
                  className="mt-1"
                  required
                />
              </div>
            )}
          </div>

          {ongoingEligible && (!booking || !booking.isOngoing) && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <Checkbox
                id="isOngoing"
                checked={isOngoing}
                onCheckedChange={(v) => setIsOngoing(!!v)}
              />
              <label htmlFor="isOngoing" className="text-sm text-gray-700 cursor-pointer select-none flex items-center gap-1.5 flex-1">
                <InfinityIcon className="h-3.5 w-3.5 text-emerald-600" />
                Ongoing
              </label>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-gray-400 hover:text-gray-600" aria-label="About ongoing contracts">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-center">
                    <p className="text-xs leading-relaxed">
                      Auto-books the next monthly cycle. Mark each as paid to extend by another month.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {hasDeskConflict && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">
                    {desks.find(d => d.id === activeDeskId)?.label ?? 'This desk'} isn't free for the whole range.
                  </p>
                  {freeDesks.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-amber-800 text-xs mb-1.5">Try another desk:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {freeDesks.slice(0, MAX_CONFLICT_SUGGESTIONS).map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setNewDeskId(d.id)}
                            className="px-2 py-1 rounded bg-white border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-100"
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-amber-800 text-xs mt-1">
                      No desks are free for this range. Pick a shorter range or a different start date.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="personName" className="text-sm font-medium text-gray-700">
              Name *
            </Label>
            <ClientAutocomplete
              id="personName"
              value={personName}
              clientId={clientId}
              onChange={(name, cId) => {
                setPersonName(name);
                setClientId(cId);
              }}
              maxLength={40}
              autoFocus
              onKeyDown={handleKeyDown}
            />
            {flexClient ? (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <Package className="h-3 w-3 shrink-0" />
                <span>Flex: <strong>{flexClient.flexTotalDays - flexClient.flexUsedDays}/{flexClient.flexTotalDays}</strong> days remaining</span>
                <span className="text-amber-600 ml-auto">{currencySymbols[currency]}{flexPerVisit.toFixed(2)}/visit</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {personName.length}/40 characters
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Booking Title/Purpose (Optional)
            </Label>
            <Textarea
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Team meeting, Individual work, Client presentation..."
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">
              Booking Status *
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                disabled={!!flexClient}
                onClick={() => { setStatus('booked'); setPrice('0'); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ${
                  flexClient ? 'opacity-40 cursor-not-allowed' :
                  status === 'booked'
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CalendarX className={`h-4 w-4 shrink-0 ${status === 'booked' ? 'text-orange-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">Booked</span>
              </button>
              <button
                type="button"
                disabled={!!flexClient}
                onClick={() => setStatus('assigned')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ${
                  flexClient ? 'cursor-not-allowed' :
                  status === 'assigned'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className={`h-4 w-4 shrink-0 ${status === 'assigned' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">Assigned</span>
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="price" className="text-sm font-medium text-gray-700">
              Price ({currencySymbols[currency]}) *
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                {currencySymbols[currency]}
              </span>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="8.00"
                min="0"
                step="0.01"
                className="pl-8"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the total price for this booking
            </p>
          </div>

          {!isExistingBooking && onShare && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="shareOnSave"
                checked={shareOnSave}
                onCheckedChange={(v) => setShareOnSave(!!v)}
              />
              <label htmlFor="shareOnSave" className="text-sm text-gray-600 cursor-pointer select-none flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                Share booking confirmation after saving
              </label>
            </div>
          )}

          {conflictError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Booking Conflict</h4>
                  <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{conflictError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 mt-6">
          {isExistingBooking && onDiscard && (
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={isDiscarding || isLoading || isFreezing}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {isDiscarding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Discarding...
                </>
              ) : confirmDiscard ? (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirm?
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Discard
                </>
              )}
            </Button>
          )}
          {isExistingBooking
            && onFreezePlan
            && booking?.status === 'assigned'
            && (booking?.planType === 'weekly' || booking?.planType === 'monthly')
            && !booking?.isFlex
            && !booking?.isOngoing
            && (
              <Button
                variant="outline"
                onClick={openFreezeDialog}
                disabled={isFreezing || isLoading || isDiscarding}
                className="flex-1 border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
              >
                <Snowflake className="h-4 w-4 mr-2" />
                Freeze plan
              </Button>
            )}
          {isExistingBooking && booking?.isOngoing && booking?.status === 'booked' && onMarkOngoingPaid && (
            <Button
              onClick={handleMarkOngoingPaid}
              disabled={isMarkingPaid || isLoading || isDiscarding || isEndingContract}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isMarkingPaid ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <BadgeCheck className="h-4 w-4 mr-2" />
                  Mark as paid
                </>
              )}
            </Button>
          )}
          {isExistingBooking && booking?.isOngoing && onEndContract && (
            <Button
              variant="outline"
              onClick={openEndContractDialog}
              disabled={isEndingContract || isLoading || isDiscarding || isMarkingPaid}
              className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              End contract
            </Button>
          )}
          {isExistingBooking && onShare && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onShare({
                      personName,
                      startDate,
                      endDate,
                      status,
                      title,
                      price: parseFloat(price) || 0,
                      currency,
                      clientId,
                    })}
                    disabled={isDiscarding || isLoading}
                    className="shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-center">
                  <p>Share booking confirmation via Telegram, WhatsApp, or Viber</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValidForm || isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Book Desk
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          Tip: Press Ctrl+Enter to save quickly
        </div>
      </DialogContent>

      <AlertDialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-sky-600" />
              Freeze plan
            </AlertDialogTitle>
            <AlertDialogDescription>
              Days from this date onward will be banked and the desk released.
              Earlier days stay active and counted as revenue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="freezeDate">Pause from</Label>
            <Input
              id="freezeDate"
              type="date"
              value={freezeDate}
              min={booking?.startDate}
              max={booking?.endDate}
              onChange={(e) => setFreezeDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFreezing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFreezeConfirm}
              disabled={isFreezing || !freezeDate}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              {isFreezing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Freezing...
                </>
              ) : (
                'Freeze'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={endContractDialogOpen} onOpenChange={setEndContractDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-amber-600" />
              End contract
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ongoing bookings renew until manually ended. Choose the final day
              for this contract — days after will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="endContractDate">Final day</Label>
            <Input
              id="endContractDate"
              type="date"
              value={endContractDate}
              min={booking?.startDate}
              onChange={(e) => setEndContractDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEndingContract}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndContractConfirm}
              disabled={isEndingContract || !endContractDate}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isEndingContract ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ending...
                </>
              ) : (
                'End contract'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
