import React from 'react';
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import MontserratRegular from '../../assets/fonts/Montserrat/Montserrat-Regular.ttf';
import MontserratSemiBold from '../../assets/fonts/Montserrat/Montserrat-SemiBold.ttf';
import MontserratBold from '../../assets/fonts/Montserrat/Montserrat-Bold.ttf';
import Logo from '../../assets/images/otelexi/logo-light.png';

Font.register({ family: 'Montserrat', src: MontserratRegular });
Font.register({ family: 'Montserrat', src: MontserratSemiBold, fontWeight: 600 });
Font.register({ family: 'Montserrat', src: MontserratBold, fontWeight: 700 });

const BLUE = '#1A56DB';
const BLUE_DARK = '#153EAA';
const NAVY = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#DCE5F2';
const LIGHT = '#F8FAFC';
const LIGHT_BLUE = '#EFF6FF';
const GREEN = '#059669';
const RED = '#DC2626';
const WHITE = '#FFFFFF';

const fmtDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtAmount = (value) => Number(value || 0).toLocaleString('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const positionLabel = (balance) => {
  const value = Number(balance || 0);
  if (Math.abs(value) < 0.005) return 'Settled';
  return value > 0 ? 'Receivable' : 'Client Credit';
};

const clientAddress = (client = {}) => [client.address, client.city, client.state, client.country]
  .map((value) => String(value || '').trim())
  .filter(Boolean)
  .join(', ');

const companyContact = (company = {}) => {
  const address = [company.address, company.city, company.state, company.country]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
  const contacts = [company.phone, company.email, company.website]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('  |  ');
  return [address, contacts].filter(Boolean).join('  |  ');
};

