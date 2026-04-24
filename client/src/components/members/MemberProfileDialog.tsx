import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Client, PaymentMethodType } from '@shared/schema';
import { Loader2, UserCog } from 'lucide-react';

interface MemberProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (patch: { billingAddress: string | null; paymentMethodType: PaymentMethodType | null }) => Promise<void>;
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethodType, string> = {
  credit_card: 'Credit card',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
};

const NONE_VALUE = '__none__';

export default function MemberProfileDialog({
  isOpen,
  onClose,
  client,
  onSave,
}: MemberProfileDialogProps) {
  const [billingAddress, setBillingAddress] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && client) {
      setBillingAddress(client.billingAddress ?? '');
      setPaymentMethodType(client.paymentMethodType ?? '');
    }
  }, [isOpen, client]);

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    try {
      await onSave({
        billingAddress: billingAddress.trim() ? billingAddress.trim() : null,
        paymentMethodType: paymentMethodType || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-600" />
            Billing details
          </DialogTitle>
          <DialogDescription>
            {client?.name ? `For ${client.name}.` : ''} Used for invoicing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="billingAddress" className="text-sm font-medium text-gray-700">
              Billing address
            </Label>
            <Textarea
              id="billingAddress"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Company name, VAT ID, street, city, postal code, country..."
              className="mt-1 min-h-[96px]"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">
              Payment method
            </Label>
            <Select
              value={paymentMethodType || NONE_VALUE}
              onValueChange={(v) => setPaymentMethodType(v === NONE_VALUE ? '' : (v as PaymentMethodType))}
            >
              <SelectTrigger id="paymentMethod" className="mt-1">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Not set</SelectItem>
                {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethodType[]).map((pm) => (
                  <SelectItem key={pm} value={pm}>
                    {PAYMENT_METHOD_LABEL[pm]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { PAYMENT_METHOD_LABEL };
