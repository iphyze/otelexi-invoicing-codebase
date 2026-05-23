// components/pdf/QuotationPDF.jsx
import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer';

// ── Font Imports & Registration ────────────────────────────────────────
import Montserrat_Regular from '../../assets/fonts/Montserrat/Montserrat-Regular.ttf';
import Montserrat_Light from '../../assets/fonts/Montserrat/Montserrat-Light.ttf';
import Montserrat_SemiBold from '../../assets/fonts/Montserrat/Montserrat-SemiBold.ttf';
import Montserrat_Bold from '../../assets/fonts/Montserrat/Montserrat-Bold.ttf';
import Montserrat_LightItalic from '../../assets/fonts/Montserrat/Montserrat-LightItalic.ttf';
import Montserrat_Italic from '../../assets/fonts/Montserrat/Montserrat-Italic.ttf';
import Montserrat_Medium from '../../assets/fonts/Montserrat/Montserrat-Medium.ttf';
import Logo from '../../assets/images/otelexi/logo-light.png';
import { formatCurrencyDecimals, formatWithDecimals, fmtDate, amountInWords, PDF_STATUS_META } from '../../utils/helper';

Font.register({ family: 'Montserrat Regular', src: Montserrat_Regular })
Font.register({ family: 'Montserrat Light', src: Montserrat_Light })
Font.register({ family: 'Montserrat Semi Bold', src: Montserrat_SemiBold });
Font.register({ family: 'Montserrat Bold', src: Montserrat_Bold });
Font.register({ family: 'Montserrat LightItalic', src: Montserrat_LightItalic });
Font.register({ family: 'Montserrat Italic', src: Montserrat_Italic });
Font.register({ family: 'Montserrat Medium', src: Montserrat_Medium });

// ── Colours (Mapped from InvoicePDF) ─────────────────────────────────
const BLUE_DARK = '#1746bd';
const BLUE_MED = '#1e40af';
const BG_ALT = '#f7f9ff';
const BG_NET = '#e8edff';
const TEXT_MAIN = '#373c40';
const TEXT_GRAY = '#86898e';
const TEXT_NOTE = '#96a1b8';
const WHITE = '#FFFFFF';
const BORDER_GRAY = '#d8dbe0';

