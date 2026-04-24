import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Download, Plus } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import { pdf } from '@react-pdf/renderer';
import type { Client, Organization, Invoice, InvoiceStatus, PaymentMethodType } from '@shared/schema';
import { useClientInvoices } from '@/hooks/use-invoices';
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

export default function MemberInvoicesDialog({
  isOpen,
  onClose,
  client,
  organization,
  onCreateNew,
}: MemberInvoicesDialogProps) {
  const { toast } = useToast();
  const { data: invoices = [], isLoading } = useClientInvoices(client?.id);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      // Fetch line items for this invoice
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

      const blob = await pdf(
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
      setDownloadingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Invoices{client ? ` for ${client.name}` : ''}
          </DialogTitle>
          <DialogDescription>
            {invoices.length > 0
              ? `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} — click to download the PDF.`
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
                const isDownloading = downloadingId === inv.id;
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDownloading}
                      onClick={() => handleDownload(inv)}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          PDF
                        </>
                      )}
                    </Button>
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
  );
}
