// components/pdf/DeliveryNotePDF.jsx
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';

import Montserrat_Regular from '../../assets/fonts/Montserrat/Montserrat-Regular.ttf';
import Montserrat_Light from '../../assets/fonts/Montserrat/Montserrat-Light.ttf';
import Montserrat_SemiBold from '../../assets/fonts/Montserrat/Montserrat-SemiBold.ttf';
import Montserrat_Bold from '../../assets/fonts/Montserrat/Montserrat-Bold.ttf';
import Montserrat_Medium from '../../assets/fonts/Montserrat/Montserrat-Medium.ttf';
import Logo from '../../assets/images/otelexi/logo-light.png';
import { fmtDate } from '../../utils/helper';

Font.register({ family: 'Montserrat Regular', src: Montserrat_Regular });
Font.register({ family: 'Montserrat Light', src: Montserrat_Light });
Font.register({ family: 'Montserrat Semi Bold', src: Montserrat_SemiBold });
Font.register({ family: 'Montserrat Bold', src: Montserrat_Bold });
Font.register({ family: 'Montserrat Medium', src: Montserrat_Medium });

const BLUE_DARK = '#1746bd';
const BLUE_MED = '#1e40af';
const BG_ALT = '#f7f9ff';
const BG_SOFT = '#edf4ff';
const TEXT_MAIN = '#373c40';
const TEXT_GRAY = '#86898e';
const TEXT_NOTE = '#96a1b8';
const WHITE = '#FFFFFF';
const BORDER_GRAY = '#d8dbe0';

const STATUS_META = {
  draft: { label: 'Draft', style: 'draftSt', color: '#4b5563' },
  dispatched: { label: 'Dispatched', style: 'sentSt', color: '#1e40af' },
  delivered: { label: 'Delivered', style: 'paidSt', color: '#047857' },
  cancelled: { label: 'Cancelled', style: 'cancelledSt', color: '#374151' },
};

const qty = (value) => Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });

