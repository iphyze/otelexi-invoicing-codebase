import React from 'react';
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import MontserratRegular from '../../assets/fonts/Montserrat/Montserrat-Regular.ttf';
import MontserratMedium from '../../assets/fonts/Montserrat/Montserrat-Medium.ttf';
import MontserratSemiBold from '../../assets/fonts/Montserrat/Montserrat-SemiBold.ttf';
import MontserratBold from '../../assets/fonts/Montserrat/Montserrat-Bold.ttf';
import Logo from '../../assets/images/otelexi/logo-light.png';
import { amountInWords, formatCurrencyDecimals, fmtDate } from '../../utils/helper';

Font.register({ family: 'Montserrat', src: MontserratRegular });
Font.register({ family: 'Montserrat', src: MontserratMedium, fontWeight: 500 });
Font.register({ family: 'Montserrat', src: MontserratSemiBold, fontWeight: 600 });
Font.register({ family: 'Montserrat', src: MontserratBold, fontWeight: 700 });

const BLUE = '#1e40af';
const BLUE_SOFT = '#eef4ff';
const BLUE_PALE = '#f7f9ff';
const GREEN = '#059669';
const GREEN_SOFT = '#ecfdf5';
const TEXT = '#253047';
const MUTED = '#64748b';
const BORDER = '#dbe4f3';

