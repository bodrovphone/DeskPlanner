import { useMemo, useState, useEffect, useRef } from 'react';
import { usePDF, PDFDownloadLink, Document, Page, Text } from '@react-pdf/renderer';
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
import { Loader2, FileText, Plus, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type {
  Client,
  Organization,
  InvoiceSellerSnapshot,
  InvoiceBuyerSnapshot,
  PaymentMethodType,
} from '@shared/schema';
import { useCreateInvoice } from '@/hooks/use-invoices';
import { PAYMENT_METHOD_LABEL, SELECT_NONE_VALUE, round2 } from '@/lib/invoices';
import { formatLocalDate } from '@/lib/dateUtils';
import { InvoicePDF } from './InvoicePDF';

interface InvoiceEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  organization: Organization;
}

interface EditorLine {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
}

function blankLine(defaultVatRate: number, currency: string): EditorLine {
  return {
    description: '',
    quantity: '1',
    unit: '',
    unitPrice: '0',
    vatRate: String(defaultVatRate),
  };
}

export default function InvoiceEditorDialog({
  isOpen,
  onClose,
  client,
  organization,
}: InvoiceEditorDialogProps) {
  const { toast } = useToast();
  const createInvoice = useCreateInvoice();

  const defaultVat = organization.defaultVatRate ?? 0;
  const currency = organization.currency;

  // Form state
  const [issueDate, setIssueDate] = useState(formatLocalDate(new Date()));
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<EditorLine[]>([blankLine(defaultVat, currency)]);
  const [invoiceVatRate, setInvoiceVatRate] = useState(String(defaultVat));
  const [notes, setNotes] = useState('');
  const [compiledBy, setCompiledBy] = useState(organization.billingCompiledBy ?? '');
  const [signedBy, setSignedBy] = useState(organization.billingMol ?? '');
  // Buyer block — editable per-invoice, snapshot only, does NOT mutate the member record.
  const [buyerName, setBuyerName] = useState(client?.name ?? '');
  const [buyerTaxId, setBuyerTaxId] = useState(client?.taxId ?? '');
  const [buyerVatId, setBuyerVatId] = useState(client?.vatId ?? '');
  const [buyerAddress, setBuyerAddress] = useState(client?.billingAddress ?? '');
  const [buyerRepresentative, setBuyerRepresentative] = useState(client?.representativeName ?? '');
  const [buyerPaymentMethod, setBuyerPaymentMethod] = useState<PaymentMethodType | ''>(client?.paymentMethodType ?? '');

  useEffect(() => {
    if (!isOpen) return;
    // Reset each time it opens
    setIssueDate(formatLocalDate(new Date()));
    setDueDate('');
    setLines([blankLine(defaultVat, currency)]);
    setInvoiceVatRate(String(defaultVat));
    setNotes('');
    setCompiledBy(organization.billingCompiledBy ?? '');
    setSignedBy(organization.billingMol ?? '');
    setBuyerName(client?.name ?? '');
    setBuyerTaxId(client?.taxId ?? '');
    setBuyerVatId(client?.vatId ?? '');
    setBuyerAddress(client?.billingAddress ?? '');
    setBuyerRepresentative(client?.representativeName ?? '');
    setBuyerPaymentMethod(client?.paymentMethodType ?? '');
  }, [
    isOpen,
    organization.id,
    defaultVat,
    currency,
    organization.billingCompiledBy,
    organization.billingMol,
    client?.id,
    client?.name,
    client?.taxId,
    client?.vatId,
    client?.billingAddress,
    client?.representativeName,
    client?.paymentMethodType,
  ]);

  const sellerSnapshot: InvoiceSellerSnapshot = useMemo(() => ({
    legalName: organization.billingLegalName ?? null,
    taxId: organization.billingTaxId ?? null,
    vatId: organization.billingVatId ?? null,
    address: organization.billingAddress ?? null,
    mol: signedBy || null,
    bankDetails: organization.billingBankDetails ?? null,
  }), [organization, signedBy]);

  const buyerSnapshot: InvoiceBuyerSnapshot | null = useMemo(() => {
    if (!client) return null;
    return {
      name: buyerName.trim() || client.name,
      email: client.email ?? null,
      phone: client.phone ?? null,
      billingAddress: buyerAddress.trim() ? buyerAddress.trim() : null,
      taxId: buyerTaxId.trim() ? buyerTaxId.trim() : null,
      vatId: buyerVatId.trim() ? buyerVatId.trim() : null,
      representativeName: buyerRepresentative.trim() ? buyerRepresentative.trim() : null,
      paymentMethodType: (buyerPaymentMethod || null) as PaymentMethodType | null,
    };
  }, [client, buyerName, buyerAddress, buyerTaxId, buyerVatId, buyerRepresentative, buyerPaymentMethod]);

  const previewLines = useMemo(() => lines.map(l => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unitPrice) || 0;
    return {
      description: l.description || '(no description)',
      quantity: qty,
      unit: l.unit || null,
      unitPrice: round2(price),
      lineTotal: round2(qty * price),
    };
  }), [lines]);

  const subtotal = useMemo(
    () => round2(previewLines.reduce((s, l) => s + l.lineTotal, 0)),
    [previewLines],
  );
  const invoiceVatNum = Number(invoiceVatRate) || 0;
  const vatAmount = round2(subtotal * (invoiceVatNum / 100));
  const total = round2(subtotal + vatAmount);

  // Render PDF only when there is enough to display (prevents blank flashes)
  const previewInvoiceNumber = String(organization.invoiceNumberNext).padStart(
    organization.invoiceNumberPadding,
    '0',
  );

  const paymentMethodLabel = buyerSnapshot?.paymentMethodType
    ? PAYMENT_METHOD_LABEL[buyerSnapshot.paymentMethodType]
    : null;

  const hasValidLine = lines.some(
    l => l.description.trim() && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0,
  );

  const cantSaveReason: string | null = !client
    ? 'No member selected.'
    : !issueDate
      ? 'Set an issue date.'
      : !hasValidLine
        ? 'Add at least one line with a description and qty > 0.'
        : null;

  const canSave = !cantSaveReason && !createInvoice.isPending;

  const updateLine = (idx: number, patch: Partial<EditorLine>) => {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const addLine = () =>
    setLines(prev => [...prev, blankLine(defaultVat, currency)]);
  const removeLine = (idx: number) =>
    setLines(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const persist = async (): Promise<boolean> => {
    if (!client || !buyerSnapshot) return false;
    try {
      await createInvoice.mutateAsync({
        organizationId: organization.id,
        clientId: client.id,
        issueDate,
        dueDate: dueDate.trim() ? dueDate : null,
        currency,
        vatRate: invoiceVatNum,
        notes: notes.trim() ? notes.trim() : null,
        compiledBy: compiledBy.trim() ? compiledBy.trim() : null,
        signedBy: signedBy.trim() ? signedBy.trim() : null,
        sellerSnapshot,
        buyerSnapshot,
        lineItems: lines
          .filter(l => l.description.trim() && Number(l.quantity) > 0)
          .map(l => ({
            description: l.description.trim(),
            quantity: Number(l.quantity),
            unit: l.unit.trim() ? l.unit.trim() : null,
            unitPrice: Number(l.unitPrice) || 0,
            vatRate: Number(l.vatRate) || 0,
            bookingId: null,
          })),
      });
      return true;
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save invoice.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleSaveDraft = async () => {
    const ok = await persist();
    if (ok) {
      toast({ title: 'Invoice saved', description: `Draft ${previewInvoiceNumber} created.`, duration: 1800 });
      onClose();
    }
  };

  const pdfProps = useMemo(() => (
    buyerSnapshot
      ? {
          logoUrl: organization.logoUrl ?? null,
          invoiceNumber: previewInvoiceNumber,
          issueDate,
          dueDate: dueDate || null,
          seller: sellerSnapshot,
          buyer: buyerSnapshot,
          lineItems: previewLines,
          subtotal,
          vatRate: invoiceVatNum,
          vatAmount,
          total,
          currency,
          notes: notes || null,
          compiledBy: compiledBy || null,
          signedBy: signedBy || null,
          paymentMethodLabel,
          bankDetails: organization.billingBankDetails ?? null,
        }
      : null
  ), [
    buyerSnapshot,
    organization.logoUrl,
    organization.billingBankDetails,
    previewInvoiceNumber,
    issueDate,
    dueDate,
    sellerSnapshot,
    previewLines,
    subtotal,
    invoiceVatNum,
    vatAmount,
    total,
    currency,
    notes,
    compiledBy,
    signedBy,
    paymentMethodLabel,
  ]);

  // React-PDF's PDFViewer re-renders the PDF on every child prop change, which
  // is expensive. Debounce the preview snapshot so the form stays responsive
  // while the PDF lags behind until the user stops typing.
  const [debouncedPdfProps, setDebouncedPdfProps] = useState(pdfProps);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedPdfProps(pdfProps), 1000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [pdfProps]);

  // Use usePDF + a custom iframe with a #view=Fit URL fragment so the preview
  // scales the PDF to fit the viewport (no internal scrollbar). PDFViewer
  // defaults to fit-width which shows A4 at full width and overflows vertically.
  const previewDocument = useMemo(
    () => (
      debouncedPdfProps
        ? <InvoicePDF {...debouncedPdfProps} />
        : <Document><Page size="A4"><Text /></Page></Document>
    ),
    [debouncedPdfProps],
  );
  const [pdfInstance, updatePdfInstance] = usePDF({ document: previewDocument });
  useEffect(() => {
    updatePdfInstance(previewDocument);
  }, [previewDocument, updatePdfInstance]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            New invoice
          </DialogTitle>
          <DialogDescription>
            {client?.name ? `For ${client.name}.` : ''} Number will be{' '}
            <span className="font-mono text-gray-700">{previewInvoiceNumber}</span> on save.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Form */}
          <div className="overflow-y-auto px-2 py-1 space-y-4">
            <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                  Bill to
                </Label>
                <span className="text-[10px] text-gray-400">
                  Applies to this invoice only
                </span>
              </div>
              <div>
                <Label htmlFor="buyerName" className="text-xs text-gray-600">Company legal name</Label>
                <Input
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Acme Coworking Ltd."
                  className="border-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="buyerTaxId" className="text-xs text-gray-600">Tax / company ID</Label>
                  <Input
                    id="buyerTaxId"
                    value={buyerTaxId}
                    onChange={(e) => setBuyerTaxId(e.target.value)}
                    placeholder="123456789"
                    className="border-gray-300"
                  />
                </div>
                <div>
                  <Label htmlFor="buyerVatId" className="text-xs text-gray-600">VAT ID <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    id="buyerVatId"
                    value={buyerVatId}
                    onChange={(e) => setBuyerVatId(e.target.value)}
                    placeholder="VAT0000000"
                    className="border-gray-300"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="buyerAddress" className="text-xs text-gray-600">Billing address</Label>
                <Textarea
                  id="buyerAddress"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder={'123 Main Street\nCity, Country'}
                  rows={2}
                  className="border-gray-300"
                />
              </div>
              <div>
                <Label htmlFor="buyerRepresentative" className="text-xs text-gray-600">Attn <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="buyerRepresentative"
                  value={buyerRepresentative}
                  onChange={(e) => setBuyerRepresentative(e.target.value)}
                  placeholder="Full name of contact person"
                  className="border-gray-300"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Prefilled from the member profile. Edits here stay on this invoice — save the
                member's company details in their profile to avoid re-typing.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50">
              <Label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Dates
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="issueDate" className="text-xs text-gray-600">Issue date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate" className="text-xs text-gray-600">Due date <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                  Line items
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" /> Add line
                </Button>
              </div>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_60px_60px_80px_90px_32px] gap-1.5 px-1 text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                <div>Description</div>
                <div className="text-right">Qty</div>
                <div>Unit</div>
                <div className="text-right">Price</div>
                <div className="text-right">Total</div>
                <div />
              </div>
              <div className="space-y-2">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_60px_60px_80px_90px_32px] gap-1.5 items-start">
                      <Input
                        placeholder="Description"
                        value={l.description}
                        onChange={(e) => updateLine(idx, { description: e.target.value })}
                        className="border-gray-300 bg-white"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Qty"
                        value={l.quantity}
                        onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                        className="text-right border-gray-300 bg-white"
                      />
                      <Input
                        placeholder="Unit"
                        value={l.unit}
                        onChange={(e) => updateLine(idx, { unit: e.target.value })}
                        className="border-gray-300 bg-white"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Price"
                        value={l.unitPrice}
                        onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                        className="text-right border-gray-300 bg-white"
                      />
                      <div
                        className="h-10 flex items-center justify-end px-3 rounded-md border border-dashed border-gray-300 bg-white text-sm font-mono text-gray-700 tabular-nums"
                        aria-label="Line total"
                      >
                        {previewLines[idx].lineTotal.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent h-10 flex items-center"
                        title="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                ))}
              </div>
              {/* Totals footer */}
              <div className="pt-3 mt-2 border-t border-gray-200 grid grid-cols-[120px_1fr] gap-4 items-end">
                <div>
                  <Label htmlFor="invoiceVatRate" className="text-xs text-gray-600">VAT rate %</Label>
                  <Input
                    id="invoiceVatRate"
                    type="number"
                    min={0}
                    max={100}
                    step="1"
                    value={invoiceVatRate}
                    onChange={(e) => setInvoiceVatRate(e.target.value)}
                    className="border-gray-300 bg-white"
                  />
                </div>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-mono tabular-nums">{subtotal.toFixed(2)} {currency}</span></div>
                  <div className="flex justify-between"><span>VAT ({invoiceVatNum}%)</span><span className="font-mono tabular-nums">{vatAmount.toFixed(2)} {currency}</span></div>
                  <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-300 pt-1 mt-1"><span>Total</span><span className="font-mono tabular-nums">{total.toFixed(2)} {currency}</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50">
              <Label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Payment
              </Label>
              <div>
                <Label htmlFor="buyerPaymentMethod" className="text-xs text-gray-600">Method</Label>
                <Select
                  value={buyerPaymentMethod || SELECT_NONE_VALUE}
                  onValueChange={(v) => setBuyerPaymentMethod(v === SELECT_NONE_VALUE ? '' : (v as PaymentMethodType))}
                >
                  <SelectTrigger id="buyerPaymentMethod" className="border-gray-300 bg-white">
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
              {organization.billingBankDetails ? (
                <p className="text-[11px] text-gray-500">
                  Bank details from Organization → Billing are included automatically on the PDF footer.
                </p>
              ) : (
                <p className="text-[11px] text-gray-500">
                  Tip: add bank details in Settings → Organization → Billing so they appear on every invoice.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50">
              <Label htmlFor="invoiceNotes" className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Notes <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
              </Label>
              <Textarea
                id="invoiceNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thank-you message, payment terms, reference number..."
                rows={2}
                className="border-gray-300 bg-white"
              />
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50">
              <Label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Signatures
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="signedBy" className="text-xs text-gray-600">Signed by</Label>
                  <Input
                    id="signedBy"
                    value={signedBy}
                    onChange={(e) => setSignedBy(e.target.value)}
                    placeholder="Full name"
                    className="border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="compiledBy" className="text-xs text-gray-600">Compiled by</Label>
                  <Input
                    id="compiledBy"
                    value={compiledBy}
                    onChange={(e) => setCompiledBy(e.target.value)}
                    placeholder="Accountant's name"
                    className="border-gray-300 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="hidden lg:flex flex-col bg-gray-50 rounded-lg border overflow-hidden">
            {debouncedPdfProps && pdfInstance.url ? (
              <iframe
                title="Invoice preview"
                src={`${pdfInstance.url}#view=Fit&toolbar=0&navpanes=0&scrollbar=0&statusbar=0`}
                className="flex-1 w-full"
                style={{ border: 'none', minHeight: 480 }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-6 text-center">
                {debouncedPdfProps ? 'Generating preview…' : 'Pick a member to generate an invoice preview.'}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-4 pt-4 border-t">
          <div>
            {debouncedPdfProps ? (
              <PDFDownloadLink
                document={<InvoicePDF {...debouncedPdfProps} />}
                fileName={`Invoice-${previewInvoiceNumber}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" disabled={loading || !hasValidLine} type="button">
                    <Download className="mr-2 h-4 w-4" />
                    {loading ? 'Preparing...' : 'Download preview'}
                  </Button>
                )}
              </PDFDownloadLink>
            ) : null}
          </div>
          <div className="flex items-center gap-3 justify-end">
            {cantSaveReason ? (
              <span className="text-xs text-amber-600">{cantSaveReason}</span>
            ) : null}
            <Button variant="outline" onClick={onClose} disabled={createInvoice.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraft}
              disabled={!canSave}
              title={cantSaveReason ?? ''}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save draft'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
