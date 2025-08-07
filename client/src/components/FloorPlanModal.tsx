import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FloorPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloorPlanModal({ isOpen, onClose }: FloorPlanModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-semibold">Coworking Space Floor Plan</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <img
            src="/plan.jpeg"
            alt="Coworking Space Floor Plan"
            className="max-w-full max-h-full object-contain rounded-md shadow-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}