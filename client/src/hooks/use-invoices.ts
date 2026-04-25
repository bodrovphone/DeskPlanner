import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceBuyerSnapshot,
  InvoiceSellerSnapshot,
} from '@shared/schema';
import { round2 } from '@/lib/invoices';

// Row → domain mappers ─────────────────────────────────────────

function mapInvoiceRow(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    clientId: row.client_id != null ? String(row.client_id) : null,
    invoiceNumber: row.invoice_number as string,
    sequence: row.sequence as number,
    issueDate: row.issue_date as string,
    dueDate: (row.due_date as string) ?? null,
    status: row.status as InvoiceStatus,
    subtotal: Number(row.subtotal),
    vatRate: Number(row.vat_rate),
    vatAmount: Number(row.vat_amount),
    total: Number(row.total),
    currency: row.currency as string,
    notes: (row.notes as string) ?? null,
    compiledBy: (row.compiled_by as string) ?? null,
    signedBy: (row.signed_by as string) ?? null,
    sellerSnapshot: row.seller_snapshot as InvoiceSellerSnapshot,
    buyerSnapshot: row.buyer_snapshot as InvoiceBuyerSnapshot,
    pdfStoragePath: (row.pdf_storage_path as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    sentAt: (row.sent_at as string) ?? null,
    paidAt: (row.paid_at as string) ?? null,
  };
}

function mapLineItemRow(row: Record<string, unknown>): InvoiceLineItem {
  return {
    id: row.id as string,
    invoiceId: row.invoice_id as string,
    bookingId: row.booking_id != null ? String(row.booking_id) : null,
    description: row.description as string,
    quantity: Number(row.quantity),
    unit: (row.unit as string) ?? null,
    unitPrice: Number(row.unit_price),
    vatRate: Number(row.vat_rate),
    lineTotal: Number(row.line_total),
    sortOrder: row.sort_order as number,
  };
}

// Invoice number preview (not consumed — just shows the next number in the UI
// before the editor commits). Actual allocation happens in useCreateInvoice via
// the next_invoice_number RPC, which is atomic.
export function useNextInvoicePreview(orgId: string | undefined, nextNumber: number, padding: number) {
  // Pure derivation — kept as a hook so callers can memoize and swap to RPC later if needed.
  if (!orgId) return '';
  return String(nextNumber).padStart(padding, '0');
}

// Create invoice ───────────────────────────────────────────────

interface CreateInvoiceInput {
  organizationId: string;
  clientId: string | null;
  issueDate: string;                  // YYYY-MM-DD
  dueDate: string | null;
  currency: string;
  vatRate: number;                    // invoice-level (display / fallback)
  notes: string | null;
  compiledBy: string | null;
  signedBy: string | null;
  sellerSnapshot: InvoiceSellerSnapshot;
  buyerSnapshot: InvoiceBuyerSnapshot;
  lineItems: Array<{
    description: string;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    vatRate: number;
    bookingId: string | null;
  }>;
}

export function useCreateInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput): Promise<Invoice> => {
      // 1. Allocate the next invoice number atomically via RPC.
      const { data: numRows, error: numErr } = await supabaseClient.rpc('next_invoice_number', {
        p_organization_id: input.organizationId,
      });
      if (numErr) throw numErr;
      const allocated = Array.isArray(numRows) ? numRows[0] : numRows;
      if (!allocated?.invoice_number) throw new Error('Invoice numbering failed');

      // 2. Compute totals.
      const subtotal = round2(input.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0));
      const vatAmount = round2(subtotal * (input.vatRate / 100));
      const total = round2(subtotal + vatAmount);

      // 3. Insert invoice row.
      const { data: invRow, error: invErr } = await supabaseClient
        .from('invoices')
        .insert({
          organization_id: input.organizationId,
          client_id: input.clientId != null ? Number(input.clientId) : null,
          invoice_number: allocated.invoice_number,
          sequence: allocated.sequence,
          issue_date: input.issueDate,
          due_date: input.dueDate,
          status: 'draft',
          subtotal,
          vat_rate: input.vatRate,
          vat_amount: vatAmount,
          total,
          currency: input.currency,
          notes: input.notes,
          compiled_by: input.compiledBy,
          signed_by: input.signedBy,
          seller_snapshot: input.sellerSnapshot,
          buyer_snapshot: input.buyerSnapshot,
        })
        .select('*')
        .single();

      if (invErr) throw invErr;

      // 4. Insert line items.
      if (input.lineItems.length > 0) {
        const itemRows = input.lineItems.map((li, idx) => ({
          invoice_id: invRow.id,
          booking_id: li.bookingId != null ? Number(li.bookingId) : null,
          description: li.description,
          quantity: li.quantity,
          unit: li.unit,
          unit_price: li.unitPrice,
          vat_rate: li.vatRate,
          line_total: round2(li.quantity * li.unitPrice),
          sort_order: idx,
        }));

        const { error: itemsErr } = await supabaseClient
          .from('invoice_line_items')
          .insert(itemRows);

        if (itemsErr) throw itemsErr;
      }

      return mapInvoiceRow(invRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['user-organizations'] }); // numbering counter bumped
    },
  });
}

// List invoices for a client ──────────────────────────────────

export function useClientInvoices(clientId: string | undefined) {
  return useQuery<Invoice[]>({
    queryKey: ['invoices', 'by-client', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('client_id', Number(clientId))
        .order('issue_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapInvoiceRow);
    },
    enabled: !!clientId,
  });
}

// Send / mark paid / void ────────────────────────────────────

interface SendInvoiceInput {
  invoiceId: string;
  pdfBase64: string;
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendInvoiceInput): Promise<void> => {
      const { data, error } = await supabaseClient.functions.invoke('send-invoice', {
        body: { invoiceId: input.invoiceId, pdfBase64: input.pdfBase64 },
      });
      if (error) {
        const detail = (data as { error?: string } | null)?.error;
        throw new Error(detail ?? error.message);
      }
      const result = data as { sent?: boolean; error?: string } | null;
      if (!result?.sent) throw new Error(result?.error ?? 'Send failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string): Promise<Invoice> => {
      const { data, error } = await supabaseClient
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .select('*')
        .single();
      if (error) throw error;
      return mapInvoiceRow(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string): Promise<Invoice> => {
      const { data, error } = await supabaseClient
        .from('invoices')
        .update({ status: 'void' })
        .eq('id', invoiceId)
        .select('*')
        .single();
      if (error) throw error;
      return mapInvoiceRow(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// Line items for an invoice ───────────────────────────────────

export function useInvoiceLineItems(invoiceId: string | undefined) {
  return useQuery<InvoiceLineItem[]>({
    queryKey: ['invoice-line-items', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await supabaseClient
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapLineItemRow);
    },
    enabled: !!invoiceId,
  });
}