const DeliveryNotePDF = ({ deliveryNote, settings }) => {
  if (!deliveryNote) return null;

  const note = deliveryNote;
  const items = note.items || [];
  const client = note.client || {};
  const invoice = note.invoice || {};
  const currentStatus = STATUS_META[note.status] || STATUS_META.draft;
  const company = {
    name: settings?.company_name || 'OTELEX LTD',
    address: settings?.address || '',
    city: settings?.city || '',
    state: settings?.state || '',
    phone: settings?.phone || '+234 7079790615',
    email: settings?.email || 'info@otelexng.com',
    website: settings?.website || 'www.otelexng.com',
  };
  const contactLine = `${company.address}, ${company.city}, ${company.state}. ${company.phone} | ${company.email} | ${company.website}`;
  const deliveryAddress = note.delivery_address || client.shipping_address || client.address || '—';

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View fixed style={S.headerFixed}>
          <View style={S.headerRow}>
            <Image src={Logo} style={S.logo} />
            <View style={S.headerText}>
              <Text style={S.docTitle}>DELIVERY NOTE #</Text>
              <Text style={S.docNumber}>{note.delivery_note_number}</Text>
              <View style={S.metaRow}><Text style={S.metaLabel}>Delivery Date:</Text><Text style={S.metaText}>{fmtDate(note.delivery_date)}</Text></View>
              <View style={S.metaRow}><Text style={S.metaLabel}>Invoice Ref:</Text><Text style={S.metaText}>{invoice.invoice_number || note.invoice_number || '—'}</Text></View>
              {note.dispatch_date && <View style={S.metaRow}><Text style={S.metaLabel}>Dispatch Date:</Text><Text style={S.metaText}>{fmtDate(note.dispatch_date)}</Text></View>}
              <View style={[S.statusBadge, S[currentStatus.style]]}><Text style={{ color: currentStatus.color }}>{currentStatus.label}</Text></View>
            </View>
          </View>
          <View style={S.blueRule} />
        </View>

        <View style={S.contentWrapper}>
          <View style={S.infoSection}>
            <View style={S.colWrapper}>
              <Text style={S.sectionTitle}>Deliver to</Text>
              <View style={S.clientRow}><Text style={S.clientLabel}>Name:</Text><Text style={S.clientText}>{client.company_name || note.client_name || '—'}</Text></View>
              <View style={S.clientRow}><Text style={S.clientLabel}>Address:</Text><Text style={S.clientText}>{deliveryAddress}</Text></View>
              <View style={S.clientRow}><Text style={S.clientLabel}>Phone:</Text><Text style={S.clientText}>{note.contact_phone || client.phone || '—'}</Text></View>
              <View style={S.clientRow}><Text style={S.clientLabel}>Email:</Text><Text style={S.clientText}>{client.email || '—'}</Text></View>
            </View>
            <View style={S.colWrapper}>
              <Text style={S.sectionTitle}>Dispatch details</Text>
              <View style={S.clientRow}><Text style={S.clientLabel}>Contact:</Text><Text style={S.clientText}>{note.contact_person || '—'}</Text></View>
              <View style={S.clientRow}><Text style={S.clientLabel}>Driver:</Text><Text style={S.clientText}>{note.driver_name || '—'}</Text></View>
              <View style={S.clientRow}><Text style={S.clientLabel}>Vehicle:</Text><Text style={S.clientText}>{note.vehicle_number || '—'}</Text></View>
              <View style={S.clientRow}><Text style={S.clientLabel}>Receiver:</Text><Text style={S.clientText}>{note.receiver_name || '—'}</Text></View>
            </View>
          </View>

          <View>
            <View style={S.tableHeader}>
              <Text style={[S.thText, S.colSN]}>S/N</Text>
              <Text style={[S.thText, S.colSku]}>SKU</Text>
              <Text style={[S.thText, S.colDesc, { textAlign: 'left' }]}>Description</Text>
              <Text style={[S.thText, S.colUom]}>UOM</Text>
              <Text style={[S.thText, S.colQty]}>Ordered</Text>
              <Text style={[S.thText, S.colQty]}>Delivered</Text>
            </View>

            {items.map((item, index) => (
              <View key={item.id || index} style={index % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tdText, S.colSN]}>{index + 1}</Text>
                <Text style={[S.tdText, S.colSku]}>{item.product_sku || '—'}</Text>
                <Text style={[S.tdTextLeft, S.colDesc]}>{item.description}</Text>
                <Text style={[S.tdText, S.colUom]}>{item.product_uom || '—'}</Text>
                <Text style={[S.tdText, S.colQty]}>{qty(item.ordered_quantity)}</Text>
                <Text style={[S.tdText, S.colQty]}>{qty(item.quantity)}</Text>
              </View>
            ))}

            {items.length < 8 && [...Array(8 - items.length)].map((_, index) => (
              <View key={`empty-${index}`} style={(items.length + index) % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tdText, S.emptyRow, S.colSN]}></Text>
                <Text style={[S.tdText, S.emptyRow, S.colSku]}></Text>
                <Text style={[S.tdTextLeft, S.emptyRow, S.colDesc]}></Text>
                <Text style={[S.tdText, S.emptyRow, S.colUom]}></Text>
                <Text style={[S.tdText, S.emptyRow, S.colQty]}></Text>
                <Text style={[S.tdText, S.emptyRow, S.colQty]}></Text>
              </View>
            ))}
          </View>

          <View style={S.noteBox}>
            <Text style={S.noteTitle}>Delivery Confirmation</Text>
            <Text style={S.noteText}>The goods listed above were prepared against {invoice.invoice_number || note.invoice_number || 'the linked invoice'}. Please inspect the items upon receipt and sign below to acknowledge delivery.</Text>
            {note.notes && <Text style={S.noteText}>Note: {note.notes}</Text>}
            {settings?.legal_footer && <Text style={S.legalText}>{settings.legal_footer}</Text>}
          </View>

          <View style={S.sigSection}>
            <View style={S.sigBox}>
              <Text style={S.sigLine}>{note.created_by?.name || note.created_by_name || ''}</Text>
              <Text style={S.sigText}>Prepared By</Text>
            </View>
            <View style={S.sigBox}>
              <Text style={S.sigLine}>{note.driver_name || ''}</Text>
              <Text style={S.sigText}>Driver / Dispatch</Text>
            </View>
            <View style={S.sigBox}>
              <Text style={S.sigLine}>{note.receiver_name || ''}</Text>
              <Text style={S.sigText}>Received By</Text>
            </View>
          </View>
        </View>

        <View fixed style={S.footerFixed}>
          <Text style={S.footerText}>{contactLine}</Text>
          <Text style={S.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export default DeliveryNotePDF;

const S = StyleSheet.create({
  page: { fontFamily: 'Montserrat Regular', fontSize: 10, color: TEXT_MAIN, paddingHorizontal: 30, paddingTop: 150, paddingBottom: 80, backgroundColor: WHITE },
  headerFixed: { position: 'absolute', top: 20, left: 30, right: 30, flexDirection: 'column' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  logo: { width: 120, height: 'auto', objectFit: 'contain' },
  headerText: { alignItems: 'flex-end' },
  docTitle: { fontSize: 11.5, fontFamily: 'Montserrat Semi Bold', color: TEXT_MAIN, textAlign: 'right' },
  docNumber: { fontSize: 14, fontFamily: 'Montserrat Bold', color: BLUE_DARK, marginBottom: 2, textAlign: 'right' },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2, gap: 5 },
  metaLabel: { fontSize: 7.5, color: TEXT_MAIN, fontFamily: 'Montserrat Semi Bold' },
  metaText: { fontSize: 7.5, color: TEXT_MAIN },
  statusBadge: { alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 3, fontSize: 9, fontFamily: 'Montserrat Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, minWidth: 88, borderWidth: 1 },
  draftSt: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  sentSt: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  paidSt: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  cancelledSt: { backgroundColor: '#f9fafb', borderColor: '#9ca3af' },
  blueRule: { height: 1.5, backgroundColor: BLUE_DARK, width: '100%', marginTop: 5, marginBottom: 15 },
  contentWrapper: {},
  infoSection: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  colWrapper: { width: '45%' },
  sectionTitle: { fontSize: 7.5, fontFamily: 'Montserrat Bold', color: TEXT_MAIN, marginBottom: 8, textTransform: 'uppercase' },
  clientRow: { flexDirection: 'row', marginBottom: 3, alignItems: 'flex-start', gap: 5 },
  clientLabel: { width: 48, fontSize: 7.5, fontFamily: 'Montserrat Semi Bold', lineHeight: 1.8, color: BLUE_DARK },
  clientText: { flex: 1, fontSize: 7.5, color: TEXT_MAIN, lineHeight: 1.8 },
  tableHeader: { flexDirection: 'row', backgroundColor: BLUE_MED, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  thText: { color: WHITE, fontSize: 7.5, fontFamily: 'Montserrat Semi Bold', textAlign: 'center', padding: 5, lineHeight: 1.7 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: BORDER_GRAY },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: BORDER_GRAY, backgroundColor: BG_ALT },
  tdText: { fontSize: 7.5, color: TEXT_MAIN, textAlign: 'center', padding: 5, lineHeight: 1.7 },
  tdTextLeft: { fontSize: 7.5, color: TEXT_MAIN, textAlign: 'left', padding: 5, lineHeight: 1.7 },
  colSN: { width: '8%' },
  colSku: { width: '14%' },
  colDesc: { width: '42%' },
  colUom: { width: '10%' },
  colQty: { width: '13%' },
  emptyRow: { paddingVertical: 8.5 },
  noteBox: { width: '100%', marginTop: 18, backgroundColor: BG_SOFT, padding: 10, borderRadius: 4, borderWidth: 0.4, borderColor: '#dbeafe' },
  noteTitle: { color: BLUE_MED, fontSize: 8, fontFamily: 'Montserrat Semi Bold', marginBottom: 4, textTransform: 'uppercase' },
  noteText: { fontSize: 7, color: TEXT_MAIN, lineHeight: 1.6, marginBottom: 3 },
  legalText: { fontSize: 7, color: TEXT_NOTE, fontFamily: 'Montserrat Light', lineHeight: 1.6, marginTop: 4 },
  sigSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 42, marginBottom: 20, alignItems: 'flex-end' },
  sigBox: { width: '30%', alignItems: 'center' },
  sigLine: { width: '100%', borderBottomWidth: 0.5, borderBottomColor: 'black', marginBottom: 5, padding: 5, textAlign: 'center', fontSize: 7.5, fontFamily: 'Montserrat Regular', lineHeight: 1.6, color: TEXT_MAIN },
  sigText: { fontSize: 7.5, fontFamily: 'Montserrat Regular', color: TEXT_MAIN, lineHeight: 1.6 },
  footerFixed: { position: 'absolute', bottom: 20, left: 30, right: 30, borderTopWidth: 1, borderTopColor: '#a7b7c7', paddingTop: 10, alignItems: 'center' },
  footerText: { fontSize: 7, textAlign: 'center', color: TEXT_GRAY, lineHeight: 1.6, fontFamily: 'Montserrat Regular' },
  pageNum: { fontSize: 7, color: TEXT_MAIN, fontFamily: 'Montserrat Medium', marginTop: 5 },
});
