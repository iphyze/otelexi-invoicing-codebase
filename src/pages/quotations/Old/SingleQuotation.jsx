// pages/quotations/SingleQuotation.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useQuotationStore from '../../stores/useQuotationStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import ConfirmModal from '../../components/modals/ConfirmModal';
import RejectModal from './RejectModal';
import './SingleQuotation.css';

// ── Status config ─────────────────────────────────────────────────
const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'sq-st-draft',     icon: 'fa-pen' },
  sent:      { label: 'Sent',      cls: 'sq-st-sent',      icon: 'fa-paper-plane' },
  accepted:  { label: 'Accepted',  cls: 'sq-st-accepted',  icon: 'fa-circle-check' },
  rejected:  { label: 'Rejected',  cls: 'sq-st-rejected',  icon: 'fa-circle-xmark' },
  expired:   { label: 'Expired',   cls: 'sq-st-expired',   icon: 'fa-clock' },
  converted: { label: 'Converted', cls: 'sq-st-converted', icon: 'fa-arrows-turn-to-dots' },
};

const fmt = (n, cur = 'NGN') => {
  const sym = cur === 'USD' ? '$' : '₦';
  return sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
};

// ── Skeleton ──────────────────────────────────────────────────────
const Skeleton = ({ theme }) => (
  <div className={`sq-skeleton theme-${theme}`}>
    <div className="sq-skel-hero">
      <div className="sq-skel-block" style={{ width: '30%', height: 28 }} />
      <div className="sq-skel-block" style={{ width: '20%', height: 18 }} />
    </div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="sq-skel-block" style={{ width: `${60 + i * 8}%`, height: 14, marginTop: 10 }} />
    ))}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────
