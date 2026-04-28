// components/pdf/InvoicePDF.jsx
// Matches the official Otelex Sales Invoice PDF layout exactly.
// Usage: <PDFDownloadLink document={<InvoicePDF invoice={inv} settings={settings} />} fileName="invoice.pdf">

import React from 'react';
import {
  Document, Page, View, Text, Image,
  StyleSheet, Font,
} from '@react-pdf/renderer';

// ── Colours (from official doc) ───────────────────────────────────
const BLUE   = '#1F3C88';   // Otelex dark blue
const LBLUE  = '#2563EB';   // lighter blue for labels
const GRAY   = '#6B7280';
const LGRAY  = '#9CA3AF';
const BLACK  = '#111827';
const WHITE  = '#FFFFFF';
const BORDER = '#CBD5E1';
const ROW_ALT = '#F1F5F9';

// ── Helpers ───────────────────────────────────────────────────────
const fmtN = (n, sym = '₦') =>
  `${sym}${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Convert number to words (Nigerian style up to billions)
const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function toWords(n) {
  if (n === 0) return 'Zero';
  if (n < 0)   return 'Minus ' + toWords(-n);
  if (n < 20)  return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
  if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toWords(n%100) : '');
  if (n < 1000000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
  if (n < 1000000000) return toWords(Math.floor(n/1000000)) + ' Million' + (n%1000000 ? ' ' + toWords(n%1000000) : '');
  return toWords(Math.floor(n/1000000000)) + ' Billion' + (n%1000000000 ? ' ' + toWords(n%1000000000) : '');
}

function amountInWords(amount) {
  const n     = Math.round(Number(amount || 0) * 100);
  const naira = Math.floor(n / 100);
  const kobo  = n % 100;
  let result  = toWords(naira) + ' Naira';
  if (kobo > 0) result += ' and ' + toWords(kobo) + ' Kobo';
  result += ' Only';
  return result;
}

// ── Styles ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: BLACK,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 48,
    backgroundColor: WHITE,
  },

  // ── Header ──
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  logo: { width: 110, height: 44, objectFit: 'contain' },
  logoFallback: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: -0.5 },
  docTypeBlock: { alignItems: 'flex-end' },
  docTypeTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BLACK, letterSpacing: 0.5 },
  docMeta: { fontSize: 8.5, color: GRAY, marginTop: 3, textAlign: 'right' },
  docMetaVal: { fontFamily: 'Helvetica-Bold', color: BLACK },

  // ── Blue rule ──
  rule: { height: 2, backgroundColor: BLUE, marginBottom: 10 },

  // ── Billed To ──
  billedSection: { marginBottom: 12 },
  billedLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 3 },
  billedName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: LBLUE },
  billedAddr: { fontSize: 9, color: GRAY, marginTop: 2 },

  // ── Footer contact ──
  topContact: { fontSize: 7.5, color: GRAY, textAlign: 'center', marginBottom: 6 },

  // ── Table ──
  tableContainer: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: BLUE, borderRadius: 3 },
  tableHeaderCell: { color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 5 },

  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, backgroundColor: ROW_ALT },
  tableCell: { fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 5, color: BLACK },
  tableCellRight: { fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 5, color: BLACK, textAlign: 'right' },
  tableCellCenter: { fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 5, color: BLACK, textAlign: 'center' },

  // Column widths — Invoice: S/N | Description | Qty | Disc(%) | Disc(Amt) | Total
  colSN:   { width: '6%' },
  colDesc: { width: '46%' },
  colQty:  { width: '10%', textAlign: 'center' },
  colDiscPct: { width: '11%', textAlign: 'center' },
  colDiscAmt: { width: '14%', textAlign: 'right' },
  colTotal:   { width: '13%', textAlign: 'right' },

  // ── Footer area ──
  footerRow: { flexDirection: 'row', marginTop: 8, gap: 16 },
  bankBlock: { flex: 1 },
  bankTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 5 },
  bankLine: { fontSize: 8.5, color: BLACK, marginBottom: 2 },
  bankLabel: { fontFamily: 'Helvetica-Bold' },

  totalsBlock: { width: 200 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  totalsLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLACK },
  totalsValue: { fontSize: 8.5, color: BLACK, textAlign: 'right' },
  totalsFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, backgroundColor: BLUE, paddingHorizontal: 5, borderRadius: 3, marginTop: 2 },
  totalsFinalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: WHITE },
  totalsFinalValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: WHITE },

  amountWords: { fontSize: 8.5, fontFamily: 'Helvetica-BoldOblique', color: BLACK, marginTop: 8, marginBottom: 12 },

  // ── Signature ──
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  sigBlock: { alignItems: 'center', width: '30%' },
  sigLine: { width: '100%', height: 0.8, backgroundColor: BLACK, marginBottom: 5 },
  sigLabel: { fontSize: 8, color: GRAY },

  // ── Page footer contact bar ──
  pageFooter: {
    position: 'absolute', bottom: 16, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 5,
    flexDirection: 'column', alignItems: 'center',
  },
  pageFooterText: { fontSize: 7, color: GRAY, textAlign: 'center', lineHeight: 1.5 },
});

// ── Main Component ────────────────────────────────────────────────
const InvoicePDF = ({ invoice: inv, settings }) => {
  if (!inv) return null;
  const sym  = inv.currency === 'USD' ? '$' : '₦';
  const fmt  = (n) => fmtN(n, sym);
  const items = inv.items || [];

  // Bank / company from settings, fallback to static
  const bank = {
    name:    settings?.bank_name     || 'ABC Bank Limited',
    accName: settings?.account_name  || 'OTELEX LTD',
    accNum:  settings?.account_number || 'XXXXXXXXXXX',
    branch:  settings?.bank_branch   || '',
  };

  const company = {
    name:    settings?.company_name || 'OTELEX LTD',
    address: settings?.address      || '',
    city:    settings?.city         || '',
    state:   settings?.state        || '',
    phone:   settings?.phone        || '+234 7079790615 | +234 7036336464',
    email:   settings?.email        || 'info@otelexng.com | sales@otelexng.com',
    website: settings?.website      || 'www.otelexng.com',
    logo:    settings?.logo_path    || null,
  };

  const contactLine = `${company.address}, ${company.city}, ${company.state}. ${company.phone} | ${company.email} | ${company.website}`;

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Top contact bar ── */}
        <Text style={S.topContact}>{contactLine}</Text>

        {/* ── Header ── */}
        <View style={S.headerRow}>
          <View>
            {company.logo
              ? <Image src={company.logo} style={S.logo} />
              : <Text style={S.logoFallback}>{company.name}</Text>
            }
          </View>
          <View style={S.docTypeBlock}>
            <Text style={S.docTypeTitle}>SALES INVOICE</Text>
            <Text style={S.docMeta}>Date: <Text style={S.docMetaVal}>{fmtDate(inv.issue_date)}</Text></Text>
            <Text style={S.docMeta}>Invoice #: <Text style={S.docMetaVal}>{inv.invoice_number}</Text></Text>
            {inv.due_date && <Text style={S.docMeta}>Due Date: <Text style={S.docMetaVal}>{fmtDate(inv.due_date)}</Text></Text>}
          </View>
        </View>

        {/* ── Blue rule ── */}
        <View style={S.rule} />

        {/* ── Billed To ── */}
        <View style={S.billedSection}>
          <Text style={S.billedLabel}>Billed To:</Text>
          <Text style={S.billedName}>{inv.client?.company_name || '—'}</Text>
          {inv.client?.address && <Text style={S.billedAddr}>{inv.client.address}</Text>}
          {(inv.client?.city || inv.client?.state) && (
            <Text style={S.billedAddr}>
              {[inv.client.city, inv.client.state, inv.client.country].filter(Boolean).join(', ')}
            </Text>
          )}
          {inv.client?.email && <Text style={S.billedAddr}>{inv.client.email} | {inv.client.phone}</Text>}
        </View>

        {/* ── Line Items Table ── */}
        <View style={S.tableContainer}>
          {/* Header */}
          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderCell, S.colSN]}>S/N</Text>
            <Text style={[S.tableHeaderCell, S.colDesc]}>Description of Goods/Services</Text>
            <Text style={[S.tableHeaderCell, S.colQty, { textAlign: 'center' }]}>Qty.</Text>
            <Text style={[S.tableHeaderCell, S.colDiscPct, { textAlign: 'center' }]}>Disc (%)</Text>
            <Text style={[S.tableHeaderCell, S.colDiscAmt, { textAlign: 'right' }]}>Disc (Amt)</Text>
            <Text style={[S.tableHeaderCell, S.colTotal, { textAlign: 'right' }]}>Total {inv.currency === 'USD' ? 'USD' : 'NGN'}</Text>
          </View>

          {/* Rows */}
          {items.map((item, i) => {
            const discPct = item.discount_type === 'fixed' && item.unit_price > 0
              ? ((item.discount_value / (item.quantity * item.unit_price)) * 100).toFixed(1)
              : '0.0';
            return (
              <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tableCell, S.colSN]}>{i + 1}</Text>
                <Text style={[S.tableCell, S.colDesc]}>{item.description}</Text>
                <Text style={[S.tableCellCenter, S.colQty]}>{item.quantity}</Text>
                <Text style={[S.tableCellCenter, S.colDiscPct]}>{discPct}%</Text>
                <Text style={[S.tableCellRight, S.colDiscAmt]}>{item.discount_amount > 0 ? fmt(item.discount_amount) : '—'}</Text>
                <Text style={[S.tableCellRight, S.colTotal]}>{fmt(item.line_total + item.tax_amount)}</Text>
              </View>
            );
          })}

          {/* Empty rows to pad to 8 rows if fewer items */}
          {items.length < 8 && [...Array(Math.max(0, 8 - items.length))].map((_, i) => (
            <View key={`empty-${i}`} style={(items.length + i) % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              {['colSN','colDesc','colQty','colDiscPct','colDiscAmt','colTotal'].map((c) => (
                <Text key={c} style={[S.tableCell, S[c]]}> </Text>
              ))}
            </View>
          ))}
        </View>

        {/* ── Footer area: Bank + Totals ── */}
        <View style={S.footerRow}>
          {/* Bank Details */}
          <View style={S.bankBlock}>
            <Text style={S.bankTitle}>BANK DETAILS</Text>
            <Text style={S.bankLine}><Text style={S.bankLabel}>ACCOUNT NAME: </Text>{bank.accName}</Text>
            <Text style={S.bankLine}><Text style={S.bankLabel}>ACCOUNT NUMBER: </Text>{bank.accNum}</Text>
            <Text style={S.bankLine}><Text style={S.bankLabel}>BANK NAME: </Text>{bank.name}</Text>
            {bank.branch ? <Text style={S.bankLine}><Text style={S.bankLabel}>BRANCH: </Text>{bank.branch}</Text> : null}
          </View>

          {/* Totals */}
          <View style={S.totalsBlock}>
            {[
              { label: 'SUBTOTAL',       value: fmt(inv.subtotal) },
              { label: 'DISCOUNT',       value: inv.discount_amount > 0 ? fmt(inv.discount_amount) : '—' },
              { label: 'OTHER CHARGES',  value: '—' },
              { label: 'VAT (7.5%)',     value: fmt(inv.tax_amount) },
            ].map((r) => (
              <View key={r.label} style={S.totalsRow}>
                <Text style={S.totalsLabel}>{r.label}</Text>
                <Text style={S.totalsValue}>{r.value}</Text>
              </View>
            ))}
            <View style={S.totalsFinalRow}>
              <Text style={S.totalsFinalLabel}>TOTAL</Text>
              <Text style={S.totalsFinalValue}>{fmt(inv.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* ── Amount in words ── */}
        <Text style={S.amountWords}>
          Amount in words: {amountInWords(inv.total_amount)}
        </Text>

        {/* ── Notes / Legal Footer ── */}
        {inv.notes && (
          <Text style={{ fontSize: 7.5, color: GRAY, marginBottom: 4 }}>{inv.notes}</Text>
        )}
        {settings?.legal_footer && (
          <Text style={{ fontSize: 7.5, color: GRAY, fontFamily: 'Helvetica-Oblique', marginBottom: 8 }}>
            {settings.legal_footer}
          </Text>
        )}

        {/* ── Signature lines ── */}
        <View style={S.sigRow}>
          {['Authorized Signatory', 'Authorized Signatory', 'Received By'].map((label) => (
            <View key={label} style={S.sigBlock}>
              <View style={S.sigLine} />
              <Text style={S.sigLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Page footer ── */}
        <View style={S.pageFooter} fixed>
          <Text style={S.pageFooterText}>{contactLine}</Text>
        </View>

      </Page>
    </Document>
  );
};

export default InvoicePDF;