const ClientStatementPDF = ({ statement }) => {
  if (!statement) return null;

  const company = statement.company || {};
  const client = statement.client || {};
  const period = statement.period || {};
  const summary = statement.summary || {};
  const ledger = statement.ledger || [];
  const currency = String(period.currency || 'NGN').toUpperCase();

  const rows = [
    {
      transaction_date: period.from,
      reference: 'OPENING',
      type_label: 'Opening Balance',
      description: 'Balance brought forward before this statement period',
      debit: 0,
      credit: 0,
      balance: summary.opening_balance,
      isOpening: true,
    },
    ...ledger,
  ];

  return (
    <Document title={`Client Statement - ${client.company_name || 'Client'}`} author={company.company_name || 'Otelex'}>
      <Page size="A4" orientation="landscape" style={S.page}>
        <View fixed style={S.header}>
          <View style={S.headerTop}>
            <Image src={Logo} style={S.logo} />
            <View style={S.headerTitleWrap}>
              <Text style={S.documentTitle}>CLIENT STATEMENT</Text>
              <Text style={S.companyName}>{company.company_name || 'Otelex Hospitality Supplies Ltd'}</Text>
              <Text style={S.companyContact}>{companyContact(company)}</Text>
            </View>
          </View>
          <View style={S.blueRule} />
          <View style={S.tableHeader}>
            <Text style={[S.th, S.colDate]}>DATE</Text>
            <Text style={[S.th, S.colRef]}>REFERENCE</Text>
            <Text style={[S.th, S.colType]}>TRANSACTION</Text>
            <Text style={[S.th, S.colDesc]}>DESCRIPTION</Text>
            <Text style={[S.thRight, S.colMoney]}>DEBIT ({currency})</Text>
            <Text style={[S.thRight, S.colMoney]}>CREDIT ({currency})</Text>
            <Text style={[S.thRight, S.colMoney]}>BALANCE ({currency})</Text>
          </View>
        </View>

        <View style={S.content}>
          <View style={S.metaBlock}>
            <View style={S.clientBlock}>
              <Text style={S.eyebrow}>STATEMENT FOR</Text>
              <Text style={S.clientName}>{client.company_name || 'Client'}</Text>
              {clientAddress(client) ? <Text style={S.clientMeta}>{clientAddress(client)}</Text> : null}
              <Text style={S.clientMeta}>{[client.email, client.phone].filter(Boolean).join('  |  ') || 'No contact details on file'}</Text>
            </View>
            <View style={S.periodBlock}>
              <Text style={S.eyebrow}>STATEMENT PERIOD</Text>
              <Text style={S.periodText}>{fmtDate(period.from)} — {fmtDate(period.to)}</Text>
              <Text style={S.periodMeta}>{currency}  •  {summary.transaction_count || 0} transaction{Number(summary.transaction_count || 0) === 1 ? '' : 's'}  •  {positionLabel(summary.closing_balance)}</Text>
            </View>
          </View>

          <View style={S.summaryGrid}>
            {[
              ['Opening Balance', summary.opening_balance, BLUE_DARK],
              ['Total Debit', summary.total_debits, RED],
              ['Total Credit', summary.total_credits, GREEN],
              ['Closing Balance', summary.closing_balance, BLUE],
            ].map(([label, value, color]) => (
              <View key={label} style={S.summaryCard}>
                <Text style={S.summaryLabel}>{label}</Text>
                <Text style={[S.summaryValue, { color }]}>{currency} {fmtAmount(value)}</Text>
              </View>
            ))}
          </View>

          <View style={S.ledgerBody}>
            {rows.map((entry, index) => (
              <View key={`${entry.transaction_type || 'opening'}-${entry.id || 0}-${index}`} wrap={false} style={[S.tableRow, index % 2 ? S.tableRowAlt : null, entry.isOpening ? S.openingRow : null]}>
                <Text style={[S.td, S.colDate]}>{fmtDate(entry.transaction_date)}</Text>
                <View style={S.colRef}>
                  <Text style={S.tdStrong}>{entry.reference || '—'}</Text>
                  {entry.related_reference ? <Text style={S.subText}>{entry.related_reference}</Text> : null}
                </View>
                <Text style={[S.td, S.colType]}>{entry.type_label || 'Transaction'}</Text>
                <View style={S.colDesc}>
                  <Text style={S.td}>{entry.description || '—'}</Text>
                  {entry.notes ? <Text style={S.subText}>{entry.notes}</Text> : null}
                </View>
                <Text style={[S.tdRight, S.colMoney, Number(entry.debit || 0) > 0 ? S.debit : null]}>{Number(entry.debit || 0) > 0 ? fmtAmount(entry.debit) : '—'}</Text>
                <Text style={[S.tdRight, S.colMoney, Number(entry.credit || 0) > 0 ? S.credit : null]}>{Number(entry.credit || 0) > 0 ? fmtAmount(entry.credit) : '—'}</Text>
                <Text style={[S.tdRightStrong, S.colMoney]}>{fmtAmount(entry.balance)}</Text>
              </View>
            ))}
          </View>

          <View wrap={false} style={S.totalRow}>
            <Text style={[S.totalLabel, S.totalTextCol]}>PERIOD TOTALS</Text>
            <Text style={[S.totalMoney, S.colMoney]}>{fmtAmount(summary.total_debits)}</Text>
            <Text style={[S.totalMoney, S.colMoney]}>{fmtAmount(summary.total_credits)}</Text>
            <Text style={[S.totalMoney, S.colMoney]}>{fmtAmount(summary.closing_balance)}</Text>
          </View>

          <View wrap={false} style={S.closingBox}>
            <View>
              <Text style={S.closingLabel}>CLOSING POSITION</Text>
              <Text style={S.closingPosition}>{positionLabel(summary.closing_balance)}</Text>
            </View>
            <View style={S.closingAmountWrap}>
              <Text style={S.closingLabel}>CLOSING BALANCE</Text>
              <Text style={S.closingAmount}>{currency} {fmtAmount(summary.closing_balance)}</Text>
            </View>
          </View>
        </View>

        <View fixed style={S.footer}>
          <Text style={S.footerText}>{company.legal_footer || 'Generated from Otelex invoicing and receivables records.'}</Text>
          <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

const S = StyleSheet.create({
  page: { fontFamily: 'Montserrat', fontSize: 7.8, color: NAVY, backgroundColor: WHITE, paddingTop: 126, paddingBottom: 42, paddingHorizontal: 24 },
  header: { position: 'absolute', top: 18, left: 24, right: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { width: 112, height: 40, objectFit: 'contain' },
  headerTitleWrap: { width: 470, alignItems: 'flex-end' },
  documentTitle: { fontSize: 15, fontWeight: 700, color: BLUE_DARK, letterSpacing: 0.4 },
  companyName: { marginTop: 3, fontSize: 8.8, fontWeight: 600, color: NAVY },
  companyContact: { marginTop: 3, fontSize: 6.6, lineHeight: 1.35, color: MUTED, textAlign: 'right' },
  blueRule: { height: 1.5, backgroundColor: BLUE, marginTop: 8, marginBottom: 8 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 25, backgroundColor: BLUE_DARK, paddingHorizontal: 7 },
  th: { color: WHITE, fontSize: 6.6, fontWeight: 700, letterSpacing: 0.25 },
  thRight: { color: WHITE, fontSize: 6.6, fontWeight: 700, letterSpacing: 0.25, textAlign: 'right' },
  content: {},
  metaBlock: { flexDirection: 'row', justifyContent: 'space-between', gap: 20, marginBottom: 11 },
  clientBlock: { width: '58%' },
  periodBlock: { width: '39%', alignItems: 'flex-end' },
  eyebrow: { fontSize: 6.5, fontWeight: 700, color: BLUE, letterSpacing: 0.55 },
  clientName: { marginTop: 3, fontSize: 12, fontWeight: 700, color: NAVY },
  clientMeta: { marginTop: 2, color: MUTED, fontSize: 7.1, lineHeight: 1.35 },
  periodText: { marginTop: 4, fontSize: 9.1, fontWeight: 700, color: NAVY },
  periodMeta: { marginTop: 3, color: MUTED, fontSize: 6.8 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 13 },
  summaryCard: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 5, backgroundColor: LIGHT, paddingVertical: 8, paddingHorizontal: 10 },
  summaryLabel: { color: MUTED, fontSize: 6.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.35 },
  summaryValue: { marginTop: 4, fontSize: 10.5, fontWeight: 700 },
  ledgerBody: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER },
  tableRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 24, paddingHorizontal: 7, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: WHITE },
  tableRowAlt: { backgroundColor: LIGHT },
  openingRow: { backgroundColor: LIGHT_BLUE },
  td: { fontSize: 6.8, lineHeight: 1.35, color: NAVY },
  tdStrong: { fontSize: 6.8, fontWeight: 600, lineHeight: 1.35, color: NAVY },
  tdRight: { fontSize: 6.8, textAlign: 'right', color: NAVY },
  tdRightStrong: { fontSize: 6.9, fontWeight: 600, textAlign: 'right', color: NAVY },
  subText: { marginTop: 2, color: MUTED, fontSize: 5.9, lineHeight: 1.25 },
  debit: { color: RED },
  credit: { color: GREEN },
  colDate: { width: '10%' },
  colRef: { width: '15%' },
  colType: { width: '12%' },
  colDesc: { width: '27%' },
  colMoney: { width: '12%' },
  totalRow: { flexDirection: 'row', alignItems: 'center', minHeight: 29, backgroundColor: NAVY, paddingHorizontal: 7, paddingVertical: 7 },
  totalTextCol: { width: '64%' },
  totalLabel: { color: WHITE, fontSize: 7.2, fontWeight: 700, letterSpacing: 0.35 },
  totalMoney: { color: WHITE, fontSize: 7.3, fontWeight: 700, textAlign: 'right' },
  closingBox: { marginTop: 12, marginLeft: '55%', width: '45%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: LIGHT_BLUE, borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 6, padding: 10 },
  closingLabel: { color: MUTED, fontSize: 6.1, fontWeight: 700, letterSpacing: 0.35 },
  closingPosition: { marginTop: 3, color: BLUE_DARK, fontSize: 8.4, fontWeight: 700 },
  closingAmountWrap: { alignItems: 'flex-end' },
  closingAmount: { marginTop: 3, color: BLUE_DARK, fontSize: 11, fontWeight: 700 },
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { width: '82%', color: MUTED, fontSize: 5.9 },
  pageNumber: { color: MUTED, fontSize: 6.2, fontWeight: 600 },
});

export default ClientStatementPDF;