const SingleQuotation = () => {
  const { id } = useParams();
  const navigate  = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  const {
    fetchSingleQuotation, selectedQuotation: quotation, singleLoading,
    sendQuotation, acceptQuotation, rejectQuotation,
    reopenQuotation, deleteQuotations,
    convertToProforma, convertToInvoice,
  } = useQuotationStore();

  const [nav, setNav] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, type: '' });
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setFetchError(null);
    fetchSingleQuotation(id).catch((err) => {
      setFetchError(err.response?.data?.message || 'Failed to load quotation.');
    });
  }, [id, retryCount]);

  useEffect(() => {
    document.title = quotation ? `Otelex | ${quotation.quotation_number}` : 'Otelex | Quotation';
  }, [quotation]);

  const q = quotation;
  const status = q?.is_expired ? 'expired' : q?.status;
  const statusMeta = STATUS_META[status] || STATUS_META.draft;
  const isAdmin  = user?.role === 'admin';
  const isMine   = q && (user?.id === q.created_by?.id || isAdmin);

  const doAction = async (type, extra) => {
    setActionLoading(true);
    try {
      switch (type) {
        case 'send':    await sendQuotation(id);          showToast('Quotation sent.', 'success'); break;
        case 'accept':  await acceptQuotation(id);        showToast('Quotation accepted.', 'success'); break;
        case 'reopen':  await reopenQuotation(id);        showToast('Quotation reopened to draft.', 'success'); break;
        case 'delete':
          await deleteQuotations([Number(id)]);
          showToast('Quotation deleted.', 'success');
          navigate('/quotations');
          return;
        case 'convert-proforma':
          await convertToProforma(id);
          showToast('Converted to proforma invoice.', 'success');
          break;
        case 'convert-invoice':
          await convertToInvoice(id);
          showToast('Converted to invoice.', 'success');
          break;
      }
      setConfirm({ open: false, type: '' });
      setRetryCount((c) => c + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally { setActionLoading(false); }
  };

  const doReject = async (reason) => {
    setActionLoading(true);
    try {
      await rejectQuotation(id, reason);
      showToast('Quotation rejected.', 'success');
      setRejectOpen(false);
      setRetryCount((c) => c + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject.', 'error');
    } finally { setActionLoading(false); }
  };

  const confirmConfig = {
    send:    { title: 'Send Quotation',          msg: 'Mark this quotation as sent? It will be valid for 14 days.',                  btn: 'Send',              variant: 'primary' },
    accept:  { title: 'Accept Quotation',         msg: 'Accept this quotation? You can then convert it to a proforma or invoice.',    btn: 'Accept',            variant: 'success' },
    reopen:  { title: 'Reopen Quotation',         msg: 'Reopen this rejected quotation back to draft?',                              btn: 'Reopen',            variant: 'warning' },
    delete:  { title: 'Delete Quotation',         msg: 'Permanently delete this draft quotation? This cannot be undone.',            btn: 'Yes, Delete',       variant: 'danger' },
    'convert-proforma': { title: 'Convert to Proforma', msg: 'Convert to a proforma invoice? Quotation will be marked as converted.',  btn: 'Convert to Proforma', variant: 'primary' },
    'convert-invoice':  { title: 'Convert to Invoice',  msg: 'Convert directly to a final invoice? Stock will deduct when finalized.', btn: 'Convert to Invoice',  variant: 'success' },
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle={q?.quotation_number || 'Quotation Details'}
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Quotations', to: '/quotations' },
            { label: q?.quotation_number || 'Details', active: true },
          ]}
        />

        <div className="sq-wrapper">

          {/* Loading */}
          {singleLoading && <Skeleton theme={theme} />}

          {/* Error */}
          {fetchError && !singleLoading && (
            <div className={`sq-error theme-${theme}`}>
              <div className="sq-error-icon"><i className="fas fa-triangle-exclamation" /></div>
              <h4>Failed to Load Quotation</h4>
              <p>{fetchError}</p>
              <button onClick={() => setRetryCount((c) => c + 1)} type="button" className="sq-retry-btn">
                <i className="fas fa-rotate-right" /> Retry
              </button>
            </div>
          )}

          {/* Content */}
          {q && !singleLoading && (
            <>
              {/* ── Hero ── */}
              <motion.div
                className={`sq-hero theme-${theme}`}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="sq-hero-left">
                  <div className="sq-hero-icon"><i className="fas fa-file-pen" /></div>
                  <div className="sq-hero-text">
                    <h1 className="sq-hero-num">{q.quotation_number}</h1>
                    <div className="sq-hero-meta">
                      <span className={`sq-status-badge ${statusMeta.cls}`}>
                        <i className={`fas ${statusMeta.icon}`} /> {statusMeta.label}
                      </span>
                      <span className="sq-hero-client"><i className="fas fa-building" /> {q.client?.company_name}</span>
                      <span className="sq-hero-date"><i className="fas fa-calendar" /> {new Date(q.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    {q.is_expired && (
                      <p className="sq-expired-notice"><i className="fas fa-triangle-exclamation" /> This quotation expired on {q.expiry_date}</p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="sq-hero-actions">
                  {q.status === 'draft' && isMine && (
                    <>
                      <button className="sq-act-btn primary" onClick={() => navigate(`/quotations/${id}/edit`)} type="button">
                        <i className="fas fa-pen" /> Edit
                      </button>
                      <button className="sq-act-btn send" onClick={() => setConfirm({ open: true, type: 'send' })} type="button">
                        <i className="fas fa-paper-plane" /> Send
                      </button>
                    </>
                  )}
                  {q.status === 'sent' && !q.is_expired && isMine && (
                    <>
                      <button className="sq-act-btn accept" onClick={() => setConfirm({ open: true, type: 'accept' })} type="button">
                        <i className="fas fa-circle-check" /> Accept
                      </button>
                      <button className="sq-act-btn reject" onClick={() => setRejectOpen(true)} type="button">
                        <i className="fas fa-circle-xmark" /> Reject
                      </button>
                    </>
                  )}
                  {q.status === 'accepted' && isMine && (
                    <>
                      <button className="sq-act-btn proforma" onClick={() => setConfirm({ open: true, type: 'convert-proforma' })} type="button">
                        <i className="fas fa-file-circle-check" /> To Proforma
                      </button>
                      <button className="sq-act-btn invoice" onClick={() => setConfirm({ open: true, type: 'convert-invoice' })} type="button">
                        <i className="fas fa-file-invoice" /> To Invoice
                      </button>
                    </>
                  )}
                  {q.status === 'rejected' && isMine && (
                    <button className="sq-act-btn reopen" onClick={() => setConfirm({ open: true, type: 'reopen' })} type="button">
                      <i className="fas fa-rotate-left" /> Reopen
                    </button>
                  )}
                  {q.status === 'draft' && isMine && (
                    <button className="sq-act-btn danger" onClick={() => setConfirm({ open: true, type: 'delete' })} type="button">
                      <i className="fas fa-trash" />
                    </button>
                  )}
                </div>
              </motion.div>

              {/* ── Two-column grid ── */}
              <div className="sq-grid">

                {/* Client & Dates */}
                <motion.div
                  className={`sq-card theme-${theme}`}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.07 }}
                >
                  <h3 className="sq-card-title"><i className="fas fa-address-card" /> Client & Dates</h3>
                  <div className="sq-info-list">
                    {[
                      { icon: 'fa-building',       label: 'Company',  value: q.client?.company_name },
                      { icon: 'fa-envelope',        label: 'Email',    value: q.client?.email },
                      { icon: 'fa-phone',           label: 'Phone',    value: q.client?.phone },
                      { icon: 'fa-location-dot',    label: 'Location', value: [q.client?.city, q.client?.state, q.client?.country].filter(Boolean).join(', ') },
                      { icon: 'fa-calendar-plus',   label: 'Issued',   value: new Date(q.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                      { icon: 'fa-calendar-xmark',  label: 'Expires',  value: new Date(q.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    ].map((row) => row.value ? (
                      <div key={row.label} className="sq-info-row">
                        <div className="sq-info-icon"><i className={`fas ${row.icon}`} /></div>
                        <div className="sq-info-body">
                          <span className="sq-info-label">{row.label}</span>
                          <span className="sq-info-value">{row.value}</span>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </motion.div>

                {/* Financial Summary */}
                <motion.div
                  className={`sq-card theme-${theme}`}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.12 }}
                >
                  <h3 className="sq-card-title"><i className="fas fa-receipt" /> Financial Summary</h3>
                  <div className="sq-totals">
                    <div className="sq-total-row">
                      <span>Subtotal</span>
                      <span>{fmt(q.subtotal, q.currency)}</span>
                    </div>
                    {q.discount_amount > 0 && (
                      <div className="sq-total-row sq-disc-row">
                        <span>
                          Discount
                          {q.discount_type === 'percentage' && ` (${q.discount_value}%)`}
                        </span>
                        <span>-{fmt(q.discount_amount, q.currency)}</span>
                      </div>
                    )}
                    <div className="sq-total-row">
                      <span>Taxable Amount</span>
                      <span>{fmt(q.taxable_amount, q.currency)}</span>
                    </div>
                    <div className="sq-total-row">
                      <span>VAT</span>
                      <span>{fmt(q.tax_amount, q.currency)}</span>
                    </div>
                    <div className="sq-total-divider" />
                    <div className="sq-total-row sq-total-grand">
                      <span>Total</span>
                      <span>{fmt(q.total_amount, q.currency)}</span>
                    </div>
                    {q.currency === 'USD' && (
                      <p className="sq-exchange-note">
                        <i className="fas fa-circle-info" /> Exchange rate: 1 USD = ₦{q.exchange_rate?.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="sq-card-divider" />
                  <h3 className="sq-card-title"><i className="fas fa-clock" /> System Info</h3>
                  <div className="sq-info-list">
                    {[
                      { icon: 'fa-user',            label: 'Created By', value: q.created_by?.name },
                      { icon: 'fa-money-bill',      label: 'Currency',   value: q.currency },
                      { icon: 'fa-calendar-check',  label: 'Created',    value: q.created_at ? new Date(q.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
                      { icon: 'fa-pen-to-square',   label: 'Updated',    value: q.updated_at ? new Date(q.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
                    ].map((row) => row.value ? (
                      <div key={row.label} className="sq-info-row">
                        <div className="sq-info-icon"><i className={`fas ${row.icon}`} /></div>
                        <div className="sq-info-body">
                          <span className="sq-info-label">{row.label}</span>
                          <span className="sq-info-value">{row.value}</span>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </motion.div>
              </div>

              {/* ── Line Items Table ── */}
              <motion.div
                className={`sq-card theme-${theme} sq-items-card`}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.17 }}
              >
                <h3 className="sq-card-title"><i className="fas fa-list" /> Line Items ({q.items?.length})</h3>
                <div className="sq-items-table-wrap">
                  <table className="sq-items-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th className="sq-num-col">Qty</th>
                        <th className="sq-num-col">Unit Price</th>
                        <th className="sq-num-col">Discount</th>
                        <th className="sq-num-col">VAT %</th>
                        <th className="sq-num-col">VAT Amt</th>
                        <th className="sq-num-col">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.items?.map((item, i) => (
                        <tr key={item.id}>
                          <td className="sq-item-num">{i + 1}</td>
                          <td>
                            <p className="sq-item-desc">{item.description}</p>
                            {item.product_sku && (
                              <p className="sq-item-sku">SKU: {item.product_sku}</p>
                            )}
                          </td>
                          <td className="sq-num-col">{item.quantity}</td>
                          <td className="sq-num-col">{fmt(item.unit_price, q.currency)}</td>
                          <td className="sq-num-col">
                            {item.discount_amount > 0
                              ? `-${fmt(item.discount_amount, q.currency)}`
                              : '—'}
                          </td>
                          <td className="sq-num-col">{item.tax_rate}%</td>
                          <td className="sq-num-col">{fmt(item.tax_amount, q.currency)}</td>
                          <td className="sq-num-col sq-line-total">{fmt(item.line_total, q.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {q.notes && (
                  <div className="sq-notes">
                    <i className="fas fa-note-sticky" />
                    <p>{q.notes}</p>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {confirm.type && confirmConfig[confirm.type] && (
        <ConfirmModal
          open={confirm.open}
          onClose={() => setConfirm({ open: false, type: '' })}
          onConfirm={() => doAction(confirm.type)}
          title={confirmConfig[confirm.type].title}
          message={confirmConfig[confirm.type].msg}
          confirmText={confirmConfig[confirm.type].btn}
          variant={confirmConfig[confirm.type].variant}
          loading={actionLoading}
        />
      )}

      <RejectModal
        open={rejectOpen}
        quotationNumber={q?.quotation_number}
        onClose={() => setRejectOpen(false)}
        onConfirm={doReject}
        loading={actionLoading}
      />
    </div>
  );
};

export default SingleQuotation;
