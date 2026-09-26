// pages/proformas/SingleProforma.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useProformaStore from '../../stores/useProformaStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import ConfirmModal from '../../components/modals/ConfirmModal';
import SendToClientModal from '../../components/modals/SendToClientModal';
import RejectProformaModal from './RejectProformaModal';
import './SingleProforma.css';
import PDFDownloadButton from '../../components/pdf/PDFDownloadButton';
import { formatCurrencyDecimals, STATUS_META } from '../../utils/helper';
import Skeleton from '../../components/Sekeleton';


const proformaConversionMessage = (status) => {
  if (status === 'draft') {
    return 'This proforma is still in Draft and has not been emailed or approved. You can still convert it to a final invoice. No email will be sent. The proforma will be marked as converted. Stock will be deducted when the invoice is finalized.';
  }

  if (status === 'sent') {
    return 'This proforma has been sent but has not been approved. You can still convert it to a final invoice. No additional email will be sent. The proforma will be marked as converted. Stock will be deducted when the invoice is finalized.';
  }

  return 'Convert this proforma to a final invoice? The proforma will be marked as converted. Stock will be deducted when the invoice is finalized.';
};

const SingleProforma = () => {
  const { id } = useParams();
  const navigate  = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  const {
    fetchSingleProforma, selectedProforma: proforma, singleLoading,
    approveProforma, rejectProforma,
    deleteProformas, convertToInvoice,
  } = useProformaStore();

  const [nav, setNav] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, type: '' });
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  useEffect(() => {
    setFetchError(null);
    fetchSingleProforma(id).catch((err) => {
      setFetchError(err.response?.data?.message || 'Failed to load proforma.');
    });
  }, [id, retryCount]);

  useEffect(() => {
    document.title = proforma ? `Otelex | ${proforma.proforma_number}` : 'Otelex | Proforma';
  }, [proforma]);

  const p = proforma;
  const status     = p?.is_expired ? 'expired' : p?.status;
  const statusMeta = STATUS_META[status] || STATUS_META.draft;
  const isAdmin    = ['super_admin', 'admin'].includes(user?.role);
  const isMine     = p && (user?.id === p.created_by?.id || isAdmin);

  const doAction = async (type) => {
    setActionLoading(true);
    try {
      switch (type) {
        case 'approve': await approveProforma(id);         showToast('Proforma approved.', 'success'); break;
        case 'delete':
          await deleteProformas([Number(id)]);
          showToast('Proforma deleted.', 'success');
          navigate('/proformas');
          return;
        case 'convert-invoice': {
          const result = await convertToInvoice(id);
          const createdInvoice = result?.data?.invoice;
          showToast(
            createdInvoice?.invoice_number
              ? `${createdInvoice.invoice_number} created successfully.`
              : 'Converted to invoice successfully.',
            'success'
          );
          if (createdInvoice?.id) {
            setConfirm({ open: false, type: '' });
            navigate(`/invoices/${createdInvoice.id}`);
            return;
          }
          break;
        }
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
      await rejectProforma(id, reason);
      showToast('Proforma rejected.', 'success');
      setRejectOpen(false);
      setRetryCount((c) => c + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject.', 'error');
    } finally { setActionLoading(false); }
  };

  const confirmConfig = {
    approve:          { title: 'Approve Proforma',     msg: 'Mark this proforma as approved for workflow tracking? Approval is optional for conversion.',     btn: 'Approve',           variant: 'success' },
    delete:           { title: 'Delete Proforma',      msg: 'Permanently delete this draft proforma? This cannot be undone.',                  btn: 'Yes, Delete',       variant: 'danger' },
    'convert-invoice':{ title: 'Convert to Invoice',  msg: proformaConversionMessage(p?.status), btn: 'Convert to Invoice', variant: 'success' },
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle={p?.proforma_number || 'Proforma Details'}
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Proformas', to: '/proformas' },
            { label: p?.proforma_number || 'Details', active: true },
          ]}
        />

        <div className="sp-wrapper">
          {singleLoading && <Skeleton theme={theme} />}

          {fetchError && !singleLoading && (
            <div className={`sp-error theme-${theme}`}>
              <div className="sp-error-icon"><i className="fas fa-triangle-exclamation" /></div>
              <h4>Failed to Load Proforma</h4>
              <p>{fetchError}</p>
              <button className="sp-retry-btn" onClick={() => setRetryCount((c) => c + 1)} type="button">
                <i className="fas fa-rotate-right" /> Retry
              </button>
            </div>
          )}

          {p && !singleLoading && (
            <>
              {/* ── Hero ── */}
              <motion.div
                className={`sp-hero theme-${theme}`}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="sp-hero-left">
                  <div className="sp-hero-icon"><i className="fas fa-file-circle-check" /></div>
                  <div className="sp-hero-text">
                    <h1 className="sp-hero-num">{p.proforma_number}</h1>
                    <div className="sp-hero-meta">
                      <span className={`sp-status-badge ${statusMeta.cls}`}>
                        <i className={`fas ${statusMeta.icon}`} /> {statusMeta.label}
                      </span>
                      <span className="sp-hero-client"><i className="fas fa-building" /> {p.client?.company_name}</span>
                      <span className="sp-hero-date"><i className="fas fa-calendar" /> {new Date(p.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {p.quotation_number && (
                        <span className="sp-from-quote">
                          <i className="fas fa-link" /> From {p.quotation_number}
                        </span>
                      )}
                    </div>
                    {p.is_expired && (
                      <p className="sp-expired-notice"><i className="fas fa-triangle-exclamation" /> Expired on {p.expiry_date}</p>
                    )}
                  </div>
                </div>

                <div className="sp-hero-actions">

                  {/* ── PDF Download — always visible when proforma is loaded ── */}
                  {/* <PDFDownloadButton type="proforma" doc={p} label="Download PDF"/> */}
                
                <button className='pdf-dl-btn' type="button" onClick={() => navigate(`/proformas/${id}/preview`)}><i className="fas fa-file-pdf"/> Preview</button>

                  {p.status === 'draft' && isMine && (
                    <>
                      <button className="sp-act-btn primary" onClick={() => navigate(`/proformas/${id}/edit`)} type="button">
                        <i className="fas fa-pen" /> Edit
                      </button>
                      <button className="sp-act-btn send" onClick={() => setSendModalOpen(true)} type="button">
                        <i className="fas fa-paper-plane" /> Email PDF
                      </button>
                      <button className="sp-act-btn danger" onClick={() => setConfirm({ open: true, type: 'delete' })} type="button">
                        <i className="fas fa-trash" />
                      </button>
                    </>
                  )}
                  {['sent', 'approved'].includes(p.status) && isMine && (
                    <button className="sp-act-btn send" onClick={() => setSendModalOpen(true)} type="button">
                      <i className="fas fa-envelope" /> Email PDF
                    </button>
                  )}
                  {p.status === 'sent' && !p.is_expired && isMine && (
                    <>
                      <button className="sp-act-btn approve" onClick={() => setConfirm({ open: true, type: 'approve' })} type="button">
                        <i className="fas fa-circle-check" /> Approve
                      </button>
                      <button className="sp-act-btn reject" onClick={() => setRejectOpen(true)} type="button">
                        <i className="fas fa-circle-xmark" /> Reject
                      </button>
                    </>
                  )}
                  {!p.is_expired && ['draft', 'sent', 'approved'].includes(p.status) && isMine && (
                    <button className="sp-act-btn invoice" onClick={() => setConfirm({ open: true, type: 'convert-invoice' })} type="button">
                      <i className="fas fa-file-invoice" /> Convert to Invoice
                    </button>
                  )}
                  
                </div>

                {!p.is_expired && ['draft', 'sent', 'approved'].includes(p.status) && (
                  <div className={`sp-workflow-guide is-${p.status}`}>
                    <div className="sp-workflow-copy">
                      <span className="sp-workflow-label">Conversion options</span>
                      <strong>
                        {p.status === 'draft' && 'Conversion is available now. Emailing and approval are optional workflow actions.'}
                        {p.status === 'sent' && 'Conversion is available now. Approval remains optional for workflow tracking.'}
                        {p.status === 'approved' && 'Conversion is available now to a final invoice.'}
                      </strong>
                    </div>
                    <div className="sp-workflow-steps" aria-label="Proforma conversion options">
                      <span className={`sp-workflow-step ${['sent', 'approved'].includes(p.status) ? 'is-done' : ''}`}>
                        <i className="fas fa-paper-plane" /> {['sent', 'approved'].includes(p.status) ? 'Email sent' : 'Email PDF (optional)'}
                      </span>
                      <span className={`sp-workflow-step ${p.status === 'approved' ? 'is-done' : ''}`}>
                        <i className="fas fa-circle-check" /> {p.status === 'approved' ? 'Approved' : 'Approve (optional)'}
                      </span>
                      <span className="sp-workflow-step is-current">
                        <i className="fas fa-file-invoice" /> Convert to Invoice
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ── Two-column detail grid ── */}
              <div className="sp-grid">
                {/* Client & Dates */}
                <motion.div
                  className={`sp-card theme-${theme}`}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.07 }}
                >
                  <h3 className="sp-card-title"><i className="fas fa-address-card" /> Client & Dates</h3>
                  <div className="sp-info-list">
                    {[
                      { icon: 'fa-building',      label: 'Company',  value: p.client?.company_name },
                      { icon: 'fa-envelope',       label: 'Email',    value: p.client?.email },
                      { icon: 'fa-phone',          label: 'Phone',    value: p.client?.phone },
                      { icon: 'fa-location-dot',   label: 'Location', value: [p.client?.city, p.client?.state, p.client?.country].filter(Boolean).join(', ') },
                      { icon: 'fa-file-pen',       label: 'From Quote', value: p.quotation_number },
                      { icon: 'fa-calendar-plus',  label: 'Issued',   value: new Date(p.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                      { icon: 'fa-calendar-xmark', label: 'Expires',  value: new Date(p.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    ].map((row) => row.value ? (
                      <div key={row.label} className="sp-info-row">
                        <div className="sp-info-icon"><i className={`fas ${row.icon}`} /></div>
                        <div className="sp-info-body">
                          <span className="sp-info-label">{row.label}</span>
                          <span className="sp-info-value">{row.value}</span>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </motion.div>

                {/* Financial Summary */}
                <motion.div
                  className={`sp-card theme-${theme}`}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.12 }}
                >
                  <h3 className="sp-card-title"><i className="fas fa-receipt" /> Financial Summary</h3>
                  <div className="sp-totals">
                    <div className="sp-total-row"><span>Subtotal</span><span>{formatCurrencyDecimals(p.subtotal, p.currency)}</span></div>
                    {p.discount_amount > 0 && (
                      <div className="sp-total-row sp-disc-row">
                        <span>Discount{p.discount_type === 'percentage' ? ` (${p.discount_value}%)` : ''}</span>
                        <span>-{formatCurrencyDecimals(p.discount_amount, p.currency)}</span>
                      </div>
                    )}
                    <div className="sp-total-row"><span>Taxable Amount</span><span>{formatCurrencyDecimals(p.taxable_amount, p.currency)}</span></div>
                    <div className="sp-total-row"><span>VAT</span><span>{formatCurrencyDecimals(p.tax_amount, p.currency)}</span></div>
                    <div className="sp-total-divider" />
                    <div className="sp-total-row sp-total-grand"><span>Total</span><span>{formatCurrencyDecimals(p.total_amount, p.currency)}</span></div>
                    {p.currency === 'USD' && (
                      <p className="sp-exchange-note"><i className="fas fa-circle-info" /> Exchange rate: 1 USD = ₦{p.exchange_rate?.toLocaleString()}</p>
                    )}
                  </div>

                  <div className="sp-card-divider" />
                  <h3 className="sp-card-title"><i className="fas fa-clock" /> System Info</h3>
                  <div className="sp-info-list">
                    {[
                      { icon: 'fa-user',           label: 'Created By', value: p.created_by?.name },
                      { icon: 'fa-money-bill',     label: 'Currency',   value: p.currency },
                      { icon: 'fa-calendar-check', label: 'Created',    value: p.created_at ? new Date(p.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
                      { icon: 'fa-pen-to-square',  label: 'Updated',    value: p.updated_at ? new Date(p.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
                    ].map((row) => row.value ? (
                      <div key={row.label} className="sp-info-row">
                        <div className="sp-info-icon"><i className={`fas ${row.icon}`} /></div>
                        <div className="sp-info-body">
                          <span className="sp-info-label">{row.label}</span>
                          <span className="sp-info-value">{row.value}</span>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                </motion.div>
              </div>

              {/* ── Line Items ── */}
              <motion.div
                className={`sp-card theme-${theme} sp-items-card`}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.17 }}
              >
                <h3 className="sp-card-title"><i className="fas fa-list" /> Line Items ({p.items?.length})</h3>
                <div className="sp-items-table-wrap">
                  <table className="sp-items-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th className="sp-num-col">Qty</th>
                        <th className="sp-num-col">Unit Price</th>
                        <th className="sp-num-col">Discount</th>
                        <th className="sp-num-col">VAT %</th>
                        <th className="sp-num-col">VAT Amt</th>
                        <th className="sp-num-col">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items?.map((item, i) => (
                        <tr key={item.id}>
                          <td className="sp-item-num">{i + 1}</td>
                          <td>
                            <p className="sp-item-desc">{item.description}</p>
                            {item.product_sku && <p className="sp-item-sku">SKU: {item.product_sku}</p>}
                          </td>
                          <td className="sp-num-col">{item.quantity}</td>
                          <td className="sp-num-col">{formatCurrencyDecimals(item.unit_price, p.currency)}</td>
                          <td className="sp-num-col">{item.discount_amount > 0 ? `-${formatCurrencyDecimals(item.discount_amount, p.currency)}` : '—'}</td>
                          <td className="sp-num-col">{item.tax_rate}%</td>
                          <td className="sp-num-col">{formatCurrencyDecimals(item.tax_amount, p.currency)}</td>
                          <td className="sp-num-col sp-line-total">{formatCurrencyDecimals(item.line_total, p.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {p.notes && (
                  <div className="sp-notes">
                    <i className="fas fa-note-sticky" />
                    <p>{p.notes}</p>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>

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

      <RejectProformaModal
        open={rejectOpen}
        proformaNumber={p?.proforma_number}
        onClose={() => setRejectOpen(false)}
        onConfirm={doReject}
        loading={actionLoading}
      />

      <SendToClientModal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSent={() => setRetryCount((count) => count + 1)}
        documentType="proforma"
        documentNumber={p?.proforma_number}
        documentId={p?.id}
        documentData={p}
        clientName={p?.client?.company_name}
        clientEmail={p?.client?.email}
      />
    </div>
  );
};

export default SingleProforma;
