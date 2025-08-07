import { DeskBooking, DeskStatus } from '@shared/schema';
import { cn } from '@/lib/utils';

interface DeskCellProps {
  deskId: string;
  date: string;
  booking: DeskBooking | null;
  onClick: (event?: React.MouseEvent) => void;
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
  const isBooked = status === 'booked' && booking?.personName;
  const isAssigned = status === 'assigned' && booking?.personName;
  const hasBooking = isBooked || isAssigned;

  return (
    <div
      className={cn(
        'desk-cell rounded-lg p-2 min-h-[80px] flex flex-col items-center justify-center text-center',
        config.className
      )}
      onClick={(e) => onClick(e)}
      onContextMenu={(e) => onClick(e)}
    >
      <span className={cn('material-icon text-sm', config.iconColor)}>
        {config.icon}
      </span>
      
      {hasBooking ? (
        <div className="mt-1">
          <div className={cn('text-xs font-semibold', config.iconColor)}>
            {booking?.personName}
          </div>
          {booking?.title && (
            <div className={cn('text-[10px] leading-tight mt-0.5', config.iconColor)}>
              {booking.title.length > 20 ? `${booking.title.slice(0, 20)}...` : booking.title}
            </div>
          )}
          {booking?.price && (
            <div className={cn('text-[10px] font-medium mt-0.5', config.iconColor)}>
              ${booking.price}
            </div>
          )}
        </div>
      ) : (
        <div className={cn('text-xs font-medium mt-1', config.iconColor)}>
          {config.label}
        </div>
      )}
    </div>
  );
}
