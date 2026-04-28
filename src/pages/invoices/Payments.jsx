// pages/invoices/Payments.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import usePaymentStore from '../../stores/usePaymentStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import ConfirmModal from '../../components/modals/ConfirmModal';
import './Payments.css';

const METHOD_OPTS = [
  { value: '',              label: 'All Methods' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'fa-building-columns' },
  { value: 'cash',          label: 'Cash',          icon: 'fa-money-bills' },
  { value: 'pos',           label: 'POS',           icon: 'fa-credit-card' },
  { value: 'cheque',        label: 'Cheque',        icon: 'fa-file-invoice' },
  { value: 'online',        label: 'Online',        icon: 'fa-globe' },
];
const SORT_OPTS = [
  { value: 'payment_date', label: 'Payment Date' },
  { value: 'amount',       label: 'Amount' },
  { value: 'created_at',   label: 'Date Recorded' },
];
const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];
const METHOD_ICONS = {
  bank_transfer: 'fa-building-columns',
  cash:          'fa-money-bills',
  pos:           'fa-credit-card',
  cheque:        'fa-file-invoice',
  online:        'fa-globe',
};
const STATUS_CLS = {
  draft: 'pm-st-draft', sent: 'pm-st-sent', partial: 'pm-st-partial',
  paid: 'pm-st-paid', overdue: 'pm-st-overdue', cancelled: 'pm-st-cancelled',
};

const fmt = (n, cur = 'NGN') => {
  const sym = cur === 'USD' ? '$' : '₦';
  return sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
};

const SkeletonRow = () => (
  <tr className="pmt-skel-row">
    {[...Array(7)].map((_, i) => <td key={i}><div className="pmt-skel-cell" /></td>)}
  </tr>
);

