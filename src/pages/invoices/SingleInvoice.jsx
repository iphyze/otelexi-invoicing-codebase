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
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import ConfirmModal from '../../components/modals/ConfirmModal';
import CancelInvoiceModal from './CancelInvoiceModal';
import RecordPaymentModal from './RecordPaymentModal';
import './SingleInvoice.css';
import PDFDownloadButton from '../../components/pdf/PDFDownloadButton';

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'sinv-st-draft',     icon: 'fa-pen' },
  sent:      { label: 'Sent',      cls: 'sinv-st-sent',      icon: 'fa-paper-plane' },
  partial:   { label: 'Partial',   cls: 'sinv-st-partial',   icon: 'fa-circle-half-stroke' },
  paid:      { label: 'Paid',      cls: 'sinv-st-paid',      icon: 'fa-circle-check' },
  overdue:   { label: 'Overdue',   cls: 'sinv-st-overdue',   icon: 'fa-triangle-exclamation' },
  cancelled: { label: 'Cancelled', cls: 'sinv-st-cancelled', icon: 'fa-ban' },
};

const METHOD_ICONS = {
  bank_transfer: 'fa-building-columns',
  cash:          'fa-money-bills',
  pos:           'fa-credit-card',
  cheque:        'fa-file-invoice',
  online:        'fa-globe',
};

const fmt = (n, cur = 'NGN') => {
  const sym = cur === 'USD' ? '$' : '₦';
  return sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
};

const Skeleton = ({ theme }) => (
  <div className={`sinv-skeleton theme-${theme}`}>
    <div className="sinv-skel-hero">
      <div className="sinv-skel-block" style={{ width: '30%', height: 28 }} />
      <div className="sinv-skel-block" style={{ width: '20%', height: 18 }} />
    </div>
    {[...Array(5)].map((_, i) => <div key={i} className="sinv-skel-block" style={{ width: `${60 + i * 8}%`, height: 14, marginTop: 10 }} />)}
  </div>
);

