import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MeetingRoom, MeetingRoomBooking } from '@shared/schema';
import ClientAutocomplete from '@/components/ClientAutocomplete';
import { useCreateMeetingRoomBooking, useUpdateMeetingRoomBooking, useCancelMeetingRoomBooking } from '@/hooks/use-meeting-room-bookings';
import { currencySymbols } from '@/lib/settings';

// 08:00 to 20:00 in 30-min increments
const TIME_SLOTS: string[] = Array.from({ length: 25 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function slotToIso(date: string, slot: string): string {
  return new Date(`${date}T${slot}:00`).toISOString();
}

function isoToSlot(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes() < 30 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

function computePrice(startSlot: string, endSlot: string, hourlyRate: number): number {
  const [sh, sm] = startSlot.split(':').map(Number);
  const [eh, em] = endSlot.split(':').map(Number);
  const durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  return Math.round(durationHours * hourlyRate * 100) / 100;
}

interface Props {
  date: string;
  orgId: string;
  currency: string;
  rooms: MeetingRoom[];
  initialRoomId: string;
  initialSlot: string;
  booking?: MeetingRoomBooking;
  onClose: () => void;
}

export default function MeetingRoomBookingModal({
  date, orgId, currency, rooms, initialRoomId, initialSlot, booking, onClose,
}: Props) {
  const { toast } = useToast();
  const createBooking = useCreateMeetingRoomBooking();
  const updateBooking = useUpdateMeetingRoomBooking();
  const cancelBooking = useCancelMeetingRoomBooking();

  const isEdit = !!booking;

  const [roomId, setRoomId] = useState(isEdit ? booking.meetingRoomId : initialRoomId);
  const [startSlot, setStartSlot] = useState(isEdit ? isoToSlot(booking.startTime) : initialSlot);
  const [endSlot, setEndSlot] = useState(() => {
    if (isEdit) return isoToSlot(booking.endTime);
    const startIdx = TIME_SLOTS.indexOf(initialSlot);
    return TIME_SLOTS[Math.min(startIdx + 2, TIME_SLOTS.length - 1)]; // default +1 hour
  });
  const [personName, setPersonName] = useState(isEdit ? (booking.personName ?? '') : '');
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState(isEdit ? (booking.title ?? '') : '');
  const [price, setPrice] = useState<string>(() => {
    if (isEdit && booking.price != null) return String(booking.price);
    const room = rooms.find(r => r.id === (isEdit ? booking.meetingRoomId : initialRoomId));
    if (!room) return '0';
    return String(computePrice(isEdit ? isoToSlot(booking.startTime) : initialSlot,
      isEdit ? isoToSlot(booking.endTime) : TIME_SLOTS[Math.min(TIME_SLOTS.indexOf(initialSlot) + 2, TIME_SLOTS.length - 1)],
      room.hourlyRate));
  });
  const [notes, setNotes] = useState(isEdit ? (booking.notes ?? '') : '');

  const selectedRoom = rooms.find(r => r.id === roomId);
  const currencySymbol = currencySymbols[currency] ?? currency;

  // Auto-recalculate price when room/times change (only if not edited manually)
  const [priceTouched, setPriceTouched] = useState(false);
  useEffect(() => {
    if (priceTouched) return;
    if (!selectedRoom) return;
    const startIdx = TIME_SLOTS.indexOf(startSlot);
    const endIdx = TIME_SLOTS.indexOf(endSlot);
    if (endIdx > startIdx) {
      setPrice(String(computePrice(startSlot, endSlot, selectedRoom.hourlyRate)));
    }
  }, [roomId, startSlot, endSlot, priceTouched]);

  const endSlotOptions = TIME_SLOTS.filter(s => s > startSlot);

  const handleSave = async () => {
    if (!selectedRoom) return;
    const startIso = slotToIso(date, startSlot);
    const endIso = slotToIso(date, endSlot);

    try {
      if (isEdit) {
        await updateBooking.mutateAsync({
          id: booking.id,
          orgId,
          date,
          startTime: startIso,
          endTime: endIso,
          personName: personName || undefined,
          title: title || undefined,
          price: price ? parseFloat(price) : undefined,
          notes: notes || undefined,
        });
        toast({ title: 'Booking updated' });
      } else {
        await createBooking.mutateAsync({
          orgId,
          meetingRoomId: roomId,
          date,
          startTime: startIso,
          endTime: endIso,
          personName: personName || undefined,
          title: title || undefined,
          price: price ? parseFloat(price) : undefined,
          currency,
          notes: notes || undefined,
        });
        toast({ title: 'Booking created' });
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error && err.message.includes('exclusion constraint')
        ? 'This time slot overlaps with an existing booking.'
        : 'Failed to save booking.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    try {
      await cancelBooking.mutateAsync({ id: booking.id, orgId });
      toast({ title: 'Booking cancelled' });
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel booking.', variant: 'destructive' });
    }
  };

  const isPending = createBooking.isPending || updateBooking.isPending || cancelBooking.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle>{isEdit ? 'Edit Booking' : 'New Booking'}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 space-y-3 pb-2">
          {/* Room */}
          <div>
            <Label>Meeting Room</Label>
            <Select value={roomId} onValueChange={setRoomId} disabled={isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {rooms.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time + Price on one row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time</Label>
              <Select value={startSlot} onValueChange={s => { setStartSlot(s); if (endSlot <= s) setEndSlot(TIME_SLOTS[Math.min(TIME_SLOTS.indexOf(s) + 2, TIME_SLOTS.length - 1)]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.slice(0, -1).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>End Time</Label>
              <Select value={endSlot} onValueChange={setEndSlot}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {endSlotOptions.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Person / Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Person</Label>
              <ClientAutocomplete
                value={personName}
                clientId={clientId}
                onChange={(name, cId) => { setPersonName(name); setClientId(cId); }}
              />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Team meeting" />
            </div>
          </div>

          {/* Price */}
          <div>
            <div className="flex items-baseline justify-between">
              <Label>Price ({currencySymbol})</Label>
              {selectedRoom && !priceTouched && (
                <span className="text-xs text-gray-400">Auto: {currencySymbol}{selectedRoom.hourlyRate}/hr</span>
              )}
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => { setPrice(e.target.value); setPriceTouched(true); }}
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" rows={2} className="resize-none" />
          </div>
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex gap-2">
          {isEdit && (
            <Button variant="destructive" onClick={handleCancel} disabled={isPending} size="sm">
              Cancel Booking
            </Button>
          )}
          <Button
            className="flex-1 ml-auto"
            onClick={handleSave}
            disabled={isPending || !roomId || endSlot <= startSlot}
          >
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
