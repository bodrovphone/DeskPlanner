import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeskBooking } from '@shared/schema';
import { useShareBooking } from '@/hooks/use-share-booking';
import { Share2, Copy, Check, Loader2 } from 'lucide-react';
import telegramIcon from '@/assets/telegram.svg';
import whatsappIcon from '@/assets/whatsapp.svg';
import viberIcon from '@/assets/viber.svg';


interface ShareBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: DeskBooking;
  deskLabel: string;
  spaceName: string;
  roomName: string;
}

export default function ShareBookingModal({
  isOpen,
  onClose,
  booking,
  deskLabel,
  spaceName,
  roomName,
}: ShareBookingModalProps) {
  const { shareToken, isLoading, generateShareLink, getShareUrl } = useShareBooking();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !shareToken) {
      generateShareLink(booking.id);
    }
  }, [isOpen, booking.id]);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const shareUrl = shareToken ? getShareUrl(shareToken) : '';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const shareText = `Your desk is confirmed at ${spaceName}! ${roomName} / ${deskLabel}, ${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
  };

  const openViber = () => {
    window.open(`viber://forward?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            Share Booking
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-500">Generating share link...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium">{spaceName}</p>
              <p>{roomName} / {deskLabel}</p>
              <p>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="text-sm bg-gray-50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={openTelegram}
                className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-blue-50 hover:border-blue-300"
              >
                <img src={telegramIcon} alt="Telegram" className="h-5 w-5" />
                <span className="text-xs">Telegram</span>
              </Button>
              <Button
                variant="outline"
                onClick={openWhatsApp}
                className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-green-50 hover:border-green-300"
              >
                <img src={whatsappIcon} alt="WhatsApp" className="h-5 w-5" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                onClick={openViber}
                className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-purple-50 hover:border-purple-300"
              >
                <img src={viberIcon} alt="Viber" className="h-5 w-5" />
                <span className="text-xs">Viber</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
