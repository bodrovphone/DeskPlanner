import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import type { InvoiceBuyerSnapshot, InvoiceSellerSnapshot } from '@shared/schema';
import { formatInvoiceDate } from '@/lib/dateUtils';
import { PAYMENT_METHOD_LABEL } from '@/lib/invoices';
import robotoRegular from '@/assets/fonts/Roboto-Regular.ttf?url';
import robotoBold from '@/assets/fonts/Roboto-Bold.ttf?url';

// Helvetica (react-pdf default) has no Cyrillic glyphs. Roboto ships with
// Latin + Cyrillic + Greek + extended Latin in a single TTF, which covers
// every alphabet our users can plausibly type in the Settings fields.
Font.register({
  family: 'Roboto',
  fonts: [
    { src: robotoRegular, fontWeight: 400 },
    { src: robotoBold, fontWeight: 700 },
  ],
});

// React-PDF uses its own StyleSheet with a subset of CSS-like props.
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: 'Roboto',
    color: '#1f2937',
  },
  // Header — logo left, invoice meta right
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    minHeight: 72,
  },
  headerLeft: { flexDirection: 'column', justifyContent: 'center', maxWidth: '45%' },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 },
  logo: {
    width: 140,
    maxHeight: 72,
    objectFit: 'contain',
    objectPositionX: 0,
    objectPositionY: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#111827',
    letterSpacing: 0.5,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#374151',
    marginTop: 4,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 20 },
  metaBlock: { flexDirection: 'column', alignItems: 'flex-end' },
  metaLabel: { color: '#6b7280', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { color: '#111827', fontSize: 10, marginTop: 2 },

  // Parties (two columns)
  partiesRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  partyCol: { flex: 1 },
  partyLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  partyName: { fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4 },
  partyLine: { fontSize: 10, color: '#374151', marginBottom: 2, lineHeight: 1.4 },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colNo: { width: 24, fontSize: 9, color: '#6b7280' },
  colDesc: { flex: 1, fontSize: 10 },
  colQty: { width: 48, textAlign: 'right', fontSize: 10 },
  colUnit: { width: 56, textAlign: 'right', fontSize: 10, color: '#6b7280' },
  colPrice: { width: 72, textAlign: 'right', fontSize: 10 },
  colTotal: { width: 80, textAlign: 'right', fontSize: 10, fontWeight: 700 },
  headerText: {
    fontSize: 9,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 700,
  },

  // Totals
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  totalsBox: { width: 260 },
  totalsLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: { fontSize: 10, color: '#6b7280' },
  totalsValue: { fontSize: 10, color: '#111827' },
  grandTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  grandTotalLabel: { fontSize: 12, fontWeight: 700, color: '#111827' },
  grandTotalValue: { fontSize: 12, fontWeight: 700, color: '#111827' },

  // Payment / notes / footer
  sectionBlock: {
    marginTop: 28,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionText: { fontSize: 10, color: '#374151', lineHeight: 1.5 },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 36,
  },
  signatureCol: { flex: 1, marginRight: 24 },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: '#9ca3af', height: 24, marginBottom: 4 },
  signatureLabel: { fontSize: 9, color: '#6b7280' },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
});

export interface InvoicePDFLineItem {
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  lineTotal: number;
}

interface InvoicePDFProps {
  logoUrl?: string | null;
  invoiceNumber: string;
  issueDate: string;                 // "2026-04-24" → formatted inside
  dueDate?: string | null;
  seller: InvoiceSellerSnapshot;
  buyer: InvoiceBuyerSnapshot;
  lineItems: InvoicePDFLineItem[];
  subtotal: number;
  vatRate: number;                   // percent
  vatAmount: number;
  total: number;
  currency: string;
  notes?: string | null;
  compiledBy?: string | null;
  signedBy?: string | null;
  paymentMethodLabel?: string | null;
  bankDetails?: string | null;
}

function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

