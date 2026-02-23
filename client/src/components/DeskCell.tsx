import { DeskBooking, DeskStatus } from '@shared/schema';
import { currencySymbols } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { CheckCircle, CalendarX, User, Sofa } from 'lucide-react';

interface DeskCellProps {
  deskId: string;
  date: string;
  booking: DeskBooking | null;
  onClick: (event?: React.MouseEvent) => void;
  isWeekend?: boolean;
}

const statusConfig = {
  available: {
    className: 'desk-available',
    Icon: CheckCircle,
    iconColor: 'text-green-700',
    label: 'Available'
  },
  booked: {
    className: 'desk-booked',
    Icon: CalendarX,
    iconColor: 'text-orange-700',
    label: 'Booked'
  },
  assigned: {
    className: 'desk-assigned',
    Icon: User,
    iconColor: 'text-blue-600',
    label: 'Assigned'
  }
};

export default function DeskCell({ booking, onClick, isWeekend }: DeskCellProps) {
  const rawStatus = booking?.status || 'available';
  // Handle legacy 'unavailable' status by converting to 'available'
  const status: DeskStatus = (rawStatus as any) === 'unavailable' ? 'available' : rawStatus as DeskStatus;
  const config = statusConfig[status] || statusConfig.available;
  const isBooked = status === 'booked' && booking?.personName;
  const isAssigned = status === 'assigned' && booking?.personName;
  const hasBooking = isBooked || isAssigned;
  const StatusIcon = config.Icon;

  // For weekends with no booking, show weekend indicator
  if (isWeekend && !hasBooking) {
    return (
      <div
        className="desk-cell rounded-lg p-1 sm:p-2 min-h-[60px] sm:min-h-[80px] bg-gray-100 cursor-not-allowed flex flex-col items-center justify-center text-center"
        style={{ pointerEvents: 'none' }}
      >
        <Sofa className="h-4 w-4 text-gray-400" />
        <div className="text-xs font-medium mt-1 text-gray-400">
          Weekend
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'desk-cell rounded-lg p-1 sm:p-2 min-h-[60px] sm:min-h-[80px] flex flex-col items-center justify-center text-center cursor-pointer select-none touch-manipulation',
        config.className,
        isWeekend && 'opacity-50 cursor-not-allowed',
        'hover:shadow-md active:scale-95 transition-all duration-150'
      )}
      onClick={(e) => !isWeekend && onClick(e)}
      onContextMenu={(e) => !isWeekend && onClick(e)}
      style={{ pointerEvents: isWeekend ? 'none' : 'auto' }}
    >
      <StatusIcon className={cn('h-4 w-4', config.iconColor)} />

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
              {currencySymbols[booking.currency || 'EUR']}{booking.price}
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