// ── Main Component ───────────────────────────────────────────────────
const QuotationPDF = ({ quotation: doc, settings, docType = 'quotation' }) => {
  if (!doc) return null;
  const items = doc.items || [];

  const company = {
    name: settings?.company_name || 'OTELEX LTD',
    address: settings?.address || '',
    city: settings?.city || '',
    state: settings?.state || '',
    phone: settings?.phone || '+234 7079790615 | +234 7036336464',
    email: settings?.email || 'info@otelexng.com | sales@otelexng.com',
    website: settings?.website || 'www.otelexng.com',
    logo: settings?.logo_path || null,
  };

  const contactLine = `${company.address}, ${company.city}, ${company.state}. ${company.phone} | ${company.email} | ${company.website}`;

  // Determine Logic based on Document Type
  const isProforma = docType === 'proforma';
  const docTitle = isProforma ? 'PROFORMA INVOICE #' : 'QUOTATION #';
  const docNumber = isProforma ? doc.proforma_number : doc.quotation_number;

  // Handle Expiry Date (Quotation) vs Due Date (Proforma)
  const dateLabel = isProforma ? 'Due Date:' : 'Expiry Date:';
  const dateValue = isProforma ? doc.due_date : doc.expiry_date;

  const currentStatus = PDF_STATUS_META[doc.status] || PDF_STATUS_META.draft;
  const statusStyle = S[currentStatus.style];

  // Helper Component for Client Rows
  const BilledRow = ({ label, value, bold = false }) => (
    <View style={S.clientRow}>
      <Text style={S.clientLabel}>{label}</Text>
      <Text style={[S.clientText, bold && { fontFamily: 'Montserrat Semi Bold', color: BLUE_DARK }]}>{value || '—'}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── FIXED HEADER (Repeats) ── */}
        <View fixed style={S.headerFixed}>
          <View style={S.headerRow}>
            <View>
              <Image src={Logo} style={S.logo} />
            </View>
            <View style={S.headerRowText}>
              <Text style={S.docTitle}>{docTitle}</Text>
              <Text style={S.invNumber}>{docNumber}</Text>

              <View style={S.metaRow}>
                <Text style={[S.metaLabel]}>Quote Date:</Text>
                <Text style={S.metaText}>{fmtDate(doc.issue_date)}</Text>
              </View>
              <View style={[S.metaRow, { marginBottom: 10 }]}>
                <Text style={[S.metaLabel]}>{dateLabel}</Text>
                <Text style={S.metaText}>{fmtDate(dateValue)}</Text>
              </View>

              <View style={[S.pdfStBadge, statusStyle]}>
                <Text style={{ color: currentStatus.color }}>{currentStatus.label}</Text>
              </View>

            </View>
          </View>
          <View style={S.blueRule} />
        </View>

        {/* ── SCROLLABLE CONTENT ── */}
        <View style={S.contentWrapper}>

          {/* Client Info Section (Two Columns for Quotation) */}
          <View style={S.billedSection}>
            {/* Left Column: Billed To */}
            <View style={S.colWrapper}>
              <Text style={S.sectionTitle}>Billed to</Text>
              <BilledRow label="Name" value={doc.client?.company_name} bold />
              <BilledRow label="Address" value={`${doc.client?.address || ''} ${[doc.client?.city, doc.client?.state].filter(Boolean).join(', ')}`} />
              <BilledRow label="Phone" value={doc.client?.phone} />
              <BilledRow label="Country" value={doc.client?.country} />
            </View>

            {/* Right Column: Quote Details */}
            <View style={S.colWrapper}>
              <Text style={S.sectionTitle}>Quote Details</Text>
              <BilledRow label="VAT #" value={doc.client?.tax_id} />
              <BilledRow label="TIN" value={doc.client?.tin} />
              <BilledRow label="Reference" value={docNumber} />
              <BilledRow label="Expiry Date" value={fmtDate(doc.expiry_date)} />
            </View>
          </View>

          {/* Table */}
          <View>
            <View style={S.tableHeader}>
              <Text style={[S.thText, S.colCode]}>Code</Text>
              <Text style={[S.thText, S.colDesc, { textAlign: 'left' }]}>Description</Text>
              <Text style={[S.thText, S.colQty, { textAlign: 'center' }]}>Qty</Text>
              <Text style={[S.thText, S.colUnit, { textAlign: 'right' }]}>Unit Price</Text>
              <Text style={[S.thText, S.colPct, { textAlign: 'center' }]}>Disc (%)</Text>
              <Text style={[S.thText, S.colDisc, { textAlign: 'right' }]}>Disc (Amt)</Text>
              <Text style={[S.thText, S.colTotal, { textAlign: 'right' }]}>Total {doc.currency}</Text>
            </View>

            {items.map((item, i) => {
              const discPct = item.discount_type === 'fixed' && item.unit_price > 0
                ? ((item.discount_value / (item.quantity * item.unit_price)) * 100).toFixed(1)
                : '0.0';
              return (
                <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={[S.tdTextLeft, S.colCode]}>{item.product_sku || '—'}</Text>
                  <Text style={[S.tdTextLeft, S.colDesc]}>{item.description}</Text>
                  <Text style={[S.tdText, S.colQty]}>{item.quantity}</Text>
                  <Text style={[S.tdTextRight, S.colUnit]}>{formatWithDecimals(item.unit_price)}</Text>
                  <Text style={[S.tdText, S.colPct]}>{discPct}</Text>
                  <Text style={[S.tdTextRight, S.colDisc]}>{item.discount_amount > 0 ? formatWithDecimals(item.discount_amount) : '0.00'}</Text>
                  <Text style={[S.tdTextRight, S.colTotal]}>{formatWithDecimals(item.line_total)}</Text>
                </View>
              );
            })}

            {/* Pad to 10 rows for Quotations */}
            {items.length < 10 && [...Array(10 - items.length)].map((_, i) => (
              <View key={`empty-${i}`} style={(items.length + i) % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tdText, S.emptyRow, S.colCode]}></Text>
                <Text style={[S.tdTextLeft, S.emptyRow, S.colDesc]}></Text>
                <Text style={[S.tdText, S.emptyRow, S.colQty]}></Text>
                <Text style={[S.tdTextRight, S.emptyRow, S.colUnit]}></Text>
                <Text style={[S.tdText, S.emptyRow, S.colPct]}></Text>
                <Text style={[S.tdTextRight, S.emptyRow, S.colDisc]}></Text>
                <Text style={[S.tdTextRight, S.emptyRow, S.colTotal]}></Text>
              </View>
            ))}
          </View>

          {/* Bottom Split */}
          <View style={S.bottomSection}>
            <View style={S.quoteNotice}>
              <Text style={S.quoteNoticeHead}>Quotation Only</Text>
              <Text style={S.quoteNoticeText}>
                This quotation presents the proposed price and applicable tax only.
                Payment should be made after an approved proforma invoice or final invoice is issued.
              </Text>
            </View>

            <View style={S.totalsBox}>
              <View style={S.totalRow}>
                <Text style={S.totalLabel}>Subtotal</Text>
                <Text style={S.totalVal}>{formatWithDecimals(doc.subtotal)}</Text>
              </View>

              <View style={S.totalRow}>
                <Text style={S.totalLabel}>Discount</Text>
                <Text style={S.totalVal}>{doc.discount_amount > 0 ? `(${formatWithDecimals(doc.discount_amount)})` : '0.00'}</Text>
              </View>

              {/* Net Total - Light Blue BG */}
              <View style={S.netTotalRow}>
                <Text style={[S.totalLabel, { color: BLUE_DARK, fontFamily: 'Montserrat Semi Bold' }]}>Net Total</Text>
                <Text style={[S.totalVal, { color: BLUE_DARK, fontFamily: 'Montserrat Semi Bold' }]}>{formatWithDecimals(doc.subtotal - doc.discount_amount)}</Text>
              </View>

              <View style={S.totalRow}>
                <Text style={S.totalLabel}>VAT (7.5%)</Text>
                <Text style={S.totalVal}>{formatWithDecimals(doc.tax_amount)}</Text>
              </View>

              {/* Grand Total - Dark Blue BG */}
              <View style={S.grandTotalRow}>
                <Text style={S.whiteText}>Grand Total</Text>
                <Text style={S.whiteText}>{formatCurrencyDecimals(doc.total_amount, doc.currency)}</Text>
              </View>
            </View>
          </View>

          {/* Words and Notes */}
          <View style={{ width: '50%' }}>
            <Text style={[S.amtWordsTitle]}>Amount in words</Text>
            <Text style={S.amtWords}>{amountInWords(doc.total_amount)}</Text>
            {doc.notes && <Text style={S.notesText}>{doc.notes}</Text>}
            {settings?.legal_footer && <Text style={S.legalText}>{settings.legal_footer}</Text>}
          </View>

          {/* Signatures */}
          <View style={S.sigSection}>
            <View style={S.sigBox}>
              <Text style={S.sigLine}>{doc.created_by?.name || ''}</Text>
              <Text style={S.sigText}>Created By</Text>
            </View>
            <View style={S.sigBox}>
              <Text style={S.sigLine}>{doc.approved_by?.name || ''}</Text>
              <Text style={S.sigText}>Authorized Signatory</Text>
            </View>
            <View style={S.sigBox}>
              <Text style={S.sigLine}></Text>
              <Text style={S.sigText}>Received By</Text>
            </View>
          </View>

        </View>

        {/* ── FIXED FOOTER (Repeats) ── */}
        <View fixed style={S.footerFixed}>
          <Text style={S.footerText}>{contactLine}</Text>
          <Text style={S.pageNum} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>

      </Page>
    </Document>
  );
};

