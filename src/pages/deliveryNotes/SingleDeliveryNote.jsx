// pages/deliveryNotes/SingleDeliveryNote.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import Skeleton from '../../components/Sekeleton';
import ConfirmModal from '../../components/modals/ConfirmModal';
import SendToClientModal from '../../components/modals/SendToClientModal';
import PDFDownloadButton from '../../components/pdf/PDFDownloadButton';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import useDeliveryNoteStore from '../../stores/useDeliveryNoteStore';
import './DeliveryNotes.css';
import '../invoices/SingleInvoice.css';
import '../invoices/Invoices.css';

const STATUS_META = {
  draft: { label: 'Draft', cls: 'draft', icon: 'fa-pen' },
  dispatched: { label: 'Dispatched', cls: 'dispatched', icon: 'fa-truck-fast' },
  delivered: { label: 'Delivered', cls: 'delivered', icon: 'fa-circle-check' },
  cancelled: { label: 'Cancelled', cls: 'cancelled', icon: 'fa-ban' },
};

const formatDate = (value, withTime = false) => {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  return date.toLocaleString('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return <span className={`dn-status ${meta.cls}`}><i className={`fas ${meta.icon}`} /> {meta.label}</span>;
};

const totalQty = (items = []) => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const SingleDeliveryNote = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const { fetchSingleDeliveryNote, selectedDeliveryNote, singleLoading, updateDeliveryNoteStatus } = useDeliveryNoteStore();

  const [nav, setNav] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, type: '' });
  const [receiverName, setReceiverName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  const canManage = ['super_admin', 'admin', 'sales'].includes(user?.role);
  const canCancel = ['super_admin', 'admin'].includes(user?.role);
  const canEmail = ['super_admin', 'admin', 'sales', 'accounting'].includes(user?.role);

  useEffect(() => {
    setFetchError(null);
    fetchSingleDeliveryNote(id).catch((error) => {
      setFetchError(error.response?.data?.message || 'Failed to load delivery note.');
    });
  }, [id, retryCount, fetchSingleDeliveryNote]);

  useEffect(() => {
    document.title = selectedDeliveryNote ? `Otelex | ${selectedDeliveryNote.delivery_note_number}` : 'Otelex | Delivery Note';
  }, [selectedDeliveryNote]);

  const note = selectedDeliveryNote;
  const statusMeta = STATUS_META[note?.status] || STATUS_META.draft;

  const canDispatch = canManage && note?.status === 'draft';
  const canDeliver = canManage && ['draft', 'dispatched'].includes(note?.status);
  const canCancelNote = canCancel && ['draft', 'dispatched'].includes(note?.status);

  const address = useMemo(() => (
    note?.delivery_address || note?.client?.shipping_address || note?.client?.address || '—'
  ), [note]);

  const doStatusAction = async (type) => {
    if (!note) return;
    const payload = { status: type };

    if (type === 'delivered') {
      if (!receiverName.trim()) {
        showToast('Receiver name is required before marking this delivery as delivered.', 'error');
        return;
      }
      payload.receiver_name = receiverName.trim();
    }

    setActionLoading(true);
    try {
      const response = await updateDeliveryNoteStatus(note.id, payload);
      showToast(response.message || 'Delivery note updated successfully.', 'success');
      setConfirm({ open: false, type: '' });
      setReceiverName('');
      setRetryCount((count) => count + 1);
    } catch (error) {
      showToast(error.response?.data?.message || 'Delivery note could not be updated.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmConfig = {
    dispatched: {
      title: 'Mark as Dispatched',
      message: 'Confirm that these items have left the store/warehouse for delivery.',
      btn: 'Mark Dispatched',
      variant: 'primary',
    },
    delivered: {
      title: 'Mark as Delivered',
      message: 'Enter the receiver name and confirm that the client has received the goods.',
      btn: 'Mark Delivered',
      variant: 'success',
    },
    cancelled: {
      title: 'Cancel Delivery Note',
      message: 'Cancel this delivery note? This does not reverse stock because delivery notes do not deduct stock.',
      btn: 'Cancel Delivery Note',
      variant: 'danger',
    },
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle={note?.delivery_note_number || 'Delivery Note Details'}
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Delivery Notes', to: '/delivery-notes' },
            { label: note?.delivery_note_number || 'Details', active: true },
          ]}
        />

        <div className="sinv-wrapper">
          {singleLoading && <Skeleton />}

          {fetchError && !singleLoading && (
            <div className={`sinv-error theme-${theme}`}>
              <div className="sinv-error-icon"><i className="fas fa-triangle-exclamation" /></div>
              <h4>Failed to Load Delivery Note</h4>
              <p>{fetchError}</p>
              <button className="sinv-retry-btn" onClick={() => setRetryCount((count) => count + 1)} type="button">
                <i className="fas fa-rotate-right" /> Retry
              </button>
            </div>
          )}

          {note && !singleLoading && (
            <>
              <motion.div className={`sinv-hero theme-${theme}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <div className="sinv-hero-left">
                  <div className="sinv-hero-icon"><i className="fas fa-truck-ramp-box" /></div>
                  <div className="sinv-hero-text">
                    <h1 className="sinv-hero-num">{note.delivery_note_number}</h1>
                    <div className="sinv-hero-meta">
                      <StatusBadge status={note.status} />
                      <span className="sinv-hero-client"><i className="fas fa-building" /> {note.client?.company_name}</span>
                      <span className="sinv-hero-date"><i className="fas fa-calendar" /> {formatDate(note.delivery_date)}</span>
                      <span className="sinv-lineage"><i className="fas fa-link" /> {note.invoice?.invoice_number || note.invoice_number}</span>
                    </div>
                    <p className="sinv-overdue-notice"><i className="fas fa-circle-info" /> Delivery notes confirm dispatch and receipt only. Stock remains deducted from the finalized invoice.</p>
                  </div>
                </div>

                <div className="sinv-hero-actions">
                  <PDFDownloadButton type="delivery_note" doc={note} label="Download PDF" />
                  {canEmail && note.status !== 'cancelled' && (
                    <button onClick={() => setSendModalOpen(true)} className="sc-action-btn primary" type="button">
                      <i className="fas fa-paper-plane" /> Email PDF to Client
                    </button>
                  )}
                  <button className="sinv-act-btn primary" onClick={() => navigate(`/invoices/${note.invoice_id}`)} type="button">
                    <i className="fas fa-file-invoice" /> View Invoice
                  </button>
                  {canDispatch && (
                    <button className="sinv-act-btn delivery" onClick={() => setConfirm({ open: true, type: 'dispatched' })} type="button">
                      <i className="fas fa-truck-fast" /> Mark Dispatched
                    </button>
                  )}
                  {canDeliver && (
                    <button className="sinv-act-btn finalize" onClick={() => setConfirm({ open: true, type: 'delivered' })} type="button">
                      <i className="fas fa-circle-check" /> Mark Delivered
                    </button>
                  )}
                  {canCancelNote && (
                    <button className="sinv-act-btn danger" onClick={() => setConfirm({ open: true, type: 'cancelled' })} type="button">
                      <i className="fas fa-ban" /> Cancel
                    </button>
                  )}
                </div>
              </motion.div>

              <div className="dn-detail-grid">
                <motion.div className={`sinv-card theme-${theme}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
                  <h3 className="sinv-card-title"><i className="fas fa-address-card" /> Delivery Address</h3>
                  <div className="dn-detail-box">
                    <h4><i className="fas fa-location-dot" /> Deliver To</h4>
                    <div className="dn-info-line"><span>Client</span><span>{note.client?.company_name || '—'}</span></div>
                    <div className="dn-info-line"><span>Address</span><span>{address}</span></div>
                    <div className="dn-info-line"><span>Contact</span><span>{note.contact_person || '—'}</span></div>
                    <div className="dn-info-line"><span>Phone</span><span>{note.contact_phone || note.client?.phone || '—'}</span></div>
                    <div className="dn-info-line"><span>Email</span><span>{note.client?.email || '—'}</span></div>
                  </div>
                </motion.div>

                <motion.div className={`sinv-card theme-${theme}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
                  <h3 className="sinv-card-title"><i className="fas fa-truck" /> Dispatch Summary</h3>
                  <div className="dn-detail-box">
                    <h4><i className="fas fa-clipboard-check" /> Movement Details</h4>
                    <div className="dn-info-line"><span>Delivery Date</span><span>{formatDate(note.delivery_date)}</span></div>
                    <div className="dn-info-line"><span>Dispatch Date</span><span>{formatDate(note.dispatch_date)}</span></div>
                    <div className="dn-info-line"><span>Delivered At</span><span>{formatDate(note.delivered_at, true)}</span></div>
                    <div className="dn-info-line"><span>Driver</span><span>{note.driver_name || '—'}</span></div>
                    <div className="dn-info-line"><span>Vehicle</span><span>{note.vehicle_number || '—'}</span></div>
                    <div className="dn-info-line"><span>Receiver</span><span>{note.receiver_name || '—'}</span></div>
                  </div>
                </motion.div>
              </div>

              <motion.div className={`sinv-card theme-${theme} sinv-items-card`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }}>
                <div className="sinv-payments-header">
                  <h3 className="sinv-card-title"><i className="fas fa-list" /> Delivered Items ({note.items?.length || 0})</h3>
                  <div className="dn-card-header-actions"><span className="dn-meta-tag"><i className="fas fa-boxes-stacked" /> Total Qty: {totalQty(note.items).toLocaleString('en-NG')}</span></div>
                </div>
                <div className="sinv-items-table-wrap">
                  <table className="sinv-items-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>SKU</th>
                        <th>UOM</th>
                        <th className="sinv-num-col">Ordered Qty</th>
                        <th className="sinv-num-col">Delivered Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {note.items?.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="sinv-item-num">{index + 1}</td>
                          <td><p className="sinv-item-desc">{item.description}</p></td>
                          <td><span className="dn-muted">{item.product_sku || '—'}</span></td>
                          <td><span className="dn-muted">{item.product_uom || '—'}</span></td>
                          <td className="sinv-num-col">{Number(item.ordered_quantity || 0).toLocaleString('en-NG')}</td>
                          <td className="sinv-num-col sinv-line-total">{Number(item.quantity || 0).toLocaleString('en-NG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {note.notes && <div className="sinv-notes"><i className="fas fa-note-sticky" /><p>{note.notes}</p></div>}
                <div className="dn-address-note"><i className="fas fa-circle-info" /><p>Use the PDF copy for customer acknowledgement. The receiver name can be captured when marking the delivery note as delivered.</p></div>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {confirm.type && confirmConfig[confirm.type] && (
        <ConfirmModal
          open={confirm.open}
          onClose={() => { setConfirm({ open: false, type: '' }); setReceiverName(''); }}
          onConfirm={() => doStatusAction(confirm.type)}
          title={confirmConfig[confirm.type].title}
          message={confirmConfig[confirm.type].message}
          confirmText={confirmConfig[confirm.type].btn}
          variant={confirmConfig[confirm.type].variant}
          loading={actionLoading}
          extraContent={confirm.type === 'delivered' ? (
            <input
              className="dn-receiver-input"
              value={receiverName}
              onChange={(event) => setReceiverName(event.target.value)}
              placeholder="Receiver name"
              autoFocus
            />
          ) : null}
        />
      )}

      <SendToClientModal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSent={() => note?.id && fetchSingleDeliveryNote(note.id)}
        documentType="delivery_note"
        documentNumber={note?.delivery_note_number}
        documentId={note?.id}
        documentData={note}
        clientName={note?.client?.company_name}
        clientEmail={note?.client?.email}
      />
    </div>
  );
};

export default SingleDeliveryNote;
