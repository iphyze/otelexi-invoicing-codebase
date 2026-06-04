// pages/invoices/SingleInvoice.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useInvoiceStore from '../../stores/useInvoiceStore';
import usePaymentStore from '../../stores/usePaymentStore';
import useCustomerPortalStore from '../../stores/useCustomerPortalStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import ConfirmModal from '../../components/modals/ConfirmModal';
import RecordPaymentModal from './RecordPaymentModal';
import PaymentLinkModal from './PaymentLinkModal';
import CreditNoteModal from './CreditNoteModal';
import RefundModal from './RefundModal';
import ReverseInvoiceModal from './ReverseInvoiceModal';
import './SingleInvoice.css';
import './FinancialAdjustments.css';
import PDFDownloadButton from '../../components/pdf/PDFDownloadButton';
import { formatCurrencyDecimals, STATUS_META } from '../../utils/helper';
import Skeleton from '../../components/Sekeleton';
import SendToClientModal from '../../components/modals/SendToClientModal';

const METHOD_ICONS = {
  bank_transfer: 'fa-building-columns',
  cash:          'fa-money-bills',
  pos:           'fa-credit-card',
  cheque:        'fa-file-invoice',
  online:        'fa-globe',
};



const SingleInvoice = () => {
  const { id } = useParams();
  const navigate  = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const canFinalizeInvoice = ['super_admin', 'admin'].includes(user?.role);
  const canRecordPayment = ['super_admin', 'admin', 'accounting'].includes(user?.role);
  const canEmailInvoice = ['super_admin', 'admin', 'accounting'].includes(user?.role);
  const canSendReminder = ['super_admin', 'admin', 'accounting'].includes(user?.role);

  const {
    fetchSingleInvoice,
    selectedInvoice: invoice,
    singleLoading,
    finalizeInvoice,
    deleteInvoices,
    sendOverdueReminder,
    createCreditNote,
    processRefund,
    reverseInvoice,
  } = useInvoiceStore();
  const { recordPayment, issueReceipt, deletePayment, createPaymentLink, sendPaymentLink, cancelPaymentLink, verifyPaymentLink } = usePaymentStore();
  const { createCustomerPortalLink } = useCustomerPortalStore();

  const [nav, setNav] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, type: '', id: null });
  const [creditNoteOpen, setCreditNoteOpen] = useState(false);
  const [refundCreditNote, setRefundCreditNote] = useState(null);
  const [creditNoteToEmail, setCreditNoteToEmail] = useState(null);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [receiptToEmail, setReceiptToEmail] = useState(null);

  useEffect(() => {
    setFetchError(null);
    fetchSingleInvoice(id).catch((err) => {
      setFetchError(err.response?.data?.message || 'Failed to load invoice.');
    });
  }, [id, retryCount]);

  useEffect(() => {
    document.title = invoice ? `Otelex | ${invoice.invoice_number}` : 'Otelex | Invoice';
  }, [invoice]);

  const inv = invoice;
  const status     = inv?.status;
  const statusMeta = STATUS_META[status] || STATUS_META.draft;
  const payableStatuses = ['sent', 'partial', 'overdue'];

  const doAction = async (type) => {
    setActionLoading(true);
    setStockErrors([]);
    try {
      switch (type) {
        case 'finalize':
          await finalizeInvoice(id);
          showToast('Invoice finalized. You can now email the PDF to the client.', 'success');
          break;
        case 'delete':
          await deleteInvoices([Number(id)]);
          showToast('Invoice deleted.', 'success');
          navigate('/invoices');
          return;
        case 'delete-payment':
          await deletePayment(confirm.id);
          showToast('Payment reversed successfully.', 'success');
          break;
        case 'issue-receipt': {
          const response = await issueReceipt(confirm.id);
          showToast(response.message || 'Receipt issued successfully.', 'success');
          break;
        }
        case 'send-reminder': {
          const response = await sendOverdueReminder(Number(id));
          showToast(response.message || 'Payment reminder sent successfully.', 'success');
          break;
        }
        case 'send-payment-link': {
          const response = await sendPaymentLink(confirm.id);
          showToast(response.message || 'Payment request emailed successfully.', 'success');
          break;
        }
        case 'verify-payment-link': {
          const response = await verifyPaymentLink(confirm.id);
          showToast(response.message || 'Payment request verified successfully.', 'success');
          break;
        }
        case 'cancel-payment-link': {
          const response = await cancelPaymentLink(confirm.id);
          showToast(response.message || 'Payment request cancelled successfully.', 'success');
          break;
        }
      }
      setConfirm({ open: false, type: '', id: null });
      setRetryCount((c) => c + 1);
    } catch (err) {
      if (err.response?.data?.errors) {
        setStockErrors(err.response.data.errors);
      } else {
        showToast(err.response?.data?.message || 'Action failed.', 'error');
        setConfirm({ open: false, type: '', id: null });
      }
    } finally { setActionLoading(false); }
  };


  const doRecordPayment = async (payload) => {
    setActionLoading(true);
    try {
      const res = await recordPayment(payload);
      showToast(res.message || 'Payment recorded.', 'success');
      setPaymentOpen(false);
      setRetryCount((c) => c + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record payment.', 'error');
    } finally { setActionLoading(false); }
  };

  const doCreatePaymentLink = async (payload) => {
    setActionLoading(true);
    try {
      const res = await createPaymentLink(Number(id), payload);
      const link = res.data;
      showToast(res.message || 'Payment request created successfully.', 'success');
      if (link?.payment_url && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(link.payment_url);
          showToast('Payment link copied to clipboard.', 'success');
        } catch {
          // Clipboard is optional; email/copy buttons remain available in the page.
        }
      }
      setPaymentLinkOpen(false);
      setRetryCount((c) => c + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create payment request.', 'error');
    } finally { setActionLoading(false); }
  };

  const copyPaymentLink = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast('Payment link copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy payment link.', 'error');
    }
  };

  const doCreateCustomerPortalLink = async () => {
    setActionLoading(true);
    try {
      const response = await createCustomerPortalLink(Number(id), { expires_in_days: 30 });
      const portalUrl = response.data?.public_url;
      if (portalUrl && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(portalUrl);
          showToast('Customer portal link copied to clipboard.', 'success');
        } catch {
          showToast(response.message || 'Customer portal link generated, but could not copy automatically.', 'warning');
        }
      } else {
        showToast(response.message || 'Customer portal link generated successfully.', 'success');
      }
      setRetryCount((count) => count + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Customer portal link could not be generated.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const doCreateCreditNote = async (payload) => {
    setActionLoading(true);
    try {
      const response = await createCreditNote(Number(id), payload);
      showToast(response.message || 'Credit note issued successfully.', 'success');
      setCreditNoteOpen(false);
      setRetryCount((count) => count + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Credit note could not be issued.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const doProcessRefund = async (payload) => {
    if (!refundCreditNote) return;
    setActionLoading(true);
    try {
      const response = await processRefund(refundCreditNote.id, payload, Number(id));
      showToast(response.message || 'Refund recorded successfully.', 'success');
      setRefundCreditNote(null);
      setRetryCount((count) => count + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Refund could not be processed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const doReverseInvoice = async (reason) => {
    setActionLoading(true);
    try {
      const response = await reverseInvoice(Number(id), reason);
      showToast(response.message || 'Invoice reversed successfully.', 'success');
      setReverseOpen(false);
      setRetryCount((count) => count + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Invoice could not be reversed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmConfig = {
    finalize:       { title: 'Finalize Invoice',   msg: 'Check stock, deduct inventory and finalize this invoice. Once finalized, it can be emailed to the client with its PDF attachment.',  btn: 'Finalize Invoice', variant: 'primary' },
    delete:         { title: 'Delete Invoice',     msg: 'Permanently delete this draft invoice? This cannot be undone.',                                               btn: 'Yes, Delete',     variant: 'danger' },
    'delete-payment': { title: 'Reverse Payment',  msg: 'Permanently reverse this payment and restore the invoice balance? This cannot be undone.',                   btn: 'Yes, Reverse',    variant: 'danger' },
    'issue-receipt': { title: 'Issue Payment Receipt', msg: 'Generate an official receipt for this recorded payment? Once issued, the payment can no longer be directly reversed.', btn: 'Issue Receipt', variant: 'primary' },
    'send-reminder':  { title: 'Send Payment Reminder', msg: 'Send an overdue payment reminder email to the client now? Only one reminder attempt is allowed per invoice per day.', btn: 'Send Reminder', variant: 'warning' },
    'send-payment-link': { title: 'Send Payment Request', msg: 'Email this payment request to the client now?', btn: 'Send Request', variant: 'primary' },
    'verify-payment-link': { title: 'Verify Paystack Payment', msg: 'Check Paystack for the latest payment status. If successful, the invoice payment and receipt will be recorded automatically.', btn: 'Verify Now', variant: 'primary' },
    'cancel-payment-link': { title: 'Cancel Payment Request', msg: 'Cancel this unpaid payment request? The client should no longer use the payment link afterwards.', btn: 'Cancel Request', variant: 'danger' },
  };

  // Progress bar reflects financial adjustments and refunds.
  const adjustedTotal = Number(inv?.adjusted_total ?? inv?.total_amount ?? 0);
  const netPaid = Number(inv?.net_paid ?? (Number(inv?.amount_paid || 0) - Number(inv?.refunded_amount || 0)));
  const paidPct = inv && adjustedTotal > 0 ? Math.min(100, (netPaid / adjustedTotal) * 100) : 0;
  const creditableAmount = Math.max(0, adjustedTotal);
  const canIssueCreditNote = isSuperAdmin && inv && !['draft', 'cancelled', 'reversed', 'credited'].includes(inv.status) && creditableAmount > 0;
  const canReverseFinalInvoice = isSuperAdmin && inv && ['sent', 'overdue'].includes(inv.status) && Number(inv.amount_paid || 0) === 0 && Number(inv.credited_amount || 0) === 0;

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle={inv?.invoice_number || 'Invoice Details'}
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Invoices', to: '/invoices' }, { label: inv?.invoice_number || 'Details', active: true }]}
        />

        <div className="sinv-wrapper">
          {singleLoading && <Skeleton/>}

          {fetchError && !singleLoading && (
            <div className={`sinv-error theme-${theme}`}>
              <div className="sinv-error-icon"><i className="fas fa-triangle-exclamation" /></div>
              <h4>Failed to Load Invoice</h4>
              <p>{fetchError}</p>
              <button className="sinv-retry-btn" onClick={() => setRetryCount((c) => c + 1)} type="button">
                <i className="fas fa-rotate-right" /> Retry
              </button>
            </div>
          )}

          {inv && !singleLoading && (<>
            {/* ── Hero ── */}
            <motion.div className={`sinv-hero theme-${theme}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="sinv-hero-left">
                <div className="sinv-hero-icon"><i className="fas fa-file-invoice" /></div>
                <div className="sinv-hero-text">
                  <h1 className="sinv-hero-num">{inv.invoice_number}</h1>
                  <div className="sinv-hero-meta">
                    <span className={`sinv-status-badge ${statusMeta.cls}`}>
                      <i className={`fas ${statusMeta.icon}`} /> {statusMeta.label}
                    </span>
                    <span className="sinv-hero-client"><i className="fas fa-building" /> {inv.client?.company_name}</span>
                    <span className="sinv-hero-date"><i className="fas fa-calendar" /> {new Date(inv.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    {inv.stock_deducted && <span className="sinv-stock-tag"><i className="fas fa-box" /> Stock deducted</span>}
                    {inv.proforma_id   && <span className="sinv-lineage"><i className="fas fa-link" /> Proforma linked</span>}
                    {inv.quotation_id  && <span className="sinv-lineage"><i className="fas fa-link" /> Quotation linked</span>}
                  </div>
                  {(inv.is_overdue || inv.status === 'overdue') && inv.days_overdue > 0 && (
                    <p className="sinv-overdue-notice"><i className="fas fa-triangle-exclamation" /> {inv.days_overdue} day{inv.days_overdue !== 1 ? 's' : ''} overdue — due {inv.due_date}</p>
                  )}
                </div>
              </div>

              <div className="sinv-hero-actions">
                {/* ── PDF Download — always visible when invoice is loaded ── */}
                {/* <PDFDownloadButton type="invoice" doc={inv} label="Download PDF"/> */}

                <button className='pdf-dl-btn' type="button" onClick={() => navigate(`/invoices/${id}/preview`)}><i className="fas fa-file-pdf"/> Preview</button>

                {inv.status === 'draft' && (
                  <>
                    <button className="sinv-act-btn primary" onClick={() => navigate(`/invoices/${id}/edit`)} type="button"><i className="fas fa-pen" /> Edit</button>
                    {canFinalizeInvoice && (
                      <>
                        <button className="sinv-act-btn finalize" onClick={() => setConfirm({ open: true, type: 'finalize' })} type="button"><i className="fas fa-paper-plane" /> Finalize Invoice</button>
                        {isSuperAdmin && <button className="sinv-act-btn danger" onClick={() => setConfirm({ open: true, type: 'delete' })} type="button" title="Delete draft invoice"><i className="fas fa-trash" /></button>}
                      </>
                    )}
                  </>
                )}
                {payableStatuses.includes(inv.status) && canRecordPayment && (
                  <button className="sinv-act-btn payment" onClick={() => setPaymentOpen(true)} type="button">
                    <i className="fas fa-money-bill-wave" /> Record Payment
                  </button>
                )}

                {payableStatuses.includes(inv.status) && canRecordPayment && (
                  <button className="sinv-act-btn paylink" onClick={() => setPaymentLinkOpen(true)} type="button">
                    <i className="fas fa-link" /> Payment Request
                  </button>
                )}

                {!['draft', 'cancelled', 'reversed'].includes(inv.status) && canRecordPayment && (
                  <button className="sinv-act-btn portal" onClick={doCreateCustomerPortalLink} type="button" disabled={actionLoading}>
                    <i className="fas fa-user-shield" /> Customer Portal
                  </button>
                )}

                {canIssueCreditNote && (
                  <button className="sinv-act-btn cancel" onClick={() => setCreditNoteOpen(true)} type="button"><i className="fas fa-file-circle-minus" /> Credit Note</button>
                )}

                {canReverseFinalInvoice && (
                  <button className="sinv-act-btn danger" onClick={() => setReverseOpen(true)} type="button"><i className="fas fa-rotate-left" /> Reverse Invoice</button>
                )}

                {canEmailInvoice && !['draft', 'cancelled', 'reversed'].includes(inv.status) && (
                  <button onClick={() => setSendModalOpen(true)} className="sc-action-btn primary" type="button">
                    <i className="fas fa-paper-plane" /> Email PDF to Client
                  </button>
                )}

                {canSendReminder && inv.status === 'overdue' && Number(inv.balance_due) > 0 && (
                  <button
                    className="sinv-act-btn reminder"
                    onClick={() => setConfirm({ open: true, type: 'send-reminder', id: inv.id })}
                    type="button"
                  >
                    <i className="fas fa-bell" /> Send Reminder
                  </button>
                )}

                </div>
            </motion.div>

            {/* ── Payment progress bar ── */}
            {inv.status !== 'draft' && inv.status !== 'cancelled' && (
              <motion.div className={`sinv-progress-card theme-${theme}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
                <div className="sinv-progress-labels">
                  <span className="sinv-progress-paid"><i className="fas fa-check-circle" /> Net Paid: {formatCurrencyDecimals(netPaid, inv.currency)}</span>
                  <span className="sinv-progress-total">Adjusted Total: {formatCurrencyDecimals(adjustedTotal, inv.currency)}</span>
                </div>
                <div className="sinv-progress-bar-wrap">
                  <div className="sinv-progress-bar" style={{ width: `${paidPct}%`, background: paidPct >= 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#1a56db,#3b82f6)' }} />
                </div>
                <div className="sinv-progress-balance">
                  <span>Balance Due:</span>
                  <span className={`sinv-balance-val ${inv.balance_due <= 0 ? 'sinv-bal-zero' : inv.status === 'overdue' ? 'sinv-bal-overdue' : ''}`}>
                    {formatCurrencyDecimals(inv.balance_due, inv.currency)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* ── Two-column detail grid ── */}
            <div className="sinv-grid">
              {/* Client & Dates */}
              <motion.div className={`sinv-card theme-${theme}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }}>
                <h3 className="sinv-card-title"><i className="fas fa-address-card" /> Client & Dates</h3>
                <div className="sinv-info-list">
                  {[
                    { icon: 'fa-building',      label: 'Company',       value: inv.client?.company_name },
                    { icon: 'fa-envelope',       label: 'Email',         value: inv.client?.email },
                    { icon: 'fa-phone',          label: 'Phone',         value: inv.client?.phone },
                    { icon: 'fa-location-dot',   label: 'Location',      value: [inv.client?.city, inv.client?.state, inv.client?.country].filter(Boolean).join(', ') },
                    { icon: 'fa-receipt',        label: 'Tax ID',        value: inv.client?.tax_id },
                    { icon: 'fa-calendar-plus',  label: 'Issued',        value: new Date(inv.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    { icon: 'fa-calendar-check', label: 'Due',           value: new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    { icon: 'fa-clock',          label: 'Payment Terms', value: inv.payment_terms === 'net_7' ? 'Net 7 Days' : 'Due on Receipt' },
                    { icon: 'fa-user-shield',    label: 'Approved By',   value: inv.approved_by?.name },
                  ].map((row) => row.value ? (
                    <div key={row.label} className="sinv-info-row">
                      <div className="sinv-info-icon"><i className={`fas ${row.icon}`} /></div>
                      <div className="sinv-info-body"><span className="sinv-info-label">{row.label}</span><span className="sinv-info-value">{row.value}</span></div>
                    </div>
                  ) : null)}
                </div>
              </motion.div>

              {/* Financial Summary */}
              <motion.div className={`sinv-card theme-${theme}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
                <h3 className="sinv-card-title"><i className="fas fa-receipt" /> Financial Summary</h3>
                <div className="sinv-totals">
                  <div className="sinv-total-row"><span>Subtotal</span><span>{formatCurrencyDecimals(inv.subtotal, inv.currency)}</span></div>
                  {inv.discount_amount > 0 && <div className="sinv-total-row sinv-disc-row"><span>Discount{inv.discount_type === 'percentage' ? ` (${inv.discount_value}%)` : ''}</span><span>-{formatCurrencyDecimals(inv.discount_amount, inv.currency)}</span></div>}
                  <div className="sinv-total-row"><span>Taxable Amount</span><span>{formatCurrencyDecimals(inv.taxable_amount, inv.currency)}</span></div>
                  <div className="sinv-total-row"><span>VAT</span><span>{formatCurrencyDecimals(inv.tax_amount, inv.currency)}</span></div>
                  <div className="sinv-total-divider" />
                  <div className="sinv-total-row sinv-total-grand"><span>Total</span><span>{formatCurrencyDecimals(inv.total_amount, inv.currency)}</span></div>
                  {inv.status !== 'draft' && (<>
                    <div className="sinv-total-row sinv-paid-row"><span>Payments Received</span><span className="sinv-paid-val">{formatCurrencyDecimals(inv.amount_paid, inv.currency)}</span></div>
                    {Number(inv.credited_amount || 0) > 0 && <div className="sinv-total-row"><span>Credit Notes Issued</span><span>- {formatCurrencyDecimals(inv.credited_amount, inv.currency)}</span></div>}
                    {Number(inv.refunded_amount || 0) > 0 && <div className="sinv-total-row"><span>Refunds Processed</span><span>- {formatCurrencyDecimals(inv.refunded_amount, inv.currency)}</span></div>}
                    {Number(inv.credited_amount || 0) > 0 && <div className="sinv-total-row"><span>Adjusted Invoice Total</span><span>{formatCurrencyDecimals(adjustedTotal, inv.currency)}</span></div>}
                    <div className="sinv-total-row sinv-total-balance"><span>Balance Due</span><span className={inv.balance_due <= 0 ? 'sinv-bal-zero' : ''}>{formatCurrencyDecimals(inv.balance_due, inv.currency)}</span></div>
                  </>)}
                </div>
                {inv.currency === 'USD' && <p className="sinv-exchange-note"><i className="fas fa-circle-info" /> Exchange: 1 USD = ₦{inv.exchange_rate?.toLocaleString()}</p>}
                <div className="sinv-card-divider" />
                <h3 className="sinv-card-title"><i className="fas fa-clock" /> System Info</h3>
                <div className="sinv-info-list">
                  {[
                    { icon: 'fa-user',          label: 'Created By', value: inv.created_by?.name },
                    { icon: 'fa-money-bill',    label: 'Currency',   value: inv.currency },
                    { icon: 'fa-bell',          label: 'Reminders',  value: inv.reminder_count > 0 ? `${inv.reminder_count} sent` : null },
                    { icon: 'fa-calendar-check',label: 'Created',    value: inv.created_at ? new Date(inv.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
                    { icon: 'fa-pen-to-square', label: 'Updated',    value: inv.updated_at ? new Date(inv.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
                  ].map((row) => row.value ? (
                    <div key={row.label} className="sinv-info-row">
                      <div className="sinv-info-icon"><i className={`fas ${row.icon}`} /></div>
                      <div className="sinv-info-body"><span className="sinv-info-label">{row.label}</span><span className="sinv-info-value">{row.value}</span></div>
                    </div>
                  ) : null)}
                </div>
              </motion.div>
            </div>

            {/* ── Line Items ── */}
            <motion.div className={`sinv-card theme-${theme} sinv-items-card`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.17 }}>
              <h3 className="sinv-card-title"><i className="fas fa-list" /> Line Items ({inv.items?.length})</h3>
              <div className="sinv-items-table-wrap">
                <table className="sinv-items-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Description</th>
                      <th className="sinv-num-col">Qty</th>
                      <th className="sinv-num-col">Unit Price</th>
                      <th className="sinv-num-col">Discount</th>
                      <th className="sinv-num-col">VAT %</th>
                      <th className="sinv-num-col">VAT Amt</th>
                      <th className="sinv-num-col">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items?.map((item, i) => (
                      <tr key={item.id}>
                        <td className="sinv-item-num">{i + 1}</td>
                        <td>
                          <p className="sinv-item-desc">{item.description}</p>
                          {item.product_sku && <p className="sinv-item-sku">SKU: {item.product_sku} {item.product_uom ? `· ${item.product_uom}` : ''}</p>}
                        </td>
                        <td className="sinv-num-col">{item.quantity}</td>
                        <td className="sinv-num-col">{formatCurrencyDecimals(item.unit_price, inv.currency)}</td>
                        <td className="sinv-num-col">{item.discount_amount > 0 ? `-${formatCurrencyDecimals(item.discount_amount, inv.currency)}` : '—'}</td>
                        <td className="sinv-num-col">{item.tax_rate}%</td>
                        <td className="sinv-num-col">{formatCurrencyDecimals(item.tax_amount, inv.currency)}</td>
                        <td className="sinv-num-col sinv-line-total">{formatCurrencyDecimals(item.line_total, inv.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {inv.notes && <div className="sinv-notes"><i className="fas fa-note-sticky" /><p>{inv.notes}</p></div>}
              {inv.footer_text && <div className="sinv-footer-text"><i className="fas fa-circle-info" /><p>{inv.footer_text}</p></div>}
            </motion.div>

            {/* ── Financial Adjustments ── */}
            {inv.status !== 'draft' && (
              <motion.div className={`sinv-card theme-${theme}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.19 }}>
                <div className="finadj-toolbar">
                  <h3 className="sinv-card-title"><i className="fas fa-scale-balanced" /> Credit Notes & Refunds</h3>
                  {canIssueCreditNote && (
                    <div className="finadj-toolbar-actions">
                      <button className="finadj-action credit" type="button" onClick={() => setCreditNoteOpen(true)}><i className="fas fa-file-circle-minus" /> Issue Credit Note</button>
                    </div>
                  )}
                </div>
                <div className="finadj-summary">
                  <div className="finadj-summary-item"><span>Original Value</span><strong>{formatCurrencyDecimals(inv.total_amount, inv.currency)}</strong></div>
                  <div className="finadj-summary-item credit"><span>Credited</span><strong>{formatCurrencyDecimals(inv.credited_amount || 0, inv.currency)}</strong></div>
                  <div className="finadj-summary-item refund"><span>Refunded</span><strong>{formatCurrencyDecimals(inv.refunded_amount || 0, inv.currency)}</strong></div>
                  <div className="finadj-summary-item net"><span>Adjusted Total</span><strong>{formatCurrencyDecimals(adjustedTotal, inv.currency)}</strong></div>
                </div>
                {!inv.credit_notes?.length && !inv.refunds?.length ? (
                  <div className="finadj-empty">No credit notes or refunds have been recorded for this invoice.</div>
                ) : (
                  <div className="finadj-list">
                    {(inv.credit_notes || []).map((creditNote) => (
                      <div key={`credit-${creditNote.id}`} className="finadj-row">
                        <div className="finadj-icon"><i className="fas fa-file-circle-minus" /></div>
                        <div className="finadj-detail">
                          <strong>{creditNote.credit_note_number}</strong>
                          <p>{creditNote.reason} · Issued by {creditNote.issued_by_name || 'System'} · {new Date(creditNote.issued_at.replace(' ', 'T')).toLocaleDateString('en-GB')}</p>
                        </div>
                        <div className="finadj-amount">- {formatCurrencyDecimals(creditNote.amount, inv.currency)}</div>
                        <div className="finadj-toolbar-actions">
                          <PDFDownloadButton type="credit_note" doc={{ ...creditNote, invoice: inv, client: inv.client }} label="PDF" className="sinv-receipt-download" />
                          {isSuperAdmin && (
                            <button type="button" className="finadj-action email" onClick={() => setCreditNoteToEmail({ ...creditNote, invoice: inv, client: inv.client })}><i className="fas fa-envelope" /> Email</button>
                          )}
                          {isSuperAdmin && Number(creditNote.refundable_amount || 0) > 0 && (
                            <button type="button" className="finadj-action refund" onClick={() => setRefundCreditNote(creditNote)}><i className="fas fa-money-bill-transfer" /> Refund</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(inv.refunds || []).map((refund) => (
                      <div key={`refund-${refund.id}`} className="finadj-row refund">
                        <div className="finadj-icon"><i className="fas fa-money-bill-transfer" /></div>
                        <div className="finadj-detail"><strong>{refund.refund_number}</strong><p>Against {refund.credit_note_number} · {String(refund.payment_method).replaceAll('_', ' ')} · {new Date(refund.refund_date).toLocaleDateString('en-GB')}</p></div>
                        <div className="finadj-amount">- {formatCurrencyDecimals(refund.amount, inv.currency)}</div>
                        <span className="finadj-pill">{refund.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {inv.status === 'reversed' && (
                  <div className="finadj-reversal"><i className="fas fa-rotate-left" /><div><strong>Invoice Reversed</strong><p>{inv.reversal_reason} {inv.reversed_by?.name ? `— by ${inv.reversed_by.name}` : ''}</p></div></div>
                )}
              </motion.div>
            )}

            {/* ── Overdue Reminder History ── */}
            {inv.status !== 'draft' && (inv.status === 'overdue' || (inv.reminder_history?.length || 0) > 0) && (
              <motion.div className={`sinv-card theme-${theme}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}>
                <div className="sinv-payments-header">
                  <h3 className="sinv-card-title"><i className="fas fa-bell" /> Reminder History ({inv.reminder_history?.length || 0})</h3>
                  {canSendReminder && inv.status === 'overdue' && Number(inv.balance_due) > 0 && (
                    <button
                      className="sinv-add-payment-btn sinv-reminder-send"
                      onClick={() => setConfirm({ open: true, type: 'send-reminder', id: inv.id })}
                      type="button"
                    >
                      <i className="fas fa-paper-plane" /> Send Reminder
                    </button>
                  )}
                </div>
                {!inv.reminder_history?.length ? (
                  <div className="sinv-no-payments">
                    <i className="fas fa-bell-slash" />
                    <p>No reminder emails have been sent yet.</p>
                  </div>
                ) : (
                  <div className="sinv-reminder-list">
                    {inv.reminder_history.map((reminder) => (
                      <div key={reminder.id} className="sinv-reminder-row">
                        <span className={`sinv-reminder-status ${reminder.delivery_status}`}>
                          <i className={`fas ${reminder.delivery_status === 'sent' ? 'fa-check' : reminder.delivery_status === 'failed' ? 'fa-xmark' : 'fa-minus'}`} />
                        </span>
                        <div className="sinv-reminder-details">
                          <div>
                            <strong>{reminder.reminder_stage >= 3 ? 'Final / Follow-up Reminder' : `Reminder #${reminder.reminder_stage}`}</strong>
                            <span className={`sinv-reminder-pill ${reminder.delivery_status}`}>{reminder.delivery_status}</span>
                          </div>
                          <p>
                            {reminder.days_overdue} day(s) overdue · {reminder.recipient_email}
                            {' · '}
                            {reminder.trigger_source === 'scheduled' ? 'Automated run' : (reminder.sent_by_name || 'Manual send')}
                          </p>
                          {reminder.failure_reason && <small>{reminder.failure_reason}</small>}
                        </div>
                        <time>{new Date(reminder.attempted_at.replace(' ', 'T')).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Payment Requests ── */}
            {inv.status !== 'draft' && (
              <motion.div className={`sinv-card theme-${theme}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.21 }}>
                <div className="sinv-payments-header">
                  <h3 className="sinv-card-title"><i className="fas fa-link" /> Payment Requests ({inv.payment_links?.length || 0})</h3>
                  {payableStatuses.includes(inv.status) && canRecordPayment && (
                    <button className="sinv-add-payment-btn sinv-link-create" onClick={() => setPaymentLinkOpen(true)} type="button">
                      <i className="fas fa-plus" /> Create Request
                    </button>
                  )}
                </div>
                {!inv.payment_links?.length ? (
                  <div className="sinv-no-payments">
                    <i className="fas fa-link-slash" />
                    <p>No payment requests created yet. Use this for manual bank-payment instructions or Paystack checkout links.</p>
                  </div>
                ) : (
                  <div className="sinv-paylink-list">
                    {inv.payment_links.map((link) => (
                      <div key={link.id} className={`sinv-paylink-row ${link.status}`}>
                        <div className={`sinv-paylink-icon ${link.provider}`}>
                          <i className={`fas ${link.provider === 'paystack' ? 'fa-shield-halved' : 'fa-building-columns'}`} />
                        </div>
                        <div className="sinv-paylink-details">
                          <div className="sinv-paylink-top">
                            <span className="sinv-paylink-ref">{link.reference}</span>
                            <span className={`sinv-paylink-provider ${link.provider}`}>{link.provider}</span>
                            <span className={`sinv-paylink-status ${link.status}`}>{link.status_label || link.status}</span>
                          </div>
                          <div className="sinv-paylink-bottom">
                            <span>{formatCurrencyDecimals(link.amount, link.currency)}</span>
                            {link.expires_at && <span>Expires {new Date(String(link.expires_at).replace(' ', 'T')).toLocaleDateString('en-GB')}</span>}
                            {link.gateway_response && <span>{link.gateway_response}</span>}
                            {link.receipt_number && <span><i className="fas fa-receipt" /> {link.receipt_number}</span>}
                          </div>
                        </div>
                        <div className="sinv-paylink-actions">
                          {link.payment_url && (
                            <button type="button" title="Copy payment link" onClick={() => copyPaymentLink(link.payment_url)}>
                              <i className="fas fa-copy" /> Copy
                            </button>
                          )}
                          {link.payment_url && link.provider === 'paystack' && (
                            <button type="button" title="Open Paystack checkout" onClick={() => window.open(link.payment_url, '_blank', 'noopener,noreferrer')}>
                              <i className="fas fa-arrow-up-right-from-square" /> Open
                            </button>
                          )}
                          {['pending', 'processing'].includes(link.status) && canRecordPayment && (
                            <button type="button" onClick={() => setConfirm({ open: true, type: 'send-payment-link', id: link.id })}>
                              <i className="fas fa-envelope" /> Email
                            </button>
                          )}
                          {link.provider === 'paystack' && ['pending', 'processing', 'failed'].includes(link.status) && canRecordPayment && (
                            <button type="button" onClick={() => setConfirm({ open: true, type: 'verify-payment-link', id: link.id })}>
                              <i className="fas fa-shield-halved" /> Verify
                            </button>
                          )}
                          {['pending', 'processing'].includes(link.status) && canRecordPayment && (
                            <button className="danger" type="button" onClick={() => setConfirm({ open: true, type: 'cancel-payment-link', id: link.id })}>
                              <i className="fas fa-ban" /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Payment History ── */}
            {inv.status !== 'draft' && (
              <motion.div className={`sinv-card theme-${theme}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.22 }}>
                <div className="sinv-payments-header">
                  <h3 className="sinv-card-title"><i className="fas fa-money-bill-wave" /> Payment History ({inv.payments?.length || 0})</h3>
                  {payableStatuses.includes(inv.status) && canRecordPayment && (
                    <button className="sinv-add-payment-btn" onClick={() => setPaymentOpen(true)} type="button">
                      <i className="fas fa-plus" /> Record Payment
                    </button>
                  )}
                </div>
                {!inv.payments?.length ? (
                  <div className="sinv-no-payments">
                    <i className="fas fa-money-bill-slash" />
                    <p>No payments recorded yet.</p>
                  </div>
                ) : (
                  <div className="sinv-payments-list">
                    {inv.payments.map((pmt) => (
                      <div key={pmt.id} className="sinv-payment-row">
                        <div className="sinv-payment-method-icon">
                          <i className={`fas ${METHOD_ICONS[pmt.payment_method] || 'fa-money-bill'}`} />
                        </div>
                        <div className="sinv-payment-details">
                          <div className="sinv-payment-top">
                            <span className="sinv-payment-amount">{formatCurrencyDecimals(pmt.amount, inv.currency)}</span>
                            <span className="sinv-payment-method-label">{pmt.payment_method?.replace('_', ' ')}</span>
                            {pmt.reference && <span className="sinv-payment-ref"><i className="fas fa-hashtag" /> {pmt.reference}</span>}
                            {pmt.receipt && (
                              <span className="sinv-receipt-tag"><i className="fas fa-receipt" /> {pmt.receipt.receipt_number}</span>
                            )}
                          </div>
                          <div className="sinv-payment-bottom">
                            <span className="sinv-payment-date">{new Date(pmt.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="sinv-payment-by">by {pmt.recorded_by_name}</span>
                            {pmt.notes && <span className="sinv-payment-notes">{pmt.notes}</span>}
                          </div>
                        </div>
                        <div className="sinv-receipt-actions">
                          {pmt.receipt ? (
                            <>
                              <PDFDownloadButton type="receipt" doc={pmt.receipt} label="Receipt PDF" className="sinv-receipt-download" />
                              {canRecordPayment && (
                                <button
                                  className="sinv-receipt-email"
                                  type="button"
                                  title="Email receipt to client"
                                  onClick={() => setReceiptToEmail(pmt.receipt)}
                                >
                                  <i className="fas fa-envelope" /> Email
                                </button>
                              )}
                            </>
                          ) : canRecordPayment ? (
                            <button
                              className="sinv-receipt-issue"
                              type="button"
                              onClick={() => setConfirm({ open: true, type: 'issue-receipt', id: pmt.id })}
                            >
                              <i className="fas fa-receipt" /> Issue Receipt
                            </button>
                          ) : (
                            <span className="sinv-receipt-pending">No receipt issued</span>
                          )}
                          {isSuperAdmin && !pmt.receipt && (
                            <button className="sinv-payment-delete" title="Reverse payment" type="button"
                              onClick={() => setConfirm({ open: true, type: 'delete-payment', id: pmt.id })}>
                              <i className="fas fa-rotate-left" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </>)}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirm.type && confirmConfig[confirm.type] && (
        <ConfirmModal
          open={confirm.open}
          onClose={() => { setConfirm({ open: false, type: '', id: null }); setStockErrors([]); }}
          onConfirm={() => doAction(confirm.type)}
          title={confirmConfig[confirm.type].title}
          message={confirmConfig[confirm.type].msg}
          confirmText={confirmConfig[confirm.type].btn}
          variant={confirmConfig[confirm.type].variant}
          loading={actionLoading}
          extraContent={stockErrors.length > 0 ? (
            <div className="invt-stock-errors">
              <p className="invt-stock-errors-title"><i className="fas fa-triangle-exclamation" /> Insufficient stock:</p>
              {stockErrors.map((e, i) => <p key={i} className="invt-stock-error-item">{e}</p>)}
            </div>
          ) : null}
        />
      )}

      <CreditNoteModal open={creditNoteOpen} invoice={inv} onClose={() => setCreditNoteOpen(false)} onConfirm={doCreateCreditNote} loading={actionLoading} />

      <RefundModal open={Boolean(refundCreditNote)} creditNote={refundCreditNote} invoice={inv} onClose={() => setRefundCreditNote(null)} onConfirm={doProcessRefund} loading={actionLoading} />

      <ReverseInvoiceModal open={reverseOpen} invoiceNumber={inv?.invoice_number} onClose={() => setReverseOpen(false)} onConfirm={doReverseInvoice} loading={actionLoading} />

      <RecordPaymentModal open={paymentOpen} invoice={inv}
        onClose={() => setPaymentOpen(false)} onConfirm={doRecordPayment} loading={actionLoading} />

      <PaymentLinkModal open={paymentLinkOpen} invoice={inv}
        onClose={() => setPaymentLinkOpen(false)} onConfirm={doCreatePaymentLink} loading={actionLoading} />

      <SendToClientModal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSent={() => fetchSingleInvoice(inv.id)}
        documentType="invoice"
        documentNumber={inv?.invoice_number}
        documentId={inv?.id}
        documentData={inv}
        clientName={inv?.client?.company_name}
        clientEmail={inv?.client?.email}
      />

      <SendToClientModal
        open={Boolean(receiptToEmail)}
        onClose={() => setReceiptToEmail(null)}
        onSent={() => fetchSingleInvoice(inv.id)}
        documentType="receipt"
        documentNumber={receiptToEmail?.receipt_number}
        documentId={receiptToEmail?.id}
        documentData={receiptToEmail}
        clientName={receiptToEmail?.client?.company_name || inv?.client?.company_name}
        clientEmail={receiptToEmail?.client?.email || inv?.client?.email}
      />

      <SendToClientModal
        open={Boolean(creditNoteToEmail)}
        onClose={() => setCreditNoteToEmail(null)}
        onSent={() => fetchSingleInvoice(inv.id)}
        documentType="credit_note"
        documentNumber={creditNoteToEmail?.credit_note_number}
        documentId={creditNoteToEmail?.id}
        documentData={creditNoteToEmail}
        clientName={creditNoteToEmail?.client?.company_name || inv?.client?.company_name}
        clientEmail={creditNoteToEmail?.client?.email || inv?.client?.email}
      />
    </div>
  );
};

export default SingleInvoice;