export function InvoicePDF(props: InvoicePDFProps) {
  const {
    logoUrl,
    invoiceNumber,
    issueDate,
    dueDate,
    seller,
    buyer,
    lineItems,
    subtotal,
    vatRate,
    vatAmount,
    total,
    currency,
    notes,
    compiledBy,
    signedBy,
    paymentMethodLabel,
    bankDetails,
  } = props;

  const showVat = vatRate > 0 || vatAmount > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header — logo left, invoice meta right */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}># {invoiceNumber}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Issue date</Text>
                <Text style={styles.metaValue}>{formatInvoiceDate(issueDate)}</Text>
              </View>
              {dueDate ? (
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Due date</Text>
                  <Text style={styles.metaValue}>{formatInvoiceDate(dueDate)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Bill from</Text>
            {seller.legalName ? <Text style={styles.partyName}>{seller.legalName}</Text> : null}
            {seller.taxId ? <Text style={styles.partyLine}>Tax ID: {seller.taxId}</Text> : null}
            {seller.vatId ? <Text style={styles.partyLine}>VAT: {seller.vatId}</Text> : null}
            {seller.address ? <Text style={styles.partyLine}>{seller.address}</Text> : null}
            {seller.mol ? <Text style={styles.partyLine}>Signed by: {seller.mol}</Text> : null}
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Bill to</Text>
            <Text style={styles.partyName}>{buyer.name}</Text>
            {buyer.taxId ? <Text style={styles.partyLine}>Tax ID: {buyer.taxId}</Text> : null}
            {buyer.vatId ? <Text style={styles.partyLine}>VAT: {buyer.vatId}</Text> : null}
            {buyer.billingAddress ? <Text style={styles.partyLine}>{buyer.billingAddress}</Text> : null}
            {buyer.email ? <Text style={styles.partyLine}>{buyer.email}</Text> : null}
            {buyer.representativeName ? <Text style={styles.partyLine}>Attn: {buyer.representativeName}</Text> : null}
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colNo, styles.headerText]}>#</Text>
          <Text style={[styles.colDesc, styles.headerText]}>Description</Text>
          <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
          <Text style={[styles.colUnit, styles.headerText]}>Unit</Text>
          <Text style={[styles.colPrice, styles.headerText]}>Price</Text>
          <Text style={[styles.colTotal, styles.headerText]}>Total</Text>
        </View>
        {lineItems.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.colDesc, { color: '#9ca3af', fontStyle: 'italic' }]}>
              No line items.
            </Text>
          </View>
        ) : (
          lineItems.map((li, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNo}>{idx + 1}</Text>
              <Text style={styles.colDesc}>{li.description}</Text>
              <Text style={styles.colQty}>{li.quantity}</Text>
              <Text style={styles.colUnit}>{li.unit ?? '—'}</Text>
              <Text style={styles.colPrice}>{formatMoney(li.unitPrice, currency)}</Text>
              <Text style={styles.colTotal}>{formatMoney(li.lineTotal, currency)}</Text>
            </View>
          ))
        )}

        {/* Totals */}
        <View style={styles.totalsRow}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsLine}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatMoney(subtotal, currency)}</Text>
            </View>
            {showVat ? (
              <View style={styles.totalsLine}>
                <Text style={styles.totalsLabel}>VAT ({vatRate.toFixed(vatRate % 1 === 0 ? 0 : 2)}%)</Text>
                <Text style={styles.totalsValue}>{formatMoney(vatAmount, currency)}</Text>
              </View>
            ) : null}
            <View style={styles.grandTotalLine}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatMoney(total, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Payment */}
        {(paymentMethodLabel || bankDetails) && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Payment</Text>
            {paymentMethodLabel ? (
              <Text style={styles.sectionText}>Method: {paymentMethodLabel}</Text>
            ) : null}
            {bankDetails ? (
              <Text style={[styles.sectionText, { marginTop: 4 }]}>{bankDetails}</Text>
            ) : null}
          </View>
        )}

        {/* Notes */}
        {notes ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.sectionText}>{notes}</Text>
          </View>
        ) : null}

        {/* Signatures */}
        {(signedBy || compiledBy) && (
          <View style={styles.signaturesRow}>
            <View style={styles.signatureCol}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>
                {signedBy ? `Signed by: ${signedBy}` : 'Signed by'}
              </Text>
            </View>
            <View style={styles.signatureCol}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>
                {compiledBy ? `Compiled by: ${compiledBy}` : 'Compiled by'}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by OhMyDesk · ohmydesk.app
        </Text>
      </Page>
    </Document>
  );
}
