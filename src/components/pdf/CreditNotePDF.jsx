import React from 'react';
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import MontserratRegular from '../../assets/fonts/Montserrat/Montserrat-Regular.ttf';
import MontserratMedium from '../../assets/fonts/Montserrat/Montserrat-Medium.ttf';
import MontserratBold from '../../assets/fonts/Montserrat/Montserrat-Bold.ttf';
import Logo from '../../assets/images/otelexi/logo-light.png';
import { formatCurrencyDecimals, fmtDate } from '../../utils/helper';

Font.register({ family: 'Montserrat', src: MontserratRegular });
Font.register({ family: 'Montserrat', src: MontserratMedium, fontWeight: 500 });
Font.register({ family: 'Montserrat', src: MontserratBold, fontWeight: 700 });

const BLUE = '#1e40af';
const ORANGE = '#d97706';
const TEXT = '#253047';
const MUTED = '#64748b';
const BORDER = '#dbe4f3';

const CreditNotePDF = ({ creditNote, settings }) => {
  if (!creditNote) return null;
  const invoice = creditNote.invoice || {};
  const client = creditNote.client || invoice.client || {};
  const contactLine = [settings?.address, settings?.city, settings?.state, settings?.phone, settings?.email, settings?.website].filter(Boolean).join('  |  ');
  const original = Number(invoice.total_amount || 0);
  const credit = Number(creditNote.amount || 0);
  const adjusted = Math.max(0, original - credit);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={Logo} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.title}>CREDIT NOTE</Text>
            <Text style={styles.number}>{creditNote.credit_note_number}</Text>
            <Text style={styles.muted}>Issued: {fmtDate(creditNote.issued_at)}</Text>
          </View>
        </View>
        <View style={styles.rule} />
        <View style={styles.banner}>
          <View><Text style={styles.label}>CREDIT AMOUNT</Text><Text style={styles.amount}>{formatCurrencyDecimals(credit, creditNote.currency || invoice.currency)}</Text></View>
          <Text style={styles.pill}>{String(creditNote.credit_type || 'partial').toUpperCase()} CREDIT</Text>
        </View>
        <View style={styles.columns}>
          <View style={styles.card}>
            <Text style={styles.section}>CREDIT ISSUED TO</Text>
            <Text style={styles.strong}>{client.company_name || '—'}</Text>
            {client.address ? <Text style={styles.line}>{client.address}</Text> : null}
            {client.email ? <Text style={styles.line}>{client.email}</Text> : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.section}>DOCUMENT INFORMATION</Text>
            <View style={styles.row}><Text style={styles.key}>Invoice:</Text><Text style={styles.value}>{invoice.invoice_number || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.key}>Invoice Date:</Text><Text style={styles.value}>{fmtDate(invoice.issue_date)}</Text></View>
            <View style={styles.row}><Text style={styles.key}>Stock Restored:</Text><Text style={styles.value}>{creditNote.restore_stock ? 'Yes' : 'No'}</Text></View>
          </View>
        </View>
        <View style={styles.summary}>
          <Text style={styles.section}>ADJUSTMENT SUMMARY</Text>
          <View style={styles.tableHead}><Text style={styles.white}>Description</Text><Text style={styles.white}>Amount</Text></View>
          <View style={styles.tableRow}><Text>Original Invoice Value</Text><Text style={styles.bold}>{formatCurrencyDecimals(original, creditNote.currency || invoice.currency)}</Text></View>
          <View style={styles.tableRow}><Text>Credit Note Value</Text><Text style={styles.orange}>- {formatCurrencyDecimals(credit, creditNote.currency || invoice.currency)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.whiteBold}>Adjusted Invoice Value</Text><Text style={styles.whiteBold}>{formatCurrencyDecimals(adjusted, creditNote.currency || invoice.currency)}</Text></View>
        </View>
        <View style={styles.reason}><Text style={styles.section}>REASON FOR CREDIT</Text><Text>{creditNote.reason || '—'}</Text></View>
        <View fixed style={styles.footer}>
          {settings?.legal_footer ? <Text style={styles.legal}>{settings.legal_footer}</Text> : null}
          <Text style={styles.contact}>{contactLine}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

const styles = StyleSheet.create({
  page: { fontFamily: 'Montserrat', color: TEXT, paddingTop: 38, paddingRight: 40, paddingBottom: 72, paddingLeft: 40, fontSize: 9.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, logo: { width: 130 }, headerRight: { alignItems: 'flex-end' }, title: { fontWeight: 700, fontSize: 15, color: BLUE }, number: { fontWeight: 700, fontSize: 13, marginTop: 4, marginBottom: 5 }, muted: { fontSize: 8.5, color: MUTED },
  rule: { height: 3, backgroundColor: BLUE, marginTop: 18, marginBottom: 22 }, banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff7ed', border: `1px solid ${BORDER}`, paddingVertical: 18, paddingHorizontal: 20, borderRadius: 10, marginBottom: 22 }, label: { fontSize: 8.5, letterSpacing: .8, color: MUTED, marginBottom: 7, fontWeight: 700 }, amount: { color: ORANGE, fontWeight: 700, fontSize: 25 }, pill: { color: ORANGE, fontWeight: 700, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#ffedd5' },
  columns: { flexDirection: 'row', gap: 18, marginBottom: 22 }, card: { flex: 1, minHeight: 104, padding: 14, borderRadius: 8, border: `1px solid ${BORDER}` }, section: { fontWeight: 700, fontSize: 8, color: BLUE, letterSpacing: .65, marginBottom: 10 }, strong: { fontWeight: 700, fontSize: 11, marginBottom: 6 }, line: { color: MUTED, marginBottom: 3 }, row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }, key: { color: MUTED }, value: { fontWeight: 500 },
  summary: { border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14, marginBottom: 18 }, tableHead: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: BLUE, borderRadius: 5, paddingVertical: 9, paddingHorizontal: 11 }, white: { color: '#fff', fontWeight: 500 }, tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 11, borderBottom: `1px solid ${BORDER}` }, bold: { fontWeight: 500 }, orange: { color: ORANGE, fontWeight: 700 }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 5, backgroundColor: BLUE }, whiteBold: { color: '#fff', fontWeight: 700 }, reason: { borderRadius: 8, backgroundColor: '#f7f9ff', padding: 14, lineHeight: 1.6 }, footer: { position: 'absolute', bottom: 26, left: 40, right: 40, borderTop: `1px solid ${BORDER}`, paddingTop: 9 }, legal: { color: MUTED, fontSize: 7.5, textAlign: 'center', marginBottom: 5 }, contact: { color: MUTED, fontSize: 7.5, textAlign: 'center' }, pageNumber: { position: 'absolute', right: 0, bottom: 0, fontSize: 7, color: MUTED },
});

export default CreditNotePDF;
