import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FloorPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloorPlanModal({ isOpen, onClose }: FloorPlanModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] p-4">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-semibold">Coworking Space Floor Plan</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center overflow-auto" style={{ height: 'calc(90vh - 100px)' }}>
          <img
            src={import.meta.env.BASE_URL + 'plan.jpeg'}
            alt="Coworking Space Floor Plan"
            className="w-auto h-auto max-w-full max-h-full object-contain rounded-md shadow-lg"
            style={{ minWidth: '400px', minHeight: '300px' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}