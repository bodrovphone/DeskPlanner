import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeskBooking, DeskStatus, Currency } from '@shared/schema';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DEFAULT_DESKS as DESKS } from '@/lib/deskConfig';
import { currencySymbols } from '@/lib/settings';
import { Armchair, CalendarX, User, AlertCircle, Loader2, Check, Trash2, X } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: DeskBooking | null;
  deskId: string;
  date: string;
  currency: Currency;
  onSave: (bookingData: {
    personName: string;
    title: string;
    price: number;
    status: DeskStatus;
    startDate: string;
    endDate: string;
    currency: Currency;
  }) => Promise<void>;
  onDiscard?: () => Promise<void>;
}

export default function BookingModal({
  isOpen,
  onClose,
  booking,
  deskId,
  date,
  currency,
  onSave,
  onDiscard,
}: BookingModalProps) {
  const { currentOrg } = useOrganization();
  const defaultPrice = currentOrg?.defaultPricePerDay ?? 8;
  const [personName, setPersonName] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<DeskStatus>('assigned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [conflictError, setConflictError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPersonName(booking?.personName || '');
      setTitle(booking?.title || '');
      setPrice(booking?.price?.toString() || String(defaultPrice));
      setStatus(booking?.status || 'assigned');

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
    }
  }, [isOpen, booking, date]);

  const handleSave = async () => {
    const trimmedName = personName.trim();
    const trimmedTitle = title.trim();
    const parsedPrice = parseFloat(price);

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
          currency: currency
        });
        onClose();
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
    try {
      setIsDiscarding(true);
      await onDiscard();
      onClose();
    } catch (error) {
      setConflictError('Failed to discard booking.');
    } finally {
      setIsDiscarding(false);
    }
  };

  const isExistingBooking = booking && booking.status !== 'available';

  const desk = DESKS.find(d => d.id === deskId);

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
                     startDate && endDate && startDate <= endDate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
              {desk?.label} - {formattedDate}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                Start Date *
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                End Date *
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="personName" className="text-sm font-medium text-gray-700">
              Name *
            </Label>
            <Input
              id="personName"
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value.slice(0, 20))}
              onKeyDown={handleKeyDown}
              placeholder="Enter name"
              maxLength={20}
              className="mt-1"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              {personName.length}/20 characters
            </p>
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
            <Label htmlFor="status" className="text-sm font-medium text-gray-700">
              Booking Status *
            </Label>
            <Select value={status} onValueChange={(value: DeskStatus) => {
              setStatus(value);
              if (value === 'booked') setPrice('0');
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booked">
                  <div className="flex items-center gap-2">
                    <CalendarX className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="font-medium">Booked</div>
                      <div className="text-xs text-gray-500">Reserved but not paid</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="assigned">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Assigned (Paid)</div>
                      <div className="text-xs text-gray-500">Paid and confirmed</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Choose "Booked" for reservations or "Assigned" for paid bookings
            </p>
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

        <div className="flex gap-3 mt-6">
          {isExistingBooking && onDiscard && (
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={isDiscarding || isLoading}
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {isDiscarding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Discarding...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Discard
                </>
              )}
            </Button>
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
    </Dialog>
  );
}
