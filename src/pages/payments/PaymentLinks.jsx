// pages/payments/PaymentLinks.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import ConfirmModal from '../../components/modals/ConfirmModal';
import useThemeStore from '../../stores/useThemeStore';
import usePaymentStore from '../../stores/usePaymentStore';
import useToastStore from '../../stores/useToastStore';
import './PaymentLinks.css';

const PROVIDER_OPTIONS = [
  { value: '', label: 'All Providers' },
  { value: 'manual', label: 'Manual' },
  { value: 'paystack', label: 'Paystack' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const LIMIT_OPTIONS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

const providerIcon = { manual: 'fa-building-columns', paystack: 'fa-shield-halved' };
const statusClass = {
  pending: 'pending', processing: 'processing', paid: 'paid', failed: 'failed', expired: 'expired', cancelled: 'cancelled',
};

const fmt = (amount, currency = 'NGN') => {
  const symbol = currency === 'USD' ? '$' : '₦';
  return `${symbol}${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
};

const PaymentLinks = () => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [confirm, setConfirm] = useState({ open: false, type: '', link: null });
  const [actionLoading, setActionLoading] = useState(false);
  const searchRef = useRef(null);

  const {
    paymentLinks, paymentLinksMeta, paymentLinkFilters, paymentLinksLoading, paymentLinksError,
    fetchPaymentLinks, setPaymentLinkFilter, sendPaymentLink, cancelPaymentLink, verifyPaymentLink,
    downloadPaymentLinksExcel,
  } = usePaymentStore();

  useEffect(() => { fetchPaymentLinks(); }, [paymentLinkFilters]);
  useEffect(() => { setSearchInput(paymentLinkFilters.search || ''); }, []);
  useEffect(() => { document.title = 'Otelex | Payment Requests'; }, []);

  const submitSearch = useCallback(() => setPaymentLinkFilter('search', searchInput.trim()), [searchInput, setPaymentLinkFilter]);
  const clearSearch = () => { setSearchInput(''); setPaymentLinkFilter('search', ''); };

  const copyText = async (value, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(label, 'success');
    } catch {
      showToast('Could not copy to clipboard.', 'error');
    }
  };

  const runAction = async () => {
    if (!confirm.link) return;
    setActionLoading(true);
    try {
      let response;
      if (confirm.type === 'send') response = await sendPaymentLink(confirm.link.id);
      if (confirm.type === 'cancel') response = await cancelPaymentLink(confirm.link.id);
      if (confirm.type === 'verify') response = await verifyPaymentLink(confirm.link.id);
      showToast(response?.message || 'Action completed successfully.', 'success');
      setConfirm({ open: false, type: '', link: null });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = paymentLinksMeta?.total_pages || 1;
  const currentPage = paymentLinkFilters.page || 1;
  const pages = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i += 1) pages.push(i);

  const confirmContent = {
    send: { title: 'Send Payment Request', message: 'Email this payment request to the customer again?', text: 'Send Email', variant: 'primary' },
    cancel: { title: 'Cancel Payment Request', message: 'Cancel this unpaid payment request? The customer should no longer use the link afterwards.', text: 'Cancel Request', variant: 'danger' },
    verify: { title: 'Verify Paystack Payment', message: 'Check Paystack for the latest payment status. If paid, the invoice payment and receipt will be recorded.', text: 'Verify Now', variant: 'primary' },
  }[confirm.type];

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav
          pageTitle="Payment Requests"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Payments', to: '/payments' }, { label: 'Payment Requests', active: true }]}
        />

        <div className={`plink-wrapper theme-${theme}`}>
          <section className={`plink-hero theme-${theme}`}>
            <div>
              <span className="plink-kicker"><i className="fas fa-shield-halved" /> Manual + Paystack</span>
              <h1>Track every payment request safely</h1>
              <p>Create payment requests from invoice details, email customers, verify Paystack transactions, and keep manual payment instructions separate from received payments.</p>
            </div>
            <button type="button" className="plink-hero-btn" onClick={() => navigate('/invoices')}>
              <i className="fas fa-file-invoice" /> Go to Invoices
            </button>
          </section>

          <div className="plink-toolbar">
            <div className="plink-search-wrap">
              <i className="fas fa-magnifying-glass" />
              <input
                ref={searchRef}
                className={`plink-search theme-${theme}`}
                placeholder="Search invoice, client, reference..."
                value={searchInput}
                onChange={(event) => { setSearchInput(event.target.value); if (!event.target.value) clearSearch(); }}
                onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }}
              />
              {searchInput && <button type="button" onClick={clearSearch}><i className="fas fa-xmark" /></button>}
              <button type="button" onClick={submitSearch}><i className="fas fa-arrow-right" /></button>
            </div>
            <SelectInput options={PROVIDER_OPTIONS} value={paymentLinkFilters.provider} onChange={(value) => setPaymentLinkFilter('provider', value)} clearable />
            <SelectInput options={STATUS_OPTIONS} value={paymentLinkFilters.status} onChange={(value) => setPaymentLinkFilter('status', value)} clearable />
            <DatePicker value={paymentLinkFilters.from} onChange={(value) => setPaymentLinkFilter('from', value)} placeholder="From date" />
            <DatePicker value={paymentLinkFilters.to} onChange={(value) => setPaymentLinkFilter('to', value)} placeholder="To date" />
            <SelectInput options={LIMIT_OPTIONS} value={paymentLinkFilters.limit} onChange={(value) => setPaymentLinkFilter('limit', Number(value))} />
            <button className="plink-export" type="button" disabled={!paymentLinks.length} onClick={downloadPaymentLinksExcel}>
              <i className="fas fa-file-excel" /> Export
            </button>
          </div>

          <div className="plink-table-card">
            <table className="plink-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Invoice / Client</th>
                  <th>Provider</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="plink-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentLinksLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="plink-skeleton-row"><td colSpan="7"><div /></td></tr>
                  ))
                ) : paymentLinksError || !paymentLinks.length ? (
                  <tr><td colSpan="7" className="plink-empty-cell">
                    <div className={`plink-empty theme-${theme}`}>
                      <div><i className={`fas ${paymentLinksError ? 'fa-triangle-exclamation' : 'fa-link-slash'}`} /></div>
                      <h4>{paymentLinksError ? 'Failed to Load Requests' : 'No Payment Requests Found'}</h4>
                      <p>{paymentLinksError || 'Create a payment request from an active invoice details page.'}</p>
                      {paymentLinksError && <button type="button" onClick={fetchPaymentLinks}><i className="fas fa-rotate-right" /> Retry</button>}
                    </div>
                  </td></tr>
                ) : paymentLinks.map((link, idx) => (
                  <motion.tr key={link.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}>
                    <td>
                      <div className="plink-ref">{link.reference}</div>
                      {link.provider_reference && <small>{link.provider_reference}</small>}
                    </td>
                    <td>
                      <button type="button" className="plink-invoice-btn" onClick={() => navigate(`/invoices/${link.invoice_id}`)}>{link.invoice_number}</button>
                      <span>{link.client_name}</span>
                    </td>
                    <td><span className={`plink-provider ${link.provider}`}><i className={`fas ${providerIcon[link.provider] || 'fa-money-bill'}`} /> {link.provider}</span></td>
                    <td><strong className="plink-amount">{fmt(link.amount, link.currency)}</strong></td>
                    <td><span className={`plink-status ${statusClass[link.status] || ''}`}>{link.status_label || link.status}</span></td>
                    <td><span className="plink-date">{new Date(String(link.created_at).replace(' ', 'T')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></td>
                    <td>
                      <div className="plink-row-actions">
                        {link.payment_url && <button type="button" title="Copy payment link" onClick={() => copyText(link.payment_url, 'Payment link copied.')}><i className="fas fa-copy" /></button>}
                        {link.payment_url && link.provider === 'paystack' && <button type="button" title="Open checkout" onClick={() => window.open(link.payment_url, '_blank', 'noopener,noreferrer')}><i className="fas fa-arrow-up-right-from-square" /></button>}
                        {['pending', 'processing'].includes(link.status) && <button type="button" title="Email request" onClick={() => setConfirm({ open: true, type: 'send', link })}><i className="fas fa-envelope" /></button>}
                        {link.provider === 'paystack' && ['pending', 'processing', 'failed'].includes(link.status) && <button type="button" title="Verify" onClick={() => setConfirm({ open: true, type: 'verify', link })}><i className="fas fa-shield-halved" /></button>}
                        {['pending', 'processing'].includes(link.status) && <button type="button" title="Cancel" className="danger" onClick={() => setConfirm({ open: true, type: 'cancel', link })}><i className="fas fa-ban" /></button>}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="plink-pagination">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPaymentLinkFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
              {pages.map((page) => <button key={page} type="button" className={page === currentPage ? 'active' : ''} onClick={() => setPaymentLinkFilter('page', page)}>{page}</button>)}
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPaymentLinkFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
            </div>
          )}
        </div>
      </div>

      {confirmContent && (
        <ConfirmModal
          open={confirm.open}
          onClose={() => setConfirm({ open: false, type: '', link: null })}
          onConfirm={runAction}
          title={confirmContent.title}
          message={confirmContent.message}
          confirmText={confirmContent.text}
          variant={confirmContent.variant}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default PaymentLinks;
