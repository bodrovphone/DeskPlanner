import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WaitingListEntry } from '@shared/schema';
import { UserPlus, Plus } from 'lucide-react';

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<WaitingListEntry, 'id' | 'createdAt'>) => void;
}

export default function WaitingListModal({
  isOpen,
  onClose,
  onSave
}: WaitingListModalProps) {
  const [name, setName] = useState('');
  const [preferredDates, setPreferredDates] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedDates = preferredDates.trim();

    if (trimmedName && trimmedDates) {
      onSave({
        name: trimmedName,
        preferredDates: trimmedDates,
        contactInfo: contactInfo.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setName('');
      setPreferredDates('');
      setContactInfo('');
      setNotes('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Add to Waiting List
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter person's name"
              className="mt-1"
              maxLength={50}
            />
          </div>

          <div>
            <Label htmlFor="dates" className="text-sm font-medium text-gray-700">
              Preferred Dates *
            </Label>
            <Input
              id="dates"
              value={preferredDates}
              onChange={(e) => setPreferredDates(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Jan 15-20, Weekdays only, etc."
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter preferred dates or date ranges
            </p>
          </div>

          <div>
            <Label htmlFor="contact" className="text-sm font-medium text-gray-700">
              Contact Info
            </Label>
            <Input
              id="contact"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Phone or email (optional)"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !preferredDates.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
