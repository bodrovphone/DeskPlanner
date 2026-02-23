import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeskBooking } from '@shared/schema';
import { DEFAULT_DESKS as DESKS } from '@/lib/deskConfig';
import { User } from 'lucide-react';

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: DeskBooking | null;
  deskId: string;
  date: string;
  onSave: (personName: string) => void;
}

export default function PersonModal({
  isOpen,
  onClose,
  booking,
  deskId,
  date,
  onSave
}: PersonModalProps) {
  const [personName, setPersonName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPersonName(booking?.personName || '');
    }
  }, [isOpen, booking]);

  const handleSave = () => {
    if (personName.trim()) {
      onSave(personName.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Assign Person to Desk
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Desk Information</Label>
            <p className="text-sm text-gray-600 mt-1">
              {desk?.label} - {formattedDate}
            </p>
          </div>

          <div>
            <Label htmlFor="personName" className="text-sm font-medium text-gray-700">
              Person Name
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
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!personName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