const SingleInvoice = () => {
  const { id } = useParams();
  const navigate  = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const canRecordPayment = ['admin', 'accountant'].includes(user?.role);

  const { fetchSingleInvoice, selectedInvoice: invoice, singleLoading, finalizeInvoice, cancelInvoice, deleteInvoices } = useInvoiceStore();
  const { recordPayment, deletePayment } = usePaymentStore();

  const [nav, setNav] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, type: '', id: null });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);

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
          showToast('Invoice finalized. Stock deducted and status set to Sent.', 'success');
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

  const doCancel = async (reason) => {
    setActionLoading(true);
    try {
      const res = await cancelInvoice(id, reason);
      showToast('Invoice cancelled.', 'success');
      if (res.warnings?.length) res.warnings.forEach((w) => showToast(w, 'warning'));
      setCancelOpen(false);
      setRetryCount((c) => c + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel.', 'error');
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

  const confirmConfig = {
    finalize:       { title: 'Finalize Invoice',   msg: 'Check stock, deduct inventory and set invoice to Sent. This is an Admin-only action and cannot be undone.',  btn: 'Finalize & Send', variant: 'primary' },
    delete:         { title: 'Delete Invoice',     msg: 'Permanently delete this draft invoice? This cannot be undone.',                                               btn: 'Yes, Delete',     variant: 'danger' },
    'delete-payment': { title: 'Reverse Payment',  msg: 'Permanently reverse this payment and restore the invoice balance? This cannot be undone.',                   btn: 'Yes, Reverse',    variant: 'danger' },
  };

  // Progress bar for payments
  const paidPct = inv ? Math.min(100, (inv.amount_paid / inv.total_amount) * 100) : 0;

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
          {singleLoading && <Skeleton theme={theme} />}

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
                {inv.status === 'draft' && (
                  <>
                    <button className="sinv-act-btn primary" onClick={() => navigate(`/invoices/${id}/edit`)} type="button"><i className="fas fa-pen" /> Edit</button>
                    {isAdmin && (
                      <>
                        <button className="sinv-act-btn finalize" onClick={() => setConfirm({ open: true, type: 'finalize' })} type="button"><i className="fas fa-paper-plane" /> Finalize & Send</button>
                        <button className="sinv-act-btn danger"   onClick={() => setConfirm({ open: true, type: 'delete' })} type="button"><i className="fas fa-trash" /></button>
                      </>
                    )}
                  </>
                )}
                {payableStatuses.includes(inv.status) && canRecordPayment && (
                  <button className="sinv-act-btn payment" onClick={() => setPaymentOpen(true)} type="button">
                    <i className="fas fa-money-bill-wave" /> Record Payment
                  </button>
                )}
                {payableStatuses.includes(inv.status) && isAdmin && (
                  <button className="sinv-act-btn cancel" onClick={() => setCancelOpen(true)} type="button"><i className="fas fa-ban" /> Cancel</button>
                )}
                {/* ── PDF Download — always visible when invoice is loaded ── */}
                <PDFDownloadButton
                  type="invoice"
                  doc={inv}
                  label="Download PDF"
                />
              </div>
            </motion.div>

            {/* ── Payment progress bar ── */}
            {inv.status !== 'draft' && inv.status !== 'cancelled' && (
              <motion.div className={`sinv-progress-card theme-${theme}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
                <div className="sinv-progress-labels">
                  <span className="sinv-progress-paid"><i className="fas fa-check-circle" /> Paid: {fmt(inv.amount_paid, inv.currency)}</span>
                  <span className="sinv-progress-total">Total: {fmt(inv.total_amount, inv.currency)}</span>
                </div>
                <div className="sinv-progress-bar-wrap">
                  <div className="sinv-progress-bar" style={{ width: `${paidPct}%`, background: paidPct >= 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#1a56db,#3b82f6)' }} />
                </div>
                <div className="sinv-progress-balance">
                  <span>Balance Due:</span>
                  <span className={`sinv-balance-val ${inv.balance_due <= 0 ? 'sinv-bal-zero' : inv.status === 'overdue' ? 'sinv-bal-overdue' : ''}`}>
                    {fmt(inv.balance_due, inv.currency)}
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
                  <div className="sinv-total-row"><span>Subtotal</span><span>{fmt(inv.subtotal, inv.currency)}</span></div>
                  {inv.discount_amount > 0 && <div className="sinv-total-row sinv-disc-row"><span>Discount{inv.discount_type === 'percentage' ? ` (${inv.discount_value}%)` : ''}</span><span>-{fmt(inv.discount_amount, inv.currency)}</span></div>}
                  <div className="sinv-total-row"><span>Taxable Amount</span><span>{fmt(inv.taxable_amount, inv.currency)}</span></div>
                  <div className="sinv-total-row"><span>VAT</span><span>{fmt(inv.tax_amount, inv.currency)}</span></div>
                  <div className="sinv-total-divider" />
                  <div className="sinv-total-row sinv-total-grand"><span>Total</span><span>{fmt(inv.total_amount, inv.currency)}</span></div>
                  {inv.status !== 'draft' && (<>
                    <div className="sinv-total-row sinv-paid-row"><span>Amount Paid</span><span className="sinv-paid-val">{fmt(inv.amount_paid, inv.currency)}</span></div>
                    <div className="sinv-total-row sinv-total-balance"><span>Balance Due</span><span className={inv.balance_due <= 0 ? 'sinv-bal-zero' : ''}>{fmt(inv.balance_due, inv.currency)}</span></div>
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
                        <td className="sinv-num-col">{fmt(item.unit_price, inv.currency)}</td>
                        <td className="sinv-num-col">{item.discount_amount > 0 ? `-${fmt(item.discount_amount, inv.currency)}` : '—'}</td>
                        <td className="sinv-num-col">{item.tax_rate}%</td>
                        <td className="sinv-num-col">{fmt(item.tax_amount, inv.currency)}</td>
                        <td className="sinv-num-col sinv-line-total">{fmt(item.line_total, inv.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {inv.notes && <div className="sinv-notes"><i className="fas fa-note-sticky" /><p>{inv.notes}</p></div>}
              {inv.footer_text && <div className="sinv-footer-text"><i className="fas fa-circle-info" /><p>{inv.footer_text}</p></div>}
            </motion.div>

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
                            <span className="sinv-payment-amount">{fmt(pmt.amount, inv.currency)}</span>
                            <span className="sinv-payment-method-label">{pmt.payment_method?.replace('_', ' ')}</span>
                            {pmt.reference && <span className="sinv-payment-ref"><i className="fas fa-hashtag" /> {pmt.reference}</span>}
                          </div>
                          <div className="sinv-payment-bottom">
                            <span className="sinv-payment-date">{new Date(pmt.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="sinv-payment-by">by {pmt.recorded_by_name}</span>
                            {pmt.notes && <span className="sinv-payment-notes">{pmt.notes}</span>}
                          </div>
                        </div>
                        {isAdmin && (
                          <button className="sinv-payment-delete" title="Reverse payment" type="button"
                            onClick={() => setConfirm({ open: true, type: 'delete-payment', id: pmt.id })}>
                            <i className="fas fa-rotate-left" />
                          </button>
                        )}
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

      <CancelInvoiceModal open={cancelOpen} invoiceNumber={inv?.invoice_number}
        onClose={() => setCancelOpen(false)} onConfirm={doCancel} loading={actionLoading} />

      <RecordPaymentModal open={paymentOpen} invoice={inv}
        onClose={() => setPaymentOpen(false)} onConfirm={doRecordPayment} loading={actionLoading} />
    </div>
  );
};

export default SingleInvoice;
