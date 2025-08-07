import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DeskStatus } from '@shared/schema';
import { DESKS } from '@/lib/localStorage';
import { formatDateRange } from '@/lib/dateUtils';
import dayjs from 'dayjs';

interface AvailabilityRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startDate: string, endDate: string, deskIds: string[], status: DeskStatus) => void;
}

export default function AvailabilityRangeModal({
  isOpen,
  onClose,
  onApply
}: AvailabilityRangeModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDeskIds, setSelectedDeskIds] = useState<string[]>([]);
  const [status, setStatus] = useState<DeskStatus>('available');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      const today = dayjs().format('YYYY-MM-DD');
      const nextWeek = dayjs().add(7, 'day').format('YYYY-MM-DD');
      setStartDate(today);
      setEndDate(nextWeek);
      setSelectedDeskIds([]);
      setStatus('available');
    }
  }, [isOpen]);

  const handleDeskToggle = (deskId: string, checked: boolean) => {
    setSelectedDeskIds(prev => 
      checked 
        ? [...prev, deskId]
        : prev.filter(id => id !== deskId)
    );
  };

  const handleSelectAllDesks = () => {
    if (selectedDeskIds.length === DESKS.length) {
      setSelectedDeskIds([]);
    } else {
      setSelectedDeskIds(DESKS.map(desk => desk.id));
    }
  };

  const handleApply = () => {
    if (!startDate || !endDate || selectedDeskIds.length === 0) {
      return;
    }

    if (dayjs(startDate).isAfter(dayjs(endDate))) {
      return;
    }

    onApply(startDate, endDate, selectedDeskIds, status);
    onClose();
  };

  const isValidForm = startDate && endDate && selectedDeskIds.length > 0 && 
                     (dayjs(startDate).isSame(dayjs(endDate)) || dayjs(startDate).isBefore(dayjs(endDate)));

  const dateRangeText = startDate && endDate ? formatDateRange(startDate, endDate) : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-icon text-blue-600">date_range</span>
            Set Desk Availability Range
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="mt-1"
              />
            </div>
          </div>

          {dateRangeText && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Date Range:</strong> {dateRangeText}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">
                Select Desks ({selectedDeskIds.length} of {DESKS.length} selected)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllDesks}
              >
                {selectedDeskIds.length === DESKS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
              {DESKS.map((desk) => (
                <label
                  key={desk.id}
                  className="flex items-center p-2 rounded border hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedDeskIds.includes(desk.id)}
                    onCheckedChange={(checked) => handleDeskToggle(desk.id, !!checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">{desk.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Status
            </Label>
            <Select value={status} onValueChange={(value) => setStatus(value as DeskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            disabled={!isValidForm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