const Payments = () => {
  const { theme } = useThemeStore();
  const navigate  = useNavigate();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { payments, meta, filters, loading, error, fetchPayments, setFilter, deletePayment, downloadPaymentsExcel } = usePaymentStore();

  const [nav, setNav] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, id: null, amount: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchRef = useRef(null);

  useEffect(() => { fetchPayments(); }, [filters]);
  useEffect(() => { document.title = 'Otelex | Payments'; }, []);

  const submitSearch = useCallback(() => setFilter('search', searchInput.trim()), [searchInput]);
  const clearSearch  = () => { setSearchInput(''); setFilter('search', ''); };

  const handleReverse = async () => {
    setActionLoading(true);
    try {
      await deletePayment(confirm.id);
      showToast('Payment reversed and invoice balance restored.', 'success');
      setConfirm({ open: false, id: null, amount: null });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reverse payment.', 'error');
    } finally { setActionLoading(false); }
  };

  const totalPages  = meta?.total_pages || 1;
  const currentPage = filters.page;
  const pageRange   = () => {
    const pages = [], delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
    return pages;
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Payment History"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Invoices', to: '/invoices' }, { label: 'Payments', active: true }]}
        />

        <div className={`pmt-wrapper theme-${theme}`}>
          {/* Toolbar */}
          <div className="pmt-toolbar">
            <div className="pmt-toolbar-left">
              <div className="pmt-search-wrap">
                <i className="fas fa-magnifying-glass pmt-search-icon" />
                <input ref={searchRef} className={`pmt-search theme-${theme}`}
                  placeholder="Search invoice #, client, reference..."
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); if (!e.target.value) clearSearch(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                />
                {searchInput && <button className="pmt-search-clear" onClick={clearSearch} type="button"><i className="fas fa-xmark" /></button>}
                <button className="pmt-search-go" onClick={submitSearch} type="button"><i className="fas fa-arrow-right" /></button>
              </div>
              <SelectInput options={METHOD_OPTS} value={filters.payment_method} onChange={(v) => setFilter('payment_method', v)} className="pmt-filter-sel" clearable />
              <DatePicker value={filters.from} onChange={(v) => setFilter('from', v)} placeholder="From date" />
              <DatePicker value={filters.to}   onChange={(v) => setFilter('to', v)}   placeholder="To date" />
            </div>
            <div className="pmt-toolbar-right">
              <SelectInput options={SORT_OPTS}  value={filters.sortBy} onChange={(v) => setFilter('sortBy', v)} className="pmt-filter-sel" />
              <SelectInput options={LIMIT_OPTS} value={filters.limit}  onChange={(v) => setFilter('limit', Number(v))} className="pmt-filter-sel" />
              <button className="pmt-btn-dl" onClick={downloadPaymentsExcel} type="button" disabled={!payments.length} title="Export">
                <i className="fas fa-file-excel" /> Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="pmt-table-wrap">
            <table className="pmt-table">
              <thead>
                <tr>
                  <th className="pmt-th">Date</th>
                  <th className="pmt-th">Invoice #</th>
                  <th className="pmt-th">Client</th>
                  <th className="pmt-th">Method</th>
                  <th className="pmt-th sortable" onClick={() => {
                    if (filters.sortBy === 'amount') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'amount');
                  }}>Amount <i className={`fas fa-sort${filters.sortBy === 'amount' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} pmt-sort-icon`} /></th>
                  <th className="pmt-th">Invoice Status</th>
                  <th className="pmt-th">Recorded By</th>
                  {isAdmin && <th className="pmt-th pmt-th-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : error || !payments.length ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} style={{ padding: 0, border: 'none' }}>
                      <div className={`pmt-empty theme-${theme}`}>
                        <div className={`pmt-empty-icon ${error ? 'error-icon' : ''}`}>
                          <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-money-bill-slash'}`} />
                        </div>
                        <h4>{error ? 'Failed to Load Payments' : 'No Payments Found'}</h4>
                        <p>{error || 'No payments match your current filters.'}</p>
                        {error && <button className="pmt-empty-btn" onClick={fetchPayments}><i className="fas fa-rotate-right" /> Retry</button>}
                      </div>
                    </td>
                  </tr>
                ) : (
                  payments.map((pmt, idx) => (
                    <motion.tr key={pmt.id} className="pmt-row"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}>
                      <td>
                        <span className="pmt-date">{new Date(pmt.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </td>
                      <td>
                        <button className="pmt-inv-link" onClick={() => navigate(`/invoices/${pmt.invoice_id}`)} type="button">
                          {pmt.invoice_number}
                        </button>
                        {pmt.reference && <div className="pmt-ref"><i className="fas fa-hashtag" /> {pmt.reference}</div>}
                      </td>
                      <td><span className="pmt-client">{pmt.client_name}</span></td>
                      <td>
                        <span className="pmt-method">
                          <i className={`fas ${METHOD_ICONS[pmt.payment_method] || 'fa-money-bill'}`} />
                          {pmt.payment_method?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="pmt-amount">{fmt(pmt.amount, pmt.currency)}</span>
                        {pmt.notes && <div className="pmt-notes">{pmt.notes}</div>}
                      </td>
                      <td>
                        <span className={`pmt-status-badge ${STATUS_CLS[pmt.invoice_status] || ''}`}>
                          {pmt.invoice_status}
                        </span>
                      </td>
                      <td><span className="pmt-by">{pmt.recorded_by_name}</span></td>
                      {isAdmin && (
                        <td>
                          <button className="pmt-action-btn reverse" title="Reverse payment"
                            onClick={() => setConfirm({ open: true, id: pmt.id, amount: fmt(pmt.amount, pmt.currency) })}
                            type="button">
                            <i className="fas fa-rotate-left" />
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total > 0 && (
            <div className={`pmt-pagination theme-${theme}`}>
              <span className="pmt-pag-info">
                Showing {((currentPage - 1) * filters.limit) + 1}–{Math.min(currentPage * filters.limit, meta.total)} of {meta.total} payments
              </span>
              <div className="pmt-pag-controls">
                <button className="pmt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', 1)}><i className="fas fa-angles-left" /></button>
                <button className="pmt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
                {pageRange().map((pg) => (
                  <button key={pg} className={`pmt-pag-btn ${pg === currentPage ? 'is-active' : ''}`} onClick={() => setFilter('page', pg)}>{pg}</button>
                ))}
                <button className="pmt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
                <button className="pmt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', totalPages)}><i className="fas fa-angles-right" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null, amount: null })}
        onConfirm={handleReverse}
        title="Reverse Payment"
        message={`Permanently reverse the payment of ${confirm.amount} and restore the invoice balance? This cannot be undone.`}
        confirmText="Yes, Reverse"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default Payments;
