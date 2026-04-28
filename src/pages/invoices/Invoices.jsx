// pages/invoices/Invoices.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useInvoiceStore from '../../stores/useInvoiceStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import ConfirmModal from '../../components/modals/ConfirmModal';
import CancelInvoiceModal from './CancelInvoiceModal';
import './Invoices.css';

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'inv-draft',     icon: 'fa-pen' },
  sent:      { label: 'Sent',      cls: 'inv-sent',      icon: 'fa-paper-plane' },
  partial:   { label: 'Partial',   cls: 'inv-partial',   icon: 'fa-circle-half-stroke' },
  paid:      { label: 'Paid',      cls: 'inv-paid',      icon: 'fa-circle-check' },
  overdue:   { label: 'Overdue',   cls: 'inv-overdue',   icon: 'fa-triangle-exclamation' },
  cancelled: { label: 'Cancelled', cls: 'inv-cancelled', icon: 'fa-ban' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inv-badge ${s.cls}`}>
      <i className={`fas ${s.icon}`} /> {s.label}
    </span>
  );
};

const statCards = [
  { key: 'total',     label: 'Total',     icon: 'fa-file-invoice',            g: ['#1a56db','#1e3a8a'], glow: 'rgba(26,86,219,0.25)' },
  { key: 'draft',     label: 'Drafts',    icon: 'fa-pen',                     g: ['#64748b','#475569'], glow: 'rgba(100,116,139,0.25)' },
  { key: 'sent',      label: 'Sent',      icon: 'fa-paper-plane',             g: ['#3b82f6','#2563eb'], glow: 'rgba(59,130,246,0.25)' },
  { key: 'partial',   label: 'Partial',   icon: 'fa-circle-half-stroke',      g: ['#f59e0b','#d97706'], glow: 'rgba(245,158,11,0.25)' },
  { key: 'paid',      label: 'Paid',      icon: 'fa-circle-check',            g: ['#10b981','#059669'], glow: 'rgba(16,185,129,0.25)' },
  { key: 'overdue',   label: 'Overdue',   icon: 'fa-triangle-exclamation',    g: ['#ef4444','#dc2626'], glow: 'rgba(239,68,68,0.25)' },
];

const STATUS_OPTS = [
  { value: '',          label: 'All Statuses' },
  { value: 'draft',     label: 'Draft',     icon: 'fa-pen' },
  { value: 'sent',      label: 'Sent',      icon: 'fa-paper-plane' },
  { value: 'partial',   label: 'Partial',   icon: 'fa-circle-half-stroke' },
  { value: 'paid',      label: 'Paid',      icon: 'fa-circle-check' },
  { value: 'overdue',   label: 'Overdue',   icon: 'fa-triangle-exclamation' },
  { value: 'cancelled', label: 'Cancelled', icon: 'fa-ban' },
];

const SORT_OPTS = [
  { value: 'created_at',   label: 'Date Added' },
  { value: 'issue_date',   label: 'Issue Date' },
  { value: 'due_date',     label: 'Due Date' },
  { value: 'total_amount', label: 'Total Amount' },
  { value: 'balance_due',  label: 'Balance Due' },
];

const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

const SkeletonRow = () => (
  <tr className="invt-skel-row">
    {[...Array(9)].map((_, i) => <td key={i}><div className="invt-skel-cell" /></td>)}
  </tr>
);

const EmptyState = ({ onNew, error, onRetry, theme }) => (
  <div className={`invt-empty theme-${theme}`}>
    <div className={`invt-empty-icon ${error ? 'error-icon' : ''}`}>
      <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-file-invoice'}`} />
    </div>
    <h4>{error ? 'Failed to Load Invoices' : 'No Invoices Found'}</h4>
    <p>{error || 'No invoices match your filters. Create your first one.'}</p>
    <div className="invt-empty-actions">
      {error
        ? <button className="invt-empty-btn primary" onClick={onRetry}><i className="fas fa-rotate-right" /> Retry</button>
        : <button className="invt-empty-btn primary" onClick={onNew}><i className="fas fa-plus" /> New Invoice</button>
      }
    </div>
  </div>
);

const fmt = (n, cur = 'NGN') => {
  const sym = cur === 'USD' ? '$' : '₦';
  return sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
};

