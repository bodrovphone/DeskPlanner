import { DeskBooking, DeskStatus } from '@shared/schema';
import { currencySymbols } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { CheckCircle, CalendarX, User, Sofa } from 'lucide-react';

interface DeskCellProps {
  deskId: string;
  date: string;
  booking: DeskBooking | null;
  onClick: (event?: React.MouseEvent) => void;
  isNonWorkingDay?: boolean;
  /** @deprecated Use isNonWorkingDay instead */
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

export default function DeskCell({ booking, date, onClick, isNonWorkingDay, isWeekend }: DeskCellProps) {
  const nonWorking = isNonWorkingDay ?? isWeekend ?? false;
  const rawStatus = booking?.status || 'available';
  // Handle legacy 'unavailable' status by converting to 'available'
  const status: DeskStatus = (rawStatus as any) === 'unavailable' ? 'available' : rawStatus as DeskStatus;
  const config = statusConfig[status] || statusConfig.available;
  const isBooked = status === 'booked' && booking?.personName;
  const isAssigned = status === 'assigned' && booking?.personName;
  const hasBooking = isBooked || isAssigned;
  const StatusIcon = config.Icon;

  // Calculate days until booking ends (for expiring-soon corner indicator)
  let daysUntilEnd: number | null = null;
  if (hasBooking && booking?.endDate && date) {
    const cellDate = new Date(date + 'T00:00:00');
    const endDate = new Date(booking.endDate + 'T00:00:00');
    const diff = Math.round((endDate.getTime() - cellDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 2) {
      daysUntilEnd = diff;
    }
  }

  // For non-working days with no booking, show day off indicator
  if (nonWorking && !hasBooking) {
    return (
      <div
        className="desk-cell rounded-lg p-1 sm:p-2 min-h-[52px] sm:min-h-[80px] bg-gray-100 cursor-not-allowed flex flex-col items-center justify-center text-center"
        style={{ pointerEvents: 'none' }}
      >
        <Sofa className="h-4 w-4 text-gray-400" />
        <div className="text-xs font-medium mt-1 text-gray-400">
          Day off
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'desk-cell rounded-lg p-1 sm:p-2 min-h-[52px] sm:min-h-[80px] flex flex-col items-center justify-center text-center cursor-pointer select-none touch-manipulation relative overflow-hidden',
        config.className,
        nonWorking && 'opacity-50 cursor-not-allowed',
        'hover:shadow-md active:scale-95 transition-all duration-150'
      )}
      onClick={(e) => !nonWorking && onClick(e)}
      onContextMenu={(e) => !nonWorking && onClick(e)}
      style={{ pointerEvents: nonWorking ? 'none' : 'auto' }}
    >
      {booking?.isFlex ? (
        <div
          className="absolute top-0 right-0 w-0 h-0 pointer-events-none"
          style={{
            borderLeft: '16px solid transparent',
            borderTop: '16px solid #f59e0b',
          }}
          title="Flex plan booking"
        />
      ) : daysUntilEnd !== null ? (
        <div
          className="absolute top-0 right-0 w-0 h-0 pointer-events-none"
          style={{
            borderLeft: '16px solid transparent',
            borderTop: `16px solid ${
              daysUntilEnd === 0 ? '#ef4444' : daysUntilEnd === 1 ? '#f87171' : '#fca5a5'
            }`,
          }}
          title={daysUntilEnd === 0 ? 'Ends today' : daysUntilEnd === 1 ? 'Ends tomorrow' : `Ends in ${daysUntilEnd} days`}
        />
      ) : null}
      {booking?.paymentStatus === 'paid' && (
        <div
          className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
          style={{
            borderRight: '16px solid transparent',
            borderTop: '16px solid #635BFF',
          }}
          title="Paid via Stripe"
        />
      )}
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
