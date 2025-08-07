import { DeskBooking, DeskStatus } from '@shared/schema';
import { cn } from '@/lib/utils';

interface DeskCellProps {
  deskId: string;
  date: string;
  booking: DeskBooking | null;
  onClick: () => void;
}

const statusConfig = {
  available: {
    className: 'desk-available',
    icon: 'check_circle',
    iconColor: 'text-green-700',
    label: 'Available'
  },
  booked: {
    className: 'desk-booked',
    icon: 'event_busy',
    iconColor: 'text-orange-700',
    label: 'Booked'
  },
  unavailable: {
    className: 'desk-unavailable',
    icon: 'block',
    iconColor: 'text-red-700',
    label: 'Unavailable'
  },
  assigned: {
    className: 'desk-assigned',
    icon: 'person',
    iconColor: 'text-blue-600',
    label: 'Assigned'
  }
};

export default function DeskCell({ booking, onClick }: DeskCellProps) {
  const status: DeskStatus = booking?.status || 'available';
  const config = statusConfig[status];
  const isAssigned = status === 'assigned' && booking?.personName;

  return (
    <div
      className={cn(
        'desk-cell rounded-lg p-3 min-h-[80px] flex flex-col items-center justify-center',
        config.className
      )}
      onClick={onClick}
    >
      <span className={cn('material-icon text-sm', config.iconColor)}>
        {config.icon}
      </span>
      <div className={cn('text-xs font-medium mt-1 text-center', config.iconColor)}>
        {isAssigned ? booking.personName : config.label}
      </div>
    </div>
  );
}
