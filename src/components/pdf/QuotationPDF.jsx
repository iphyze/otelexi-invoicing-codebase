// components/pdf/QuotationPDF.jsx
// Matches the official Otelex Sales Quotation PDF layout.

import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer';

const BLUE   = '#1F3C88';
const LBLUE  = '#2563EB';
const GRAY   = '#6B7280';
const BLACK  = '#111827';
const WHITE  = '#FFFFFF';
const BORDER = '#CBD5E1';
const ROW_ALT = '#F1F5F9';

const fmtN = (n, sym = '₦') =>
  `${sym}${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Amount in words
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
  const n = Math.round(Number(amount || 0) * 100);
  const naira = Math.floor(n / 100);
  const kobo  = n % 100;
  let result  = toWords(naira) + ' Naira';
  if (kobo > 0) result += ' and ' + toWords(kobo) + ' Kobo';
  return result + ' Only';
}

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
  topContact: { fontSize: 7.5, color: GRAY, textAlign: 'center', marginBottom: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  logo: { width: 110, height: 44, objectFit: 'contain' },
  logoFallback: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE },
  docTypeBlock: { alignItems: 'flex-end' },
  docTypeTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BLACK, letterSpacing: 0.5 },
  docMeta: { fontSize: 8.5, color: GRAY, marginTop: 3, textAlign: 'right' },
  docMetaVal: { fontFamily: 'Helvetica-Bold', color: BLACK },
  rule: { height: 2, backgroundColor: BLUE, marginBottom: 10 },

  // ── Billed To — two-column for quotation ──
  billedSection: { flexDirection: 'row', marginBottom: 12 },
  billedLeft: { flex: 1, paddingRight: 12 },
  billedRight: { flex: 1 },
  billedHeader: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingBottom: 3 },
  billedRow: { flexDirection: 'row', marginBottom: 3 },
  billedLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLACK, width: 80 },
  billedValue: { fontSize: 8.5, color: LBLUE, flex: 1, fontFamily: 'Helvetica-Bold' },
  billedValueNorm: { fontSize: 8.5, color: GRAY, flex: 1 },

  // ── Table ──
  tableContainer: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: BLUE, borderRadius: 3 },
  tableHeaderCell: { color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 5 },
  tableRow:    { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, backgroundColor: ROW_ALT },
  tableCell:        { fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 5 },
  tableCellRight:   { fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 5, textAlign: 'right' },
  tableCellCenter:  { fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 5, textAlign: 'center' },

  // Quotation columns: Code | Description | Qty | Unit Price | Disc(%) | Disc(Amt) | Total
  colCode:    { width: '10%' },
  colDesc:    { width: '32%' },
  colQty:     { width: '8%', textAlign: 'center' },
  colPrice:   { width: '13%', textAlign: 'right' },
  colDiscPct: { width: '10%', textAlign: 'center' },
  colDiscAmt: { width: '13%', textAlign: 'right' },
  colTotal:   { width: '14%', textAlign: 'right' },

  // ── Footer ──
  footerRow: { flexDirection: 'row', marginTop: 8, gap: 16 },
  bankBlock: { flex: 1 },
  bankTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLACK, marginBottom: 5 },
  bankLine:  { fontSize: 8.5, color: BLACK, marginBottom: 2 },
  bankLabel: { fontFamily: 'Helvetica-Bold' },
  totalsBlock: { width: 200 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  totalsLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLACK },
  totalsValue: { fontSize: 8.5, textAlign: 'right' },
  totalsFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, backgroundColor: BLUE, paddingHorizontal: 5, borderRadius: 3, marginTop: 2 },
  totalsFinalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: WHITE },
  totalsFinalValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: WHITE },
  amountWords: { fontSize: 8.5, fontFamily: 'Helvetica-BoldOblique', marginTop: 8, marginBottom: 12 },
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  sigBlock: { alignItems: 'center', width: '30%' },
  sigLine: { width: '100%', height: 0.8, backgroundColor: BLACK, marginBottom: 5 },
  sigLabel: { fontSize: 8, color: GRAY },
  pageFooter: {
    position: 'absolute', bottom: 16, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 5,
    alignItems: 'center',
  },
  pageFooterText: { fontSize: 7, color: GRAY, textAlign: 'center', lineHeight: 1.5 },
});

// ── Prop: docType = 'quotation' | 'proforma' ──────────────────────
const QuotationPDF = ({ quotation: doc, settings, docType = 'quotation' }) => {
  if (!doc) return null;

  const sym   = doc.currency === 'USD' ? '$' : '₦';
  const fmt   = (n) => fmtN(n, sym);
  const items = doc.items || [];

  const isProforma = docType === 'proforma';
  const docLabel   = isProforma ? 'PROFORMA INVOICE' : 'SALES QUOTATION';
  const docNumLabel = isProforma ? 'Proforma #' : 'Quote #';
  const docNumber  = isProforma ? doc.proforma_number : doc.quotation_number;

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

  const BilledRow = ({ label, value, blue }) => (
    <View style={S.billedRow}>
      <Text style={S.billedLabel}>{label}:</Text>
      <Text style={blue ? S.billedValue : S.billedValueNorm}>{value || '—'}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={S.page}>

        <Text style={S.topContact}>{contactLine}</Text>

        {/* Header */}
        <View style={S.headerRow}>
          <View>
            {company.logo
              ? <Image src={company.logo} style={S.logo} />
              : <Text style={S.logoFallback}>{company.name}</Text>
            }
          </View>
          <View style={S.docTypeBlock}>
            <Text style={S.docTypeTitle}>{docLabel}</Text>
            <Text style={S.docMeta}>Client #: <Text style={S.docMetaVal}>{doc.client?.id || '—'}</Text></Text>
            <Text style={S.docMeta}>Date: <Text style={S.docMetaVal}>{fmtDate(doc.issue_date)}</Text></Text>
            <Text style={S.docMeta}>{docNumLabel}: <Text style={S.docMetaVal}>{docNumber}</Text></Text>
          </View>
        </View>

        <View style={S.rule} />

        {/* Billed To — two columns */}
        <View style={S.billedSection}>
          <View style={S.billedLeft}>
            <Text style={S.billedHeader}>Billed To</Text>
            <BilledRow label="Name"    value={doc.client?.company_name} blue />
            <BilledRow label="Address" value={doc.client?.address || doc.client?.billing_address} />
            <BilledRow label="Phone"   value={doc.client?.phone} />
            <BilledRow label="Country" value={doc.client?.country} />
            <BilledRow label="M.O.F"   value="" />
            <BilledRow label="Inspector" value="" />
          </View>
          <View style={S.billedRight}>
            <Text style={S.billedHeader}> </Text>
            <BilledRow label="VAT #"       value={doc.client?.tax_id} />
            <BilledRow label="TIN"         value="" />
            <BilledRow label="Department"  value="" />
            <BilledRow label="Reference"   value={doc.quotation_number || doc.proforma_number} />
            <BilledRow label="M.O.F"       value="" />
            <BilledRow label="Quote Validity" value={fmtDate(doc.expiry_date)} />
          </View>
        </View>

        {/* Line Items Table */}
        <View style={S.tableContainer}>
          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderCell, S.colCode]}>Code</Text>
            <Text style={[S.tableHeaderCell, S.colDesc]}>Description</Text>
            <Text style={[S.tableHeaderCell, S.colQty, { textAlign: 'center' }]}>Qty.</Text>
            <Text style={[S.tableHeaderCell, S.colPrice, { textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[S.tableHeaderCell, S.colDiscPct, { textAlign: 'center' }]}>Disc (%)</Text>
            <Text style={[S.tableHeaderCell, S.colDiscAmt, { textAlign: 'right' }]}>Disc (Amt)</Text>
            <Text style={[S.tableHeaderCell, S.colTotal, { textAlign: 'right' }]}>Total {doc.currency === 'USD' ? 'USD' : 'NGN'}</Text>
          </View>

          {items.map((item, i) => {
            const discPct = item.discount_type === 'fixed' && item.unit_price > 0
              ? ((item.discount_value / (item.quantity * item.unit_price)) * 100).toFixed(1)
              : '0.0';
            return (
              <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tableCell, S.colCode]}>{item.product_sku || '—'}</Text>
                <Text style={[S.tableCell, S.colDesc]}>{item.description}</Text>
                <Text style={[S.tableCellCenter, S.colQty]}>{item.quantity}</Text>
                <Text style={[S.tableCellRight, S.colPrice]}>{fmt(item.unit_price)}</Text>
                <Text style={[S.tableCellCenter, S.colDiscPct]}>{discPct}%</Text>
                <Text style={[S.tableCellRight, S.colDiscAmt]}>{item.discount_amount > 0 ? fmt(item.discount_amount) : '—'}</Text>
                <Text style={[S.tableCellRight, S.colTotal]}>{fmt(item.line_total + item.tax_amount)}</Text>
              </View>
            );
          })}

          {/* Pad to 10 rows */}
          {items.length < 10 && [...Array(Math.max(0, 10 - items.length))].map((_, i) => (
            <View key={`e-${i}`} style={(items.length + i) % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              {['colCode','colDesc','colQty','colPrice','colDiscPct','colDiscAmt','colTotal'].map((c) => (
                <Text key={c} style={[S.tableCell, S[c]]}> </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Footer: Bank + Totals */}
        <View style={S.footerRow}>
          <View style={S.bankBlock}>
            <Text style={S.bankTitle}>BANK DETAILS</Text>
            <Text style={S.bankLine}><Text style={S.bankLabel}>ACCOUNT NAME: </Text>{bank.accName}</Text>
            <Text style={S.bankLine}><Text style={S.bankLabel}>ACCOUNT NUMBER: </Text>{bank.accNum}</Text>
            <Text style={S.bankLine}><Text style={S.bankLabel}>BANK NAME: </Text>{bank.name}</Text>
            {bank.branch ? <Text style={S.bankLine}><Text style={S.bankLabel}>BRANCH: </Text>{bank.branch}</Text> : null}
          </View>
          <View style={S.totalsBlock}>
            {[
              { label: 'SUBTOTAL',      value: fmt(doc.subtotal) },
              { label: 'DISCOUNT',      value: doc.discount_amount > 0 ? fmt(doc.discount_amount) : '—' },
              { label: 'OTHER CHARGES', value: '—' },
              { label: 'VAT (7.5%)',    value: fmt(doc.tax_amount) },
            ].map((r) => (
              <View key={r.label} style={S.totalsRow}>
                <Text style={S.totalsLabel}>{r.label}</Text>
                <Text style={S.totalsValue}>{r.value}</Text>
              </View>
            ))}
            <View style={S.totalsFinalRow}>
              <Text style={S.totalsFinalLabel}>TOTAL</Text>
              <Text style={S.totalsFinalValue}>{fmt(doc.total_amount)}</Text>
            </View>
          </View>
        </View>

        {doc.notes && (
          <Text style={{ fontSize: 7.5, color: GRAY, marginTop: 6 }}>{doc.notes}</Text>
        )}
        {settings?.legal_footer && (
          <Text style={{ fontSize: 7.5, color: GRAY, fontFamily: 'Helvetica-Oblique', marginTop: 4, marginBottom: 4 }}>
            {settings.legal_footer}
          </Text>
        )}

        {/* Signature */}
        <View style={S.sigRow}>
          {['Authorized Signatory', 'Authorized Signatory', 'Received By'].map((label) => (
            <View key={label} style={S.sigBlock}>
              <View style={S.sigLine} />
              <Text style={S.sigLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Page footer */}
        <View style={S.pageFooter} fixed>
          <Text style={S.pageFooterText}>{contactLine}</Text>
        </View>

      </Page>
    </Document>
  );
};

export default QuotationPDF;
