import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useMeetingRoomBookings } from '@/hooks/use-meeting-room-bookings';
import MeetingRoomHeader from '@/components/meeting-rooms/MeetingRoomHeader';
import TimeGrid from '@/components/meeting-rooms/TimeGrid';
import MeetingRoomBookingModal from '@/components/meeting-rooms/MeetingRoomBookingModal';
import { MeetingRoomBooking } from '@shared/schema';
import { DoorOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayString(): string {
  return toLocalDateString(new Date());
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

interface ModalState {
  roomId: string;
  slot: string;
  booking?: MeetingRoomBooking;
}

export default function MeetingRoomsPage() {
  const { currentOrg, meetingRooms } = useOrganization();
  const [date, setDate] = useState(todayString());
  const [modal, setModal] = useState<ModalState | null>(null);

  const { data: bookings = [] } = useMeetingRoomBookings(currentOrg?.id, date);

  if (!currentOrg) return null;

  if (meetingRooms.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-16">
          <DoorOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No meeting rooms configured</h2>
          <p className="text-gray-500 mb-6">Add meeting rooms in Settings to start managing hourly bookings.</p>
          <Button asChild>
            <Link to={`/${currentOrg.slug}/settings`}>
              <Settings className="h-4 w-4 mr-2" />
              Go to Settings
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Meeting Rooms</h1>
      </div>

      <MeetingRoomHeader
        date={date}
        onPrev={() => setDate(d => offsetDate(d, -1))}
        onNext={() => setDate(d => offsetDate(d, 1))}
        onDateChange={setDate}
      />

      <TimeGrid
        rooms={meetingRooms}
        bookings={bookings}
        currency={currentOrg.currency}
        onSlotClick={(roomId, slot) => setModal({ roomId, slot })}
        onBookingClick={(booking) => setModal({ roomId: booking.meetingRoomId, slot: '', booking })}
      />

      {modal && (
        <MeetingRoomBookingModal
          date={date}
          orgId={currentOrg.id}
          currency={currentOrg.currency}
          rooms={meetingRooms}
          initialRoomId={modal.roomId}
          initialSlot={modal.slot || '09:00'}
          booking={modal.booking}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
