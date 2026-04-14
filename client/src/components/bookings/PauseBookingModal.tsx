import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeskBooking, Currency } from '@shared/schema';
import { currencySymbols } from '@/lib/settings';
import { calculatePauseSegments, PauseSegment } from '@/hooks/use-pause-booking';
import { AlertCircle, Loader2, PauseCircle, ArrowRight } from 'lucide-react';

interface PauseBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: DeskBooking;
  currency: Currency;
  onConfirm: (pauseStart: string, pauseEnd: string) => Promise<void>;
}

export default function PauseBookingModal({
  isOpen,
  onClose,
  booking,
  currency,
  onConfirm,
}: PauseBookingModalProps) {
  const [pauseStart, setPauseStart] = useState('');
  const [pauseEnd, setPauseEnd] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPauseStart('');
      setPauseEnd('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const symbol = currencySymbols[currency];
  const originalPrice = booking.price ?? 0;

  // Constrain pause dates: must be within booking range
  const minPauseDate = booking.startDate;
  const maxPauseDate = booking.endDate;

  const segments = useMemo<PauseSegment[]>(() => {
    if (!pauseStart || !pauseEnd || pauseStart > pauseEnd) return [];
    if (pauseStart < booking.startDate || pauseEnd > booking.endDate) return [];
    return calculatePauseSegments(
      booking.startDate,
      booking.endDate,
      pauseStart,
      pauseEnd,
      originalPrice,
    );
  }, [pauseStart, pauseEnd, booking.startDate, booking.endDate, originalPrice]);

  const isValid = pauseStart && pauseEnd &&
    pauseStart <= pauseEnd &&
    pauseStart >= booking.startDate &&
    pauseEnd <= booking.endDate &&
    segments.length > 0;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleConfirm = async () => {
    if (!isValid) return;
    try {
      setIsLoading(true);
      setError('');
      await onConfirm(pauseStart, pauseEnd);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to pause booking');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-amber-600" />
            Pause & Extend Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-900">{booking.personName}</p>
            <p className="text-blue-700">
              {formatDate(booking.startDate)} - {formatDate(booking.endDate)} &middot; {symbol}{originalPrice}
            </p>
          </div>

          {/* Pause date inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pauseStart" className="text-sm font-medium text-gray-700">
                Pause from
              </Label>
              <Input
                id="pauseStart"
                type="date"
                value={pauseStart}
                onChange={(e) => {
                  setPauseStart(e.target.value);
                  setError('');
                }}
                min={minPauseDate}
                max={maxPauseDate}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pauseEnd" className="text-sm font-medium text-gray-700">
                Pause until
              </Label>
              <Input
                id="pauseEnd"
                type="date"
                value={pauseEnd}
                onChange={(e) => {
                  setPauseEnd(e.target.value);
                  setError('');
                }}
                min={pauseStart || minPauseDate}
                max={maxPauseDate}
                className="mt-1"
              />
            </div>
          </div>

          {/* Segment preview */}
          {segments.length > 0 && (
            <div className="border rounded-lg divide-y">
              <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Resulting Segments
              </div>
              {segments.map((seg, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className={`font-medium ${seg.type === 'extension' ? 'text-green-700' : 'text-gray-900'}`}>
                      {seg.label}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {formatDate(seg.startDate)} <ArrowRight className="inline h-3 w-3" /> {formatDate(seg.endDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 text-xs mr-2">{seg.days}d</span>
                    <span className={`font-medium ${seg.price === 0 ? 'text-green-600' : ''}`}>
                      {symbol}{seg.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="px-3 py-2 bg-gray-50 flex justify-between text-sm font-medium">
                <span>Total revenue</span>
                <span>{symbol}{segments.reduce((s, seg) => s + seg.price, 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PauseCircle className="h-4 w-4 mr-2" />
                Pause & Extend
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
