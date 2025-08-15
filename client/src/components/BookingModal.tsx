import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeskBooking, DeskStatus, Currency } from '@shared/schema';
import { DESKS } from '@/lib/localStorage';
import { currencySymbols } from '@/lib/settings';

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
}

export default function BookingModal({
  isOpen,
  onClose,
  booking,
  deskId,
  date,
  currency,
  onSave
}: BookingModalProps) {
  const [personName, setPersonName] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<DeskStatus>('assigned');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [conflictError, setConflictError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPersonName(booking?.personName || '');
      setTitle(booking?.title || '');
      setPrice(booking?.price?.toString() || '15');
      setStatus(booking?.status || 'assigned');
      setStartDate(booking?.startDate || date);
      setEndDate(booking?.endDate || date);
      setConflictError('');
    }
  }, [isOpen, booking, date]);

  const handleSave = async () => {
    const trimmedName = personName.trim();
    const trimmedTitle = title.trim();
    const parsedPrice = parseFloat(price);
    
    if (trimmedName && parsedPrice >= 0 && startDate && endDate) {
      try {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-icon text-blue-600">event_seat</span>
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
            <Select value={status} onValueChange={(value: DeskStatus) => setStatus(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booked">
                  <div className="flex items-center gap-2">
                    <span className="material-icon text-orange-600 text-sm">event_busy</span>
                    <div>
                      <div className="font-medium">Booked</div>
                      <div className="text-xs text-gray-500">Reserved but not paid</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="assigned">
                  <div className="flex items-center gap-2">
                    <span className="material-icon text-blue-600 text-sm">person</span>
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
                placeholder="15.00"
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
                <span className="material-icon text-red-500 text-lg mr-2 mt-0.5">error</span>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Booking Conflict</h4>
                  <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{conflictError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isValidForm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <span className="material-icon text-sm mr-2">check</span>
            Book Desk
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          Tip: Press Ctrl+Enter to save quickly
        </div>
      </DialogContent>
    </Dialog>
  );
}