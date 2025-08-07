import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeskBooking } from '@shared/schema';
import { DESKS } from '@/lib/localStorage';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: DeskBooking | null;
  deskId: string;
  date: string;
  onSave: (bookingData: {
    personName: string;
    title: string;
    price: number;
  }) => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  booking,
  deskId,
  date,
  onSave
}: BookingModalProps) {
  const [personName, setPersonName] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPersonName(booking?.personName || '');
      setTitle(booking?.title || '');
      setPrice(booking?.price?.toString() || '25');
    }
  }, [isOpen, booking]);

  const handleSave = () => {
    const trimmedName = personName.trim();
    const trimmedTitle = title.trim();
    const parsedPrice = parseFloat(price);
    
    if (trimmedName && trimmedTitle && parsedPrice >= 0) {
      onSave({
        personName: trimmedName,
        title: trimmedTitle,
        price: parsedPrice
      });
      onClose();
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
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isValidForm = personName.trim() && title.trim() && 
                     price.trim() && !isNaN(parseFloat(price)) && parseFloat(price) >= 0;

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
          
          <div>
            <Label htmlFor="personName" className="text-sm font-medium text-gray-700">
              Person Name *
            </Label>
            <Input
              id="personName"
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter person's name"
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Booking Title/Purpose *
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
            <Label htmlFor="price" className="text-sm font-medium text-gray-700">
              Daily Rate ($) *
            </Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="25.00"
              min="0"
              step="0.01"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the daily rate for this desk booking
            </p>
          </div>
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