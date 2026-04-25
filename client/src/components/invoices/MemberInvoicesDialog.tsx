import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, Loader2, Download, Plus, MoreVertical, Send, CheckCircle2, Ban } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import { pdf } from '@react-pdf/renderer';
import type { Client, Organization, Invoice, InvoiceStatus, PaymentMethodType } from '@shared/schema';
import {
  useClientInvoices,
  useSendInvoice,
  useMarkInvoicePaid,
  useVoidInvoice,
} from '@/hooks/use-invoices';
import { InvoicePDF } from './InvoicePDF';
import { PAYMENT_METHOD_LABEL } from '@/lib/invoices';
import { formatInvoiceDate } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';

interface MemberInvoicesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  organization: Organization;
  onCreateNew: () => void;
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  void: 'bg-red-50 text-red-700 border-red-200',
};

// Render an invoice to a PDF blob using the same component the download path uses,
// so the emailed PDF and the manually-downloaded PDF are byte-equivalent.
async function renderInvoicePdf(invoice: Invoice, organization: Organization): Promise<Blob> {
  const { data: itemRows, error } = await supabaseClient
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  const pdfLineItems = (itemRows ?? []).map(row => ({
    description: row.description as string,
    quantity: Number(row.quantity),
    unit: (row.unit as string) ?? null,
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
  }));

  const paymentMethodLabel = invoice.buyerSnapshot?.paymentMethodType
    ? PAYMENT_METHOD_LABEL[invoice.buyerSnapshot.paymentMethodType as PaymentMethodType]
    : null;

  return pdf(
    <InvoicePDF
      logoUrl={organization.logoUrl ?? null}
      invoiceNumber={invoice.invoiceNumber}
      issueDate={invoice.issueDate}
      dueDate={invoice.dueDate ?? null}
      seller={invoice.sellerSnapshot}
      buyer={invoice.buyerSnapshot}
      lineItems={pdfLineItems}
      subtotal={invoice.subtotal}
      vatRate={invoice.vatRate}
      vatAmount={invoice.vatAmount}
      total={invoice.total}
      currency={invoice.currency}
      notes={invoice.notes ?? null}
      compiledBy={invoice.compiledBy ?? null}
      signedBy={invoice.signedBy ?? null}
      paymentMethodLabel={paymentMethodLabel}
      bankDetails={invoice.sellerSnapshot?.bankDetails ?? null}
    />
  ).toBlob();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip "data:application/pdf;base64," prefix
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function MemberInvoicesDialog({
  isOpen,
  onClose,
  client,
  organization,
  onCreateNew,
}: MemberInvoicesDialogProps) {
  const { toast } = useToast();
  const { data: invoices = [], isLoading } = useClientInvoices(client?.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);

  const sendMutation = useSendInvoice();
  const markPaidMutation = useMarkInvoicePaid();
  const voidMutation = useVoidInvoice();

  const handleDownload = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    try {
      const blob = await renderInvoicePdf(invoice, organization);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Could not generate the PDF.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSend = async (invoice: Invoice) => {
    if (!invoice.buyerSnapshot?.email) {
      toast({
        title: 'No email on file',
        description: 'Add a contact email to the member profile before sending invoices.',
        variant: 'destructive',
      });
      return;
    }
    setBusyId(invoice.id);
    try {
      const blob = await renderInvoicePdf(invoice, organization);
      const pdfBase64 = await blobToBase64(blob);
      await sendMutation.mutateAsync({ invoiceId: invoice.id, pdfBase64 });
      toast({
        title: 'Invoice sent',
        description: `Emailed to ${invoice.buyerSnapshot.email}.`,
      });
    } catch (err) {
      toast({
        title: 'Send failed',
        description: err instanceof Error ? err.message : 'Could not send the invoice.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    try {
      await markPaidMutation.mutateAsync(invoice.id);
      toast({ title: 'Marked as paid' });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update the invoice.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleVoid = async () => {
    if (!voidingInvoice) return;
    const target = voidingInvoice;
    setBusyId(target.id);
    setVoidingInvoice(null);
    try {
      await voidMutation.mutateAsync(target.id);
      toast({ title: 'Invoice voided' });
    } catch (err) {
      toast({
        title: 'Void failed',
        description: err instanceof Error ? err.message : 'Could not void the invoice.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Invoices{client ? ` for ${client.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              {invoices.length > 0
                ? `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} — send, download, or mark as paid.`
                : 'No invoices yet. Create the first one below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 min-h-[80px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading…
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                No past invoices for this member.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const isBusy = busyId === inv.id;
                  const canSend = inv.status === 'draft' || inv.status === 'sent';
                  const canMarkPaid = inv.status === 'draft' || inv.status === 'sent';
                  const canVoid = inv.status === 'draft' || inv.status === 'sent';
                  const sendLabel = inv.status === 'sent' ? 'Resend' : 'Send';
                  return (
                    <li
                      key={inv.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-gray-900 tabular-nums">
                            {inv.invoiceNumber}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                              STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span>{formatInvoiceDate(inv.issueDate)}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">
                            {inv.total.toFixed(2)} {inv.currency}
                          </span>
                        </div>
                      </div>
                      {canSend ? (
                        <Button
                          variant="default"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleSend(inv)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 mr-1.5" />
                              {sendLabel}
                            </>
                          )}
                        </Button>
                      ) : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isBusy} className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleDownload(inv)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          {canMarkPaid ? (
                            <DropdownMenuItem onClick={() => handleMarkPaid(inv)}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                              Mark as paid
                            </DropdownMenuItem>
                          ) : null}
                          {canVoid ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setVoidingInvoice(inv)}
                                className="text-red-600 focus:text-red-700"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Void
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={onCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!voidingInvoice} onOpenChange={(open) => { if (!open) setVoidingInvoice(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void invoice {voidingInvoice?.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice will be marked as void and become read-only. The invoice number is preserved for your records and won't be reused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              className="bg-red-600 hover:bg-red-700"
            >
              Void invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