export default QuotationPDF;

// ── Styles (Matching InvoicePDF) ────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Montserrat Regular',
    fontSize: 10,
    color: TEXT_MAIN,
    paddingHorizontal: 30,
    paddingTop: 150,
    paddingBottom: 80,
    backgroundColor: WHITE,
  },
  // ── REPEATING HEADER (Fixed) ──
  headerFixed: {
    position: 'absolute',
    top: 20,
    left: 30,
    right: 30,
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10
  },
  logo: {
    width: 120,
    height: 'auto',
    objectFit: 'contain'
  },
  headerRowText: {
    position: 'relative',
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  },
  docTitle: {
    fontSize: 11.5,
    fontFamily: 'Montserrat Semi Bold',
    color: TEXT_MAIN,
    textAlign: 'right'
  },
  invNumber: {
    fontSize: 14,
    fontFamily: 'Montserrat Bold',
    color: BLUE_DARK,
    marginBottom: 2,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'space-between',
    marginBottom: 2,
    gap: 5,
  },
  metaLabel: {
    fontSize: 7.5,
    color: TEXT_MAIN,
    fontFamily: 'Montserrat Semi Bold',
  },
  metaText: {
    fontSize: 7.5,
    color: TEXT_MAIN
  },
  pdfStBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 3,
    fontSize: 9,
    fontFamily: 'Montserrat Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
    minWidth: 80,
    borderWidth: 1,
  },
  draftSt: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb'
  },
  sentSt: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe'
  },
  partialSt: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a'
  },
  paidSt: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0'
  },
  overdueSt: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  cancelledSt: {
    backgroundColor: '#f9fafb',
    borderColor: '#9ca3af'
  },

  // The Blue Rule
  blueRule: {
    height: 1.5,
    backgroundColor: BLUE_DARK,
    width: '100%',
    marginTop: 5,
    marginBottom: 15
  },

  // ── MAIN CONTENT WRAPPER ──
  contentWrapper: {},

  // ── Client Info ──
  billedSection: {
    marginBottom: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  colWrapper: { width: '45%' },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Montserrat Bold',
    color: TEXT_MAIN,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  clientRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
    gap: 5,
  },
  clientLabel: {
    width: 50, // Adjusted for Quote labels like "VAT #", "Expiry"
    fontSize: 7.5,
    fontFamily: 'Montserrat Semi Bold',
    lineHeight: 1.8,
    color: BLUE_DARK
  },
  clientText: {
    flex: 1,
    fontSize: 7.5,
    color: TEXT_MAIN,
    lineHeight: 1.8,
  },

  // ── Table ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BLUE_MED,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  thText: {
    color: WHITE,
    fontSize: 7.5,
    fontFamily: 'Montserrat Semi Bold',
    textAlign: 'center',
    padding: 5,
    lineHeight: 1.7
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.3,
    borderBottomColor: BORDER_GRAY,
    flexWrap: 'wrap',
    position: 'relative',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.3,
    borderBottomColor: BORDER_GRAY,
    backgroundColor: BG_ALT,
    flexWrap: 'wrap',
    position: 'relative',
  },
  tdText: { fontSize: 7.5, color: TEXT_MAIN, textAlign: 'center', padding: 5, lineHeight: 1.7 },
  tdTextRight: { fontSize: 7.5, color: TEXT_MAIN, textAlign: 'right', padding: 5, lineHeight: 1.7 },
  tdTextLeft: { fontSize: 7.5, color: TEXT_MAIN, textAlign: 'left', padding: 5, lineHeight: 1.7 },

  // Columns (Quotation specific widths)
  colCode: { width: '10%' },
  colDesc: { width: '32%' },
  colQty: { width: '8%' },
  colUnit: { width: '13%' },
  colPct: { width: '10%' },
  colDisc: { width: '13%' },
  colTotal: { width: '14%' },

  emptyRow: { paddingVertical: 8.5 },

  // ── Bottom Details (Quotation Notice & Totals) ──
  bottomSection: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    alignItems: 'flex-start'
  },

  quoteNotice: {
    width: '50%',
    backgroundColor: BG_ALT,
    borderRadius: 4,
    padding: 10,
  },
  quoteNoticeHead: {
    fontSize: 7.5,
    fontFamily: 'Montserrat Semi Bold',
    marginBottom: 5,
    color: BLUE_MED,
    textTransform: 'uppercase',
  },
  quoteNoticeText: {
    fontSize: 7.2,
    color: TEXT_GRAY,
    lineHeight: 1.65,
  },

  totalsBox: { width: '35%' },

  // Specific Total Rows
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.3,
    borderBottomColor: BORDER_GRAY
  },

  totalLabel: {
    fontSize: 7.5,
    fontFamily: 'Montserrat Semi Bold',
    color: TEXT_MAIN,
    padding: 5,
  },
  totalVal: { fontSize: 7.5, color: TEXT_MAIN, padding: 5 },

  netTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: BG_NET,
    borderRadius: 3,
    marginVertical: 2
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: BLUE_DARK,
    borderRadius: 3,
    marginTop: 2
  },
  whiteText: { color: WHITE, fontSize: 7.5, fontFamily: 'Montserrat Semi Bold', padding: 5 },

  // ── Amount in Words & Notes ──
  amtWordsTitle: {
    fontSize: 7.5,
    fontFamily: 'Montserrat Semi Bold',
    marginTop: 15,
    color: BLUE_MED,
    marginBottom: 2,
  },
  amtWords: {
    fontSize: 7.5,
    fontFamily: 'Montserrat Italic',
    lineHeight: 1.6,
    marginBottom: 10,
    color: TEXT_MAIN
  },
  notesText: { fontSize: 7, color: TEXT_NOTE, marginBottom: 2, fontFamily: 'Montserrat Italic', lineHeight: 1.6, },
  legalText: { fontSize: 7, color: TEXT_NOTE, fontFamily: 'Montserrat Italic', lineHeight: 1.6, },

  // ── Signatures ──
  sigSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  },

  sigBox: { width: '30%', alignItems: 'center' },
  sigLine: {
    width: '100%',
    borderBottomWidth: 0.5,
    borderBottomColor: 'black',
    marginBottom: 5,
    padding: 5,
    textAlign: 'center',
    fontSize: 7.5,
    fontFamily: 'Montserrat Regular',
    lineHeight: 1.6,
    color: TEXT_MAIN,
  },
  sigText: {
    fontSize: 7.5,
    fontFamily: 'Montserrat Regular',
    color: TEXT_MAIN,
    lineHeight: 1.6,
  },

  // ── REPEATING FOOTER (Fixed) ──
  footerFixed: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#a7b7c7',
    paddingTop: 10,
    alignItems: 'center',
  },
  footerText: { fontSize: 7, textAlign: 'center', color: TEXT_GRAY, lineHeight: 1.6, fontFamily: 'Montserrat Regular' },
  pageNum: { fontSize: 7, color: TEXT_MAIN, fontFamily: 'Montserrat Medium', marginTop: 5 },
});