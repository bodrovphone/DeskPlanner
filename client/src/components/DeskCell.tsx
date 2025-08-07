import { DeskBooking, DeskStatus } from '@shared/schema';
import { currencySymbols } from '@/lib/settings';
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
  assigned: {
    className: 'desk-assigned',
    icon: 'person',
    iconColor: 'text-blue-600',
    label: 'Assigned'
  }
};

export default function DeskCell({ booking, onClick }: DeskCellProps) {
  const rawStatus = booking?.status || 'available';
  // Handle legacy 'unavailable' status by converting to 'available'
  const status: DeskStatus = (rawStatus as any) === 'unavailable' ? 'available' : rawStatus as DeskStatus;
  const config = statusConfig[status] || statusConfig.available;
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
              {currencySymbols[booking.currency || 'BGN']}{booking.price}
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
