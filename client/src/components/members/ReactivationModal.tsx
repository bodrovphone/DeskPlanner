import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Client, DeskBooking } from '@shared/schema';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePlanFreeze } from '@/hooks/use-plan-freeze';
import { addDays, allocatePlanDays } from '@/lib/planDates';
import { formatLocalDate } from '@/lib/dateUtils';
import { AlertCircle, Loader2, Play } from 'lucide-react';

interface ReactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  bankedBookings: DeskBooking[];
}

export default function ReactivationModal({
  isOpen,
  onClose,
  client,
  bankedBookings,
}: ReactivationModalProps) {
  const dataStore = useDataStore();
  const { legacyDesks } = useOrganization();
  const { reactivate } = usePlanFreeze();

  const bankedDays = bankedBookings.length;
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const [startDate, setStartDate] = useState(today);

  useEffect(() => {
    if (isOpen) setStartDate(today);
  }, [isOpen, today]);

  const windowEnd = useMemo(
    () => (bankedDays > 0 ? addDays(startDate, bankedDays - 1) : startDate),
    [startDate, bankedDays],
  );

  const { data: busyByDate, isFetching } = useQuery({
    queryKey: ['reactivate-availability', client?.id, startDate, windowEnd],
    queryFn: async (): Promise<Record<string, Set<string>>> => {
      if (!client || bankedDays === 0 || !dataStore.getBookingsForDateRange) {
        return {};
      }
      const bookings = await dataStore.getBookingsForDateRange(startDate, windowEnd);
      const map: Record<string, Set<string>> = {};
      for (const b of bookings) {
        // Skip this client's own banked rows — they're about to be moved.
        if (b.clientId === client.id && b.pausedAt) continue;
        if (b.status === 'available') continue;
        if (!map[b.date]) map[b.date] = new Set();
        map[b.date].add(b.deskId);
      }
      return map;
    },
    enabled: isOpen && !!client && bankedDays > 0,
  });

  const allocation = useMemo(() => {
    if (!busyByDate) return null;
    return allocatePlanDays({
      startDate,
      bankedDays,
      allDeskIds: legacyDesks.map((d) => d.id),
      busyByDate,
    });
  }, [busyByDate, startDate, bankedDays, legacyDesks]);

  const deskLabel = (deskId: string) =>
    legacyDesks.find((d) => d.id === deskId)?.label ?? deskId;

  const canConfirm =
    !!allocation
    && !allocation.error
    && allocation.allocations.length === bankedDays
    && bankedDays > 0;

  const handleConfirm = async () => {
    if (!client || !allocation || !canConfirm) return;
    await reactivate.mutateAsync({
      clientId: client.id,
      clientName: client.name,
      allocations: allocation.allocations,
    });
    onClose();
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-emerald-600" />
            Reactivate {client.name}'s plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-sky-50 border border-sky-100 px-3 py-2 text-sm text-sky-900">
            <strong>{bankedDays}</strong> day{bankedDays === 1 ? '' : 's'} banked
            from the paused plan. They'll be placed day-by-day, swapping desks if
            needed to keep the plan contiguous.
          </div>

          <div>
            <Label htmlFor="reactivate-start">Start date</Label>
            <Input
              id="reactivate-start"
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            {bankedDays > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Plan will cover {startDate} → {windowEnd}
              </p>
            )}
          </div>

          {isFetching ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking desk availability…
            </div>
          ) : allocation?.error ? (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{allocation.error}</span>
            </div>
          ) : allocation?.allocations.length ? (
            <div className="rounded-md border border-gray-200 max-h-52 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-3 py-1.5">Date</th>
                    <th className="text-left px-3 py-1.5">Desk</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.allocations.map((a, i) => (
                    <tr
                      key={`${a.deskId}-${a.date}`}
                      className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    >
                      <td className="px-3 py-1">{a.date}</td>
                      <td className="px-3 py-1 font-medium">
                        {deskLabel(a.deskId)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={reactivate.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || reactivate.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {reactivate.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Reactivate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
