// pages/customerPortal/CustomerPortalLinks.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import ConfirmModal from '../../components/modals/ConfirmModal';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import useCustomerPortalStore from '../../stores/useCustomerPortalStore';
import './CustomerPortalLinks.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
];

const LIMIT_OPTIONS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

const formatMoney = (amount, currency = 'NGN') => {
  const symbol = String(currency || 'NGN').toUpperCase() === 'USD' ? '$' : '₦';
  return `${symbol}${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const CustomerPortalLinks = () => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [confirm, setConfirm] = useState({ open: false, type: '', link: null });
  const [actionLoading, setActionLoading] = useState(false);

  const {
    links,
    meta,
    filters,
    loading,
    error,
    fetchLinks,
    setFilter,
    createCustomerPortalLink,
    sendCustomerPortalLink,
    revokeCustomerPortalLink,
    downloadLinksExcel,
  } = useCustomerPortalStore();

  useEffect(() => { document.title = 'Otelex | Customer Portal Links'; }, []);
  useEffect(() => { fetchLinks(); }, [filters]);
  useEffect(() => { setSearchInput(filters.search || ''); }, []);

  const submitSearch = useCallback(() => setFilter('search', searchInput.trim()), [searchInput, setFilter]);
  const clearSearch = () => { setSearchInput(''); setFilter('search', ''); };

  const copyFreshPortalLink = async (link) => {
    setActionLoading(true);
    try {
      const response = await createCustomerPortalLink(link.invoice_id, { expires_in_days: 30 });
      const url = response.data?.public_url;
      if (!url) throw new Error('Public URL was not returned. Check FRONTEND_URL in the backend .env file.');
      await navigator.clipboard.writeText(url);
      showToast('Fresh customer portal link copied to clipboard.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Could not copy customer portal link.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const runAction = async () => {
    if (!confirm.link) return;
    setActionLoading(true);
    try {
      let response;
      if (confirm.type === 'send') response = await sendCustomerPortalLink(confirm.link.id);
      if (confirm.type === 'revoke') response = await revokeCustomerPortalLink(confirm.link.id);
      showToast(response?.message || 'Action completed successfully.', 'success');
      setConfirm({ open: false, type: '', link: null });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = meta?.total_pages || 1;
  const currentPage = filters.page || 1;
  const pages = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i += 1) pages.push(i);

  const confirmContent = {
    send: {
      title: 'Email Customer Portal Link',
      message: 'Email a fresh secure portal link to this customer? The link will include their invoice, delivery notes, receipts and payment options.',
      text: 'Send Link',
      variant: 'primary',
    },
    revoke: {
      title: 'Revoke Customer Portal Link',
      message: 'Revoke this customer portal link immediately? The customer will no longer be able to use it.',
      text: 'Revoke Link',
      variant: 'danger',
    },
  }[confirm.type];

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav
          pageTitle="Customer Portal Links"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Payments', to: '/payments' }, { label: 'Customer Portal', active: true }]}
        />

        <div className={`cportal-wrapper theme-${theme}`}>
          <section className={`cportal-hero theme-${theme}`}>
            <div>
              <span className="cportal-kicker"><i className="fas fa-user-shield" /> Customer-facing portal</span>
              <h1>Share invoice progress without exposing staff access</h1>
              <p>Generate secure customer portal links for invoices so customers can view their invoice summary, delivery notes, receipts, and available payment options from one clean page.</p>
            </div>
            <button type="button" className="cportal-hero-btn" onClick={() => navigate('/invoices')}>
              <i className="fas fa-file-invoice" /> Go to Invoices
            </button>
          </section>

          <div className="cportal-toolbar">
            <div className="cportal-search-wrap">
              <i className="fas fa-magnifying-glass" />
              <input
                className={`cportal-search theme-${theme}`}
                placeholder="Search invoice, client, email, reference..."
                value={searchInput}
                onChange={(event) => { setSearchInput(event.target.value); if (!event.target.value) clearSearch(); }}
                onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }}
              />
              {searchInput && <button type="button" onClick={clearSearch} title="Clear search"><i className="fas fa-xmark" /></button>}
              <button type="button" onClick={submitSearch} title="Search"><i className="fas fa-arrow-right" /></button>
            </div>
            <SelectInput options={STATUS_OPTIONS} value={filters.status} onChange={(value) => setFilter('status', value)} clearable />
            <DatePicker value={filters.from} onChange={(value) => setFilter('from', value)} placeholder="From date" />
            <DatePicker value={filters.to} onChange={(value) => setFilter('to', value)} placeholder="To date" />
            <SelectInput options={LIMIT_OPTIONS} value={filters.limit} onChange={(value) => setFilter('limit', Number(value))} />
            <button className="cportal-export" type="button" disabled={!links.length} onClick={downloadLinksExcel}>
              <i className="fas fa-file-excel" /> Export
            </button>
          </div>

          <div className="cportal-table-card">
            <table className="cportal-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Invoice / Client</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Usage</th>
                  <th>Expires</th>
                  <th className="cportal-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="cportal-skeleton-row"><td colSpan="7"><div /></td></tr>
                  ))
                ) : error || !links.length ? (
                  <tr>
                    <td colSpan="7" className="cportal-empty-cell">
                      <div className={`cportal-empty theme-${theme}`}>
                        <div><i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-user-lock'}`} /></div>
                        <h4>{error ? 'Failed to Load Portal Links' : 'No Customer Portal Links Found'}</h4>
                        <p>{error || 'Open a finalized invoice and use “Customer Portal” to generate a customer-facing link.'}</p>
                        {error && <button type="button" onClick={fetchLinks}><i className="fas fa-rotate-right" /> Retry</button>}
                      </div>
                    </td>
                  </tr>
                ) : links.map((link, index) => (
                  <motion.tr key={link.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }}>
                    <td>
                      <div className="cportal-ref">{link.reference}</div>
                      <small>Created {formatDate(link.created_at)}</small>
                    </td>
                    <td>
                      <button type="button" className="cportal-invoice-btn" onClick={() => navigate(`/invoices/${link.invoice_id}`)}>{link.invoice_number}</button>
                      <span>{link.client_name}</span>
                      {link.client_email && <small>{link.client_email}</small>}
                    </td>
                    <td>
                      <strong className="cportal-amount">{formatMoney(link.balance_due, link.currency)}</strong>
                      <small>Total {formatMoney(link.invoice_total, link.currency)}</small>
                    </td>
                    <td><span className={`cportal-status ${link.status}`}>{link.status_label || link.status}</span></td>
                    <td>
                      <div className="cportal-usage">
                        <span><i className="fas fa-eye" /> {link.access_count || 0}</span>
                        <span><i className="fas fa-envelope" /> {link.email_count || 0}</span>
                      </div>
                      <small>{link.last_accessed_at ? `Last viewed ${formatDate(link.last_accessed_at)}` : 'Not viewed yet'}</small>
                    </td>
                    <td><span className="cportal-date">{formatDate(link.expires_at)}</span></td>
                    <td>
                      <div className="cportal-row-actions">
                        <button type="button" title="Generate and copy fresh portal link" disabled={actionLoading} onClick={() => copyFreshPortalLink(link)}><i className="fas fa-copy" /></button>
                        {link.status !== 'revoked' && <button type="button" title="Email fresh portal link" onClick={() => setConfirm({ open: true, type: 'send', link })}><i className="fas fa-envelope" /></button>}
                        {link.status === 'active' && <button type="button" title="Revoke portal link" className="danger" onClick={() => setConfirm({ open: true, type: 'revoke', link })}><i className="fas fa-ban" /></button>}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="cportal-pagination">
              <button type="button" disabled={currentPage <= 1} onClick={() => setFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
              {pages.map((page) => <button key={page} type="button" className={page === currentPage ? 'active' : ''} onClick={() => setFilter('page', page)}>{page}</button>)}
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
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

export default CustomerPortalLinks;