const methodText = (value = '') => String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const ReceiptPDF = ({ receipt, settings }) => {
  if (!receipt) return null;

  const company = {
    name: settings?.company_name || 'Otelex Hospitality Supplies Ltd',
    address: settings?.address || '',
    city: settings?.city || '',
    state: settings?.state || '',
    phone: settings?.phone || '',
    email: settings?.email || '',
    website: settings?.website || '',
    legal: settings?.legal_footer || '',
  };
  const client = receipt.client || {};
  const location = [company.address, company.city, company.state].filter(Boolean).join(', ');
  const contactLine = [location, company.phone, company.email, company.website].filter(Boolean).join('  |  ');
  const totalReceived = Number(receipt.previous_amount_paid || 0) + Number(receipt.amount_received || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={Logo} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.title}>PAYMENT RECEIPT</Text>
            <Text style={styles.receiptNumber}>{receipt.receipt_number}</Text>
            <Text style={styles.muted}>Issued: {fmtDate(receipt.issued_at || receipt.payment_date)}</Text>
          </View>
        </View>
        <View style={styles.rule} />

        <View style={styles.receivedBanner}>
          <View>
            <Text style={styles.bannerLabel}>AMOUNT RECEIVED</Text>
            <Text style={styles.amount}>{formatCurrencyDecimals(receipt.amount_received, receipt.currency)}</Text>
          </View>
          <View style={styles.paidPill}>
            <Text style={styles.paidPillText}>PAYMENT RECEIVED</Text>
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.sectionLabel}>Received From</Text>
            <Text style={styles.strong}>{client.company_name || '—'}</Text>
            {client.address ? <Text style={styles.line}>{client.address}</Text> : null}
            {client.email ? <Text style={styles.line}>{client.email}</Text> : null}
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionLabel}>Payment Information</Text>
            <View style={styles.infoRow}><Text style={styles.infoKey}>Invoice:</Text><Text style={styles.infoValue}>{receipt.invoice_number}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoKey}>Payment Date:</Text><Text style={styles.infoValue}>{fmtDate(receipt.payment_date)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoKey}>Method:</Text><Text style={styles.infoValue}>{methodText(receipt.payment_method)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoKey}>Reference:</Text><Text style={styles.infoValue}>{receipt.payment_reference || '—'}</Text></View>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.sectionLabel}>Payment Summary</Text>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryHeaderText}>Description</Text>
            <Text style={styles.summaryHeaderAmount}>Amount</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Invoice Total ({receipt.invoice_number})</Text>
            <Text style={styles.summaryAmount}>{formatCurrencyDecimals(receipt.invoice_total, receipt.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Previously Received</Text>
            <Text style={styles.summaryAmount}>{formatCurrencyDecimals(receipt.previous_amount_paid, receipt.currency)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.currentPayment]}>
            <Text style={styles.summaryTextStrong}>Current Payment Received</Text>
            <Text style={styles.summaryAmountStrong}>{formatCurrencyDecimals(receipt.amount_received, receipt.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Total Received to Date</Text>
            <Text style={styles.summaryAmount}>{formatCurrencyDecimals(totalReceived, receipt.currency)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance Remaining</Text>
            <Text style={styles.balanceValue}>{formatCurrencyDecimals(receipt.balance_after_payment, receipt.currency)}</Text>
          </View>
        </View>

        <View style={styles.wordsBox}>
          <Text style={styles.sectionLabel}>Amount in Words</Text>
          <Text style={styles.words}>{amountInWords(receipt.amount_received, receipt.currency)}</Text>
          {receipt.payment_notes ? <Text style={styles.note}>Note: {receipt.payment_notes}</Text> : null}
        </View>

        <View style={styles.signatures}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>{receipt.issued_by?.name || ''}</Text>
            <Text style={styles.signatureLabel}>Received / Recorded By</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}></Text>
            <Text style={styles.signatureLabel}>Authorised Signatory</Text>
          </View>
        </View>

        <View fixed style={styles.footer}>
          {company.legal ? <Text style={styles.legal}>{company.legal}</Text> : null}
          <Text style={styles.contact}>{contactLine}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

const styles = StyleSheet.create({
  page: { fontFamily: 'Montserrat', color: TEXT, paddingTop: 38, paddingRight: 40, paddingBottom: 72, paddingLeft: 40, fontSize: 9.5, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 130, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  title: { color: BLUE, fontWeight: 700, fontSize: 15, letterSpacing: 0.7 },
  receiptNumber: { color: TEXT, fontWeight: 700, fontSize: 13, marginTop: 4, marginBottom: 5 },
  muted: { color: MUTED, fontSize: 8.5 },
  rule: { height: 3, backgroundColor: BLUE, borderRadius: 2, marginTop: 18, marginBottom: 22 },
  receivedBanner: { backgroundColor: BLUE_SOFT, borderRadius: 10, border: `1px solid ${BORDER}`, paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  bannerLabel: { fontSize: 8.5, color: MUTED, letterSpacing: 0.8, fontWeight: 600, marginBottom: 7 },
  amount: { fontWeight: 700, fontSize: 25, color: BLUE },
  paidPill: { backgroundColor: GREEN_SOFT, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 13 },
  paidPillText: { color: GREEN, fontWeight: 700, fontSize: 8, letterSpacing: 0.5 },
  twoColumns: { flexDirection: 'row', gap: 18, marginBottom: 21 },
  column: { flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14, minHeight: 94 },
  sectionLabel: { fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 0.65, fontSize: 8, marginBottom: 9 },
  strong: { fontWeight: 700, fontSize: 11, marginBottom: 6 },
  line: { color: MUTED, lineHeight: 1.45, marginBottom: 3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  infoKey: { color: MUTED },
  infoValue: { fontWeight: 600, textAlign: 'right', maxWidth: 130 },
  summaryBox: { border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14, marginBottom: 18 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: BLUE, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 5 },
  summaryHeaderText: { color: '#ffffff', fontWeight: 600 },
  summaryHeaderAmount: { color: '#ffffff', fontWeight: 600 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 11, borderBottom: `1px solid ${BORDER}` },
  summaryText: { color: TEXT },
  summaryAmount: { fontWeight: 500 },
  currentPayment: { backgroundColor: BLUE_PALE },
  summaryTextStrong: { color: BLUE, fontWeight: 700 },
  summaryAmountStrong: { color: BLUE, fontWeight: 700 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: BLUE, borderRadius: 5, paddingVertical: 11, paddingHorizontal: 12, marginTop: 11 },
  balanceLabel: { color: '#ffffff', fontWeight: 700 },
  balanceValue: { color: '#ffffff', fontWeight: 700, fontSize: 12 },
  wordsBox: { backgroundColor: BLUE_PALE, borderRadius: 8, padding: 14, marginBottom: 35 },
  words: { fontWeight: 500, lineHeight: 1.55 },
  note: { color: MUTED, fontSize: 8.5, marginTop: 9, lineHeight: 1.5 },
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  signatureBox: { width: 190, alignItems: 'center' },
  signatureLine: { width: '100%', borderBottom: `1px solid ${TEXT}`, minHeight: 25, textAlign: 'center', fontWeight: 500, paddingBottom: 6 },
  signatureLabel: { color: MUTED, fontSize: 8.5, marginTop: 7 },
  footer: { position: 'absolute', bottom: 26, left: 40, right: 40, borderTop: `1px solid ${BORDER}`, paddingTop: 9 },
  legal: { color: MUTED, fontSize: 7.5, textAlign: 'center', marginBottom: 5 },
  contact: { color: MUTED, fontSize: 7.5, textAlign: 'center' },
  pageNumber: { color: MUTED, fontSize: 7, position: 'absolute', right: 0, bottom: 0 },
});

export default ReceiptPDF;
