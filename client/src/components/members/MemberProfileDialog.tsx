import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PAYMENT_METHOD_LABEL, SELECT_NONE_VALUE } from '@/lib/invoices';

interface MemberProfileSavePatch {
  billingAddress: string | null;
  paymentMethodType: PaymentMethodType | null;
  representativeName: string | null;
  taxId: string | null;
  vatId: string | null;
}

interface MemberProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (patch: MemberProfileSavePatch) => Promise<void>;
}

export default function MemberProfileDialog({
  isOpen,
  onClose,
  client,
  onSave,
}: MemberProfileDialogProps) {
  const [billingAddress, setBillingAddress] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState<PaymentMethodType | ''>('');
  const [taxId, setTaxId] = useState('');
  const [vatId, setVatId] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && client) {
      setBillingAddress(client.billingAddress ?? '');
      setPaymentMethodType(client.paymentMethodType ?? '');
      setTaxId(client.taxId ?? '');
      setVatId(client.vatId ?? '');
      setRepresentativeName(client.representativeName ?? '');
    }
  }, [isOpen, client]);

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    try {
      await onSave({
        billingAddress: billingAddress.trim() ? billingAddress.trim() : null,
        paymentMethodType: paymentMethodType || null,
        representativeName: representativeName.trim() ? representativeName.trim() : null,
        taxId: taxId.trim() ? taxId.trim() : null,
        vatId: vatId.trim() ? vatId.trim() : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-600" />
            Billing details
          </DialogTitle>
          <DialogDescription>
            {client?.name ? `For ${client.name}.` : ''} Prefills every invoice for this member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto px-1 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="taxId" className="text-sm font-medium text-gray-700">
                Tax / company ID
              </Label>
              <Input
                id="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="123456789"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vatId" className="text-sm font-medium text-gray-700">
                VAT ID <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="vatId"
                value={vatId}
                onChange={(e) => setVatId(e.target.value)}
                placeholder="VAT0000000"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="billingAddress" className="text-sm font-medium text-gray-700">
              Billing address
            </Label>
            <Textarea
              id="billingAddress"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder={'123 Main Street\nCity, Country'}
              className="mt-1 min-h-[80px]"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="representativeName" className="text-sm font-medium text-gray-700">
              Attn / contact person <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="representativeName"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="Full name of contact person"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">
              Payment method
            </Label>
            <Select
              value={paymentMethodType || SELECT_NONE_VALUE}
              onValueChange={(v) => setPaymentMethodType(v === SELECT_NONE_VALUE ? '' : (v as PaymentMethodType))}
            >
              <SelectTrigger id="paymentMethod" className="mt-1">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE_VALUE}>Not set</SelectItem>
                {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethodType[]).map((pm) => (
                  <SelectItem key={pm} value={pm}>
                    {PAYMENT_METHOD_LABEL[pm]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
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