const Invoices = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const {
    invoices, meta, filters, loading, error, selectedIds, stats,
    fetchInvoices, setFilter, fetchStats,
    toggleSelect, toggleSelectAll, clearSelection,
    deleteInvoices, finalizeInvoice, cancelInvoice, markOverdue,
    downloadInvoicesExcel,
  } = useInvoiceStore();

  const [nav, setNav] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, type: '', id: null, ids: [] });
  const [cancelModal, setCancelModal] = useState({ open: false, id: null, number: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchRef = useRef(null);

  useEffect(() => { fetchInvoices(); }, [filters]);
  useEffect(() => { fetchStats(); document.title = 'Otelex | Invoices'; }, []);

  const submitSearch = useCallback(() => setFilter('search', searchInput.trim()), [searchInput]);
  const clearSearch = () => { setSearchInput(''); setFilter('search', ''); };

  const handleConfirmAction = async () => {
    setActionLoading(true);
    setStockErrors([]);
    try {
      switch (confirm.type) {
        case 'delete':
          await deleteInvoices(confirm.ids);
          showToast(`${confirm.ids.length} invoice(s) deleted.`, 'success');
          break;
        case 'finalize':
          await finalizeInvoice(confirm.id);
          showToast('Invoice finalized. Stock deducted and status set to Sent.', 'success');
          break;
        case 'mark-overdue':
          const res = await markOverdue();
          showToast(`Overdue run complete. ${res.data?.marked_overdue || 0} invoice(s) marked overdue.`, 'success');
          break;
      }
      setConfirm({ open: false, type: '', id: null, ids: [] });
    } catch (err) {
      // Special case: stock errors from finalize
      if (err.response?.data?.errors) {
        setStockErrors(err.response.data.errors);
      } else {
        showToast(err.response?.data?.message || 'Action failed.', 'error');
        setConfirm({ open: false, type: '', id: null, ids: [] });
      }
    } finally { setActionLoading(false); }
  };

  const handleCancel = async (reason) => {
    setActionLoading(true);
    try {
      const res = await cancelInvoice(cancelModal.id, reason);
      showToast('Invoice cancelled.', 'success');
      if (res.warnings?.length) {
        res.warnings.forEach((w) => showToast(w, 'warning'));
      }
      setCancelModal({ open: false, id: null, number: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel invoice.', 'error');
    } finally { setActionLoading(false); }
  };

  const allDraftIds = invoices.filter((inv) => inv.status === 'draft').map((inv) => inv.id);
  const totalPages = meta?.total_pages || 1;
  const currentPage = filters.page;

  const pageRange = () => {
    const pages = [], delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
    return pages;
  };

  const confirmConfig = {
    delete:       { title: 'Delete Invoice(s)',   msg: `Permanently delete ${confirm.ids?.length} draft invoice(s)? This cannot be undone.`,  btn: 'Yes, Delete',  variant: 'danger' },
    finalize:     { title: 'Finalize Invoice',    msg: 'This will check stock availability, deduct stock, and set the invoice to Sent. Admin-only action.',  btn: 'Finalize & Send',  variant: 'primary' },
    'mark-overdue': { title: 'Run Overdue Check', msg: 'Mark all past-due sent/partial invoices as overdue and process reminders?',           btn: 'Run Overdue',  variant: 'warning' },
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Invoices"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Invoices', active: true }]}
        />

        {/* ── Stat Cards ── */}
        <div className="inv-stats-grid">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              className="inv-stat-card"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              onClick={() => setFilter('status', card.key === 'total' ? '' : card.key)}
              style={{ cursor: 'pointer' }}
            >
              <div className="inv-stat-icon" style={{ background: `linear-gradient(135deg, ${card.g[0]}, ${card.g[1]})`, boxShadow: `0 6px 16px ${card.glow}` }}>
                <i className={`fas ${card.icon}`} />
              </div>
              <div className="inv-stat-body">
                <p className="inv-stat-label">{card.label}</p>
                <h3 className="inv-stat-value">{stats[card.key] ?? '—'}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div className={`invt-wrapper theme-${theme}`}>

          {/* Toolbar */}
          <div className="invt-toolbar">
            <div className="invt-toolbar-left">
              <div className="invt-search-wrap">
                <i className="fas fa-magnifying-glass invt-search-icon" />
                <input
                  ref={searchRef}
                  className={`invt-search theme-${theme}`}
                  placeholder="Search invoice #, client..."
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); if (!e.target.value) clearSearch(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                />
                {searchInput && (
                  <button className="invt-search-clear" onClick={clearSearch} type="button"><i className="fas fa-xmark" /></button>
                )}
                <button className="invt-search-go" onClick={submitSearch} type="button"><i className="fas fa-arrow-right" /></button>
              </div>
              <SelectInput options={STATUS_OPTS} value={filters.status} onChange={(v) => setFilter('status', v)} className="invt-filter-sel" clearable/>
              <DatePicker value={filters.from} onChange={(v) => setFilter('from', v)} placeholder="From date"/>
              <DatePicker value={filters.to}   onChange={(v) => setFilter('to', v)}   placeholder="To date" />
            </div>
            <div className="invt-toolbar-right">
              <SelectInput options={SORT_OPTS}  value={filters.sortBy}  onChange={(v) => setFilter('sortBy', v)}  className="invt-filter-sel" />
              <SelectInput options={LIMIT_OPTS} value={filters.limit}   onChange={(v) => setFilter('limit', Number(v))} className="invt-filter-sel" />
              {isAdmin && (
                <button className="invt-btn-overdue" onClick={() => setConfirm({ open: true, type: 'mark-overdue' })} type="button" title="Mark overdue invoices">
                  <i className="fas fa-triangle-exclamation" /> Overdue Run
                </button>
              )}
              <button className="invt-btn-dl" onClick={downloadInvoicesExcel} type="button" disabled={!invoices.length} title="Export">
                <i className="fas fa-file-excel" /> Export
              </button>
              <button className="invt-btn-primary" onClick={() => navigate('/invoices/new')} type="button">
                <i className="fas fa-plus" /> New Invoice
              </button>
            </div>
          </div>

          {/* Bulk bar */}
          {selectedIds.length > 0 && isAdmin && (
            <div className={`invt-bulk-bar theme-${theme}`}>
              <span className="invt-bulk-count"><i className="fas fa-square-check" /> {selectedIds.length} selected</span>
              <div className="invt-bulk-actions">
                <button className="invt-bulk-btn danger" onClick={() => setConfirm({ open: true, type: 'delete', ids: selectedIds })} type="button">
                  <i className="fas fa-trash" /> Delete
                </button>
                <button className="invt-bulk-btn neutral" onClick={clearSelection} type="button">
                  <i className="fas fa-xmark" /> Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="invt-table-wrap">
            <table className="invt-table">
              <thead>
                <tr>
                  <th className="invt-th invt-th-check">
                    {isAdmin && (
                      <label className="invt-check-label">
                        <input type="checkbox" className="invt-check-input"
                          checked={selectedIds.length === allDraftIds.length && allDraftIds.length > 0}
                          onChange={() => toggleSelectAll(allDraftIds)} />
                        <span className="invt-check-box" />
                      </label>
                    )}
                  </th>
                  <th className="invt-th">Invoice #</th>
                  <th className="invt-th">Client</th>
                  <th className="invt-th sortable" onClick={() => {
                    if (filters.sortBy === 'issue_date') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'issue_date');
                  }}>Issue Date <i className={`fas fa-sort${filters.sortBy === 'issue_date' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} invt-sort-icon`} /></th>
                  <th className="invt-th sortable" onClick={() => {
                    if (filters.sortBy === 'due_date') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'due_date');
                  }}>Due Date <i className={`fas fa-sort${filters.sortBy === 'due_date' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} invt-sort-icon`} /></th>
                  <th className="invt-th sortable" onClick={() => {
                    if (filters.sortBy === 'total_amount') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'total_amount');
                  }}>Total <i className={`fas fa-sort${filters.sortBy === 'total_amount' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} invt-sort-icon`} /></th>
                  <th className="invt-th">Balance Due</th>
                  <th className="invt-th">Status</th>
                  <th className="invt-th invt-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                ) : error || invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                      <EmptyState error={error} theme={theme} onNew={() => navigate('/invoices/new')} onRetry={fetchInvoices} />
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className={`invt-row ${selectedIds.includes(inv.id) ? 'is-selected' : ''} ${inv.is_overdue ? 'is-overdue' : ''}`}>
                      <td>
                        {isAdmin && inv.status === 'draft' && (
                          <label className="invt-check-label">
                            <input type="checkbox" className="invt-check-input"
                              checked={selectedIds.includes(inv.id)} onChange={() => toggleSelect(inv.id)} />
                            <span className="invt-check-box" />
                          </label>
                        )}
                      </td>
                      <td>
                        <div className="invt-num-cell">
                          <button className="invt-num-link" onClick={() => navigate(`/invoices/${inv.id}`)} type="button">
                            {inv.invoice_number}
                          </button>
                          <div className="invt-num-meta">
                            <span className="invt-items-count">{inv.item_count} item{inv.item_count !== 1 ? 's' : ''}</span>
                            {inv.payment_count > 0 && (
                              <span className="invt-pay-count"><i className="fas fa-money-bill" /> {inv.payment_count} payment{inv.payment_count !== 1 ? 's' : ''}</span>
                            )}
                            {inv.stock_deducted && <span className="invt-stock-tag"><i className="fas fa-box" /> Stock deducted</span>}
                          </div>
                        </div>
                      </td>
                      <td><span className="invt-client">{inv.client_name}</span></td>
                      <td><span className="invt-date">{new Date(inv.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></td>
                      <td>
                        <div className="invt-due-cell">
                          <span className={`invt-date ${inv.is_overdue || inv.status === 'overdue' ? 'invt-date-overdue' : ''}`}>
                            {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {(inv.is_overdue || inv.status === 'overdue') && inv.days_overdue > 0 && (
                            <span className="invt-days-overdue">{inv.days_overdue}d overdue</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="invt-amount-cell">
                          <span className="invt-total">{fmt(inv.total_amount, inv.currency)}</span>
                          {inv.discount_amount > 0 && <span className="invt-disc">-{fmt(inv.discount_amount, inv.currency)} disc.</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`invt-balance ${inv.balance_due <= 0 ? 'invt-balance-zero' : inv.status === 'overdue' ? 'invt-balance-overdue' : ''}`}>
                          {fmt(inv.balance_due, inv.currency)}
                        </span>
                      </td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td>
                        <div className="invt-row-actions">
                          <button className="invt-action-btn view" title="View" onClick={() => navigate(`/invoices/${inv.id}`)}>
                            <i className="fas fa-eye" />
                          </button>
                          {inv.status === 'draft' && (
                            <>
                              <button className="invt-action-btn edit" title="Edit" onClick={() => navigate(`/invoices/${inv.id}/edit`)}>
                                <i className="fas fa-pen" />
                              </button>
                              {isAdmin && (
                                <>
                                  <button className="invt-action-btn finalize" title="Finalize & Send" onClick={() => setConfirm({ open: true, type: 'finalize', id: inv.id })}>
                                    <i className="fas fa-paper-plane" />
                                  </button>
                                  <button className="invt-action-btn delete" title="Delete" onClick={() => setConfirm({ open: true, type: 'delete', ids: [inv.id] })}>
                                    <i className="fas fa-trash" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {['sent', 'partial', 'overdue'].includes(inv.status) && isAdmin && (
                            <button className="invt-action-btn cancel" title="Cancel Invoice" onClick={() => setCancelModal({ open: true, id: inv.id, number: inv.invoice_number })}>
                              <i className="fas fa-ban" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total > 0 && (
            <div className={`invt-pagination theme-${theme}`}>
              <span className="invt-pag-info">
                Showing {((currentPage - 1) * filters.limit) + 1}–{Math.min(currentPage * filters.limit, meta.total)} of {meta.total} invoices
              </span>
              <div className="invt-pag-controls">
                <button className="invt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', 1)}><i className="fas fa-angles-left" /></button>
                <button className="invt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
                {pageRange().map((pg) => (
                  <button key={pg} className={`invt-pag-btn ${pg === currentPage ? 'is-active' : ''}`} onClick={() => setFilter('page', pg)}>{pg}</button>
                ))}
                <button className="invt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
                <button className="invt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', totalPages)}><i className="fas fa-angles-right" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal — with stock error display for finalize */}
      {confirm.type && confirmConfig[confirm.type] && (
        <ConfirmModal
          open={confirm.open}
          onClose={() => { setConfirm({ open: false, type: '', id: null, ids: [] }); setStockErrors([]); }}
          onConfirm={handleConfirmAction}
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

      <CancelInvoiceModal
        open={cancelModal.open}
        invoiceNumber={cancelModal.number}
        onClose={() => setCancelModal({ open: false, id: null, number: '' })}
        onConfirm={handleCancel}
        loading={actionLoading}
      />
    </div>
  );
};

export default Invoices;
