// pages/quotations/Quotations.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useQuotationStore from '../../stores/useQuotationStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import ConfirmModal from '../../components/modals/ConfirmModal';
import MailProviderSelect from '../../components/mail/MailProviderSelect';
import RejectModal from './RejectModal';
import './Quotations.css';

// ── Status config ─────────────────────────────────────────────────
const STATUS_META = {
  draft: { label: 'Draft', cls: 'qs-draft', icon: 'fa-pen' },
  sent: { label: 'Sent', cls: 'qs-sent', icon: 'fa-paper-plane' },
  accepted: { label: 'Accepted', cls: 'qs-accepted', icon: 'fa-circle-check' },
  rejected: { label: 'Rejected', cls: 'qs-rejected', icon: 'fa-circle-xmark' },
  expired: { label: 'Expired', cls: 'qs-expired', icon: 'fa-clock' },
  converted: { label: 'Converted', cls: 'qs-converted', icon: 'fa-arrows-turn-to-dots' },
};

const StatusBadge = ({ status, isExpired }) => {
  const s = isExpired ? STATUS_META.expired : (STATUS_META[status] || STATUS_META.draft);
  return (
    <span className={`qs-badge ${s.cls}`}>
      <i className={`fas ${s.icon}`} /> {s.label}
    </span>
  );
};

// ── Stat Cards ────────────────────────────────────────────────────
const statCards = [
  { key: 'total', label: 'Total', icon: 'fa-file-pen', g: ['#1a56db', '#1e3a8a'], glow: 'rgba(26,86,219,0.25)' },
  { key: 'draft', label: 'Drafts', icon: 'fa-pen', g: ['#64748b', '#475569'], glow: 'rgba(100,116,139,0.25)' },
  { key: 'sent', label: 'Sent', icon: 'fa-paper-plane', g: ['#3b82f6', '#2563eb'], glow: 'rgba(59,130,246,0.25)' },
  { key: 'accepted', label: 'Accepted', icon: 'fa-circle-check', g: ['#10b981', '#059669'], glow: 'rgba(16,185,129,0.25)' },
  { key: 'converted', label: 'Converted', icon: 'fa-arrows-turn-to-dots', g: ['#8b5cf6', '#7c3aed'], glow: 'rgba(139,92,246,0.25)' },
  { key: 'expired', label: 'Expired', icon: 'fa-clock', g: ['#f59e0b', '#d97706'], glow: 'rgba(245,158,11,0.25)' },
];

// ── Filters ───────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft', icon: 'fa-pen' },
  { value: 'sent', label: 'Sent', icon: 'fa-paper-plane' },
  { value: 'accepted', label: 'Accepted', icon: 'fa-circle-check' },
  { value: 'rejected', label: 'Rejected', icon: 'fa-circle-xmark' },
  { value: 'expired', label: 'Expired', icon: 'fa-clock' },
  { value: 'converted', label: 'Converted', icon: 'fa-arrows-turn-to-dots' },
];

const SORT_OPTS = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'issue_date', label: 'Issue Date' },
  { value: 'total_amount', label: 'Total Amount' },
  { value: 'expiry_date', label: 'Expiry Date' },
];

const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

// ── Skeleton ──────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="qt-skel-row">
    {[...Array(8)].map((_, i) => <td key={i}><div className="qt-skel-cell" /></td>)}
  </tr>
);

const EmptyState = ({ onNew, error, onRetry, theme }) => (
  <div className={`qt-empty theme-${theme}`}>
    <div className={`qt-empty-icon ${error ? 'error-icon' : ''}`}>
      <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-file-pen'}`} />
    </div>
    <h4>{error ? 'Failed to Load Quotations' : 'No Quotations Found'}</h4>
    <p>{error || 'No quotations match your filters. Create your first one.'}</p>
    <div className="qt-empty-actions">
      {error
        ? <button className="qt-empty-btn primary" onClick={onRetry}><i className="fas fa-rotate-right" /> Retry</button>
        : <button className="qt-empty-btn primary" onClick={onNew}><i className="fas fa-plus" /> New Quotation</button>
      }
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────
const Quotations = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  const {
    quotations, meta, filters, loading, error,
    selectedIds, stats,
    fetchQuotations, setFilter, fetchStats,
    toggleSelect, toggleSelectAll, clearSelection,
    deleteQuotations, sendQuotation, acceptQuotation,
    rejectQuotation, reopenQuotation,
    convertToProforma, convertToInvoice,
    downloadQuotationsExcel,
  } = useQuotationStore();

  const [nav, setNav] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, type: '', ids: [], id: null, mailProvider: 'system' });
  const [rejectOpen, setRejectOpen] = useState({ open: false, id: null, number: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchRef = useRef(null);

  const submitSearch = useCallback(() => setFilter('search', searchInput.trim()), [searchInput]);
  const clearSearch = () => { setSearchInput(''); setFilter('search', ''); };

  useEffect(() => { fetchQuotations(); }, [filters]);
  useEffect(() => { fetchStats(); document.title = 'Otelex | Quotations'; }, []);

  const handleAction = async (type, id, extra) => {
    setActionLoading(true);
    try {
      switch (type) {
        case 'delete':
          await deleteQuotations(confirm.ids);
          showToast(`${confirm.ids.length} quotation(s) deleted.`, 'success');
          break;
        case 'send':
          await sendQuotation(id, confirm.mailProvider || 'system');
          showToast('Quotation PDF emailed successfully.', 'success');
          break;
        case 'accept':
          await acceptQuotation(id);
          showToast('Quotation accepted.', 'success');
          break;
        case 'reopen':
          await reopenQuotation(id);
          showToast('Quotation reopened to draft.', 'success');
          break;
        case 'convert-proforma':
          await convertToProforma(id);
          showToast('Converted to proforma invoice.', 'success');
          break;
        case 'convert-invoice':
          await convertToInvoice(id);
          showToast('Converted to invoice.', 'success');
          break;
      }
      setConfirm({ open: false, type: '', ids: [], id: null, mailProvider: 'system' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      await rejectQuotation(rejectOpen.id, reason);
      showToast('Quotation rejected.', 'success');
      setRejectOpen({ open: false, id: null, number: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject quotation.', 'error');
    } finally { setActionLoading(false); }
  };

  const allIds = quotations.filter((q) => q.status === 'draft').map((q) => q.id);
  const allSelected = selectedIds.length === allIds.length && allIds.length > 0;
  const totalPages = meta?.total_pages || 1;
  const currentPage = filters.page;

  const pageRange = () => {
    const pages = [], delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
    return pages;
  };

  const fmt = (n, cur = 'NGN') => {
    const sym = cur === 'USD' ? '$' : '₦';
    return sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  };

  const confirmConfig = {
    delete: { title: 'Delete Quotation(s)', msg: `Permanently delete ${confirm.ids?.length} draft quotation(s)?`, btn: 'Yes, Delete', variant: 'danger' },
    send: { title: 'Email Quotation PDF', msg: 'Email this quotation as a PDF attachment to the client email on file? It will be marked as sent after successful delivery.', btn: 'Send with PDF', variant: 'primary' },
    accept: { title: 'Accept Quotation', msg: 'Mark this quotation as accepted? You can then convert it to a proforma or invoice.', btn: 'Accept', variant: 'success' },
    reopen: { title: 'Reopen Quotation', msg: 'Reopen this rejected quotation back to draft for editing?', btn: 'Reopen', variant: 'warning' },
    'convert-proforma': { title: 'Convert to Proforma', msg: 'Convert this accepted quotation to a proforma invoice? The quotation will be marked as converted.', btn: 'Convert to Proforma', variant: 'primary' },
    'convert-invoice': { title: 'Convert to Invoice', msg: 'Convert this accepted quotation directly to a final invoice? Stock will be deducted when the invoice is finalized.', btn: 'Convert to Invoice', variant: 'success' },
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Quotations"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Quotations', active: true }]}
        />

        {/* ── Stat Cards ── */}
        <div className="qt-stats-grid">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              className="qt-stat-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              onClick={() => setFilter('status', card.key === 'total' ? '' : card.key)}
              style={{ cursor: 'pointer' }}
            >
              <div className="qt-stat-icon" style={{ background: `linear-gradient(135deg, ${card.g[0]}, ${card.g[1]})`, boxShadow: `0 6px 16px ${card.glow}` }}>
                <i className={`fas ${card.icon}`} />
              </div>
              <div className="qt-stat-body">
                <p className="qt-stat-label">{card.label}</p>
                <h3 className="qt-stat-value">{stats[card.key] ?? '—'}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className={`qt-wrapper theme-${theme}`}>

          {/* Toolbar */}
          <div className="qt-toolbar">
            <div className="qt-toolbar-left">
              <div className="qt-search-wrap">
                <i className="fas fa-magnifying-glass qt-search-icon" />
                <input
                  ref={searchRef}
                  className={`qt-search theme-${theme}`}
                  placeholder="Search quotation #, client..."
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); if (!e.target.value) clearSearch(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                />
                {searchInput && (
                  <button className="qt-search-clear" onClick={clearSearch} type="button">
                    <i className="fas fa-xmark" />
                  </button>
                )}
                <button className="qt-search-go" onClick={submitSearch} type="button">
                  <i className="fas fa-arrow-right" />
                </button>
              </div>
              <SelectInput options={STATUS_OPTS} value={filters.status} onChange={(v) => setFilter('status', v)} className="qt-filter-sel" clearable />
              <DatePicker
                value={filters.from}
                onChange={(v) => setFilter('from', v)}
                placeholder="From date"
              />
              <DatePicker
                value={filters.to}
                onChange={(v) => setFilter('to', v)}
                placeholder="To date"
              />
            </div>
            <div className="qt-toolbar-right">
              <SelectInput options={SORT_OPTS} value={filters.sortBy} onChange={(v) => setFilter('sortBy', v)} className="qt-filter-sel" />
              <SelectInput options={LIMIT_OPTS} value={filters.limit} onChange={(v) => setFilter('limit', Number(v))} className="qt-filter-sel" />
              <button className="qt-btn-dl" onClick={downloadQuotationsExcel} type="button" disabled={!quotations.length} title="Export">
                <i className="fas fa-file-excel" /> Export
              </button>
              <button className="qt-btn-primary" onClick={() => navigate('/quotations/new')} type="button">
                <i className="fas fa-plus" /> New Quotation
              </button>
            </div>
          </div>

          {/* Bulk bar */}
          {selectedIds.length > 0 && (
            <div className={`qt-bulk-bar theme-${theme}`}>
              <span className="qt-bulk-count"><i className="fas fa-square-check" /> {selectedIds.length} selected</span>
              <div className="qt-bulk-actions">
                <button className="qt-bulk-btn danger" onClick={() => setConfirm({ open: true, type: 'delete', ids: selectedIds })} type="button">
                  <i className="fas fa-trash" /> Delete
                </button>
                <button className="qt-bulk-btn neutral" onClick={clearSelection} type="button">
                  <i className="fas fa-xmark" /> Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="qt-table-wrap">
            <table className="qt-table">
              <thead>
                <tr>
                  <th className="qt-th qt-th-check">
                    <label className="qt-check-label">
                      <input type="checkbox" className="qt-check-input" checked={allSelected} onChange={() => toggleSelectAll(allIds)} />
                      <span className="qt-check-box" />
                    </label>
                  </th>
                  <th className="qt-th">Quotation #</th>
                  <th className="qt-th">Client</th>
                  <th className="qt-th sortable" onClick={() => {
                    if (filters.sortBy === 'issue_date') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'issue_date');
                  }}>
                    Issue Date <i className={`fas fa-sort${filters.sortBy === 'issue_date' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} qt-sort-icon`} />
                  </th>
                  <th className="qt-th">Expiry</th>
                  <th className="qt-th sortable" onClick={() => {
                    if (filters.sortBy === 'total_amount') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'total_amount');
                  }}>
                    Total <i className={`fas fa-sort${filters.sortBy === 'total_amount' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} qt-sort-icon`} />
                  </th>
                  <th className="qt-th">Status</th>
                  <th className="qt-th qt-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                ) : error || quotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                      <EmptyState
                        error={error} theme={theme}
                        onNew={() => navigate('/quotations/new')}
                        onRetry={() => fetchQuotations()}
                      />
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className={`qt-row ${selectedIds.includes(q.id) ? 'is-selected' : ''}`}>
                      <td>
                        {q.status === 'draft' && (
                          <label className="qt-check-label">
                            <input type="checkbox" className="qt-check-input"
                              checked={selectedIds.includes(q.id)}
                              onChange={() => toggleSelect(q.id)} />
                            <span className="qt-check-box" />
                          </label>
                        )}
                      </td>
                      <td>
                        <div className="qt-num-cell">
                          <button className="qt-num-link" onClick={() => navigate(`/quotations/${q.id}`)} type="button">
                            {q.quotation_number}
                          </button>
                          <span className="qt-items-count">{q.item_count} item{q.item_count !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className="qt-client">{q.client_name}</span>
                      </td>
                      <td>
                        <span className="qt-date">{new Date(q.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </td>
                      <td>
                        <span className={`qt-date ${q.is_expired || (q.status === 'sent' && new Date(q.expiry_date) < new Date()) ? 'qt-date-expired' : ''}`}>
                          {new Date(q.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        <div className="qt-amount-cell">
                          <span className="qt-total">{fmt(q.total_amount, q.currency)}</span>
                          {q.discount_amount > 0 && (
                            <span className="qt-discount">-{fmt(q.discount_amount, q.currency)} disc.</span>
                          )}
                        </div>
                      </td>
                      <td><StatusBadge status={q.status} isExpired={q.is_expired} /></td>
                      <td>
                        <div className="qt-row-actions">
                          <button className="qt-action-btn view" title="View" onClick={() => navigate(`/quotations/${q.id}`)}>
                            <i className="fas fa-eye" />
                          </button>
                          {q.status === 'draft' && (
                            <>
                              <button className="qt-action-btn edit" title="Edit" onClick={() => navigate(`/quotations/${q.id}/edit`)}>
                                <i className="fas fa-pen" />
                              </button>
                              <button className="qt-action-btn send" title="Email PDF" onClick={() => setConfirm({ open: true, type: 'send', id: q.id })}>
                                <i className="fas fa-paper-plane" />
                              </button>
                              <button className="qt-action-btn delete" title="Delete" onClick={() => setConfirm({ open: true, type: 'delete', ids: [q.id] })}>
                                <i className="fas fa-trash" />
                              </button>
                            </>
                          )}
                          {q.status === 'sent' && (
                            <>
                              <button className="qt-action-btn accept" title="Accept" onClick={() => setConfirm({ open: true, type: 'accept', id: q.id })}>
                                <i className="fas fa-circle-check" />
                              </button>
                              <button className="qt-action-btn reject" title="Reject" onClick={() => setRejectOpen({ open: true, id: q.id, number: q.quotation_number })}>
                                <i className="fas fa-circle-xmark" />
                              </button>
                            </>
                          )}
                          {q.status === 'accepted' && (
                            <>
                              <button className="qt-action-btn proforma" title="Convert to Proforma" onClick={() => setConfirm({ open: true, type: 'convert-proforma', id: q.id })}>
                                <i className="fas fa-file-circle-check" />
                              </button>
                              <button className="qt-action-btn invoice" title="Convert to Invoice" onClick={() => setConfirm({ open: true, type: 'convert-invoice', id: q.id })}>
                                <i className="fas fa-file-invoice" />
                              </button>
                            </>
                          )}
                          {q.status === 'rejected' && (
                            <button className="qt-action-btn reopen" title="Reopen" onClick={() => setConfirm({ open: true, type: 'reopen', id: q.id })}>
                              <i className="fas fa-rotate-left" />
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
            <div className={`qt-pagination theme-${theme}`}>
              <span className="qt-pag-info">
                Showing {((currentPage - 1) * filters.limit) + 1}–{Math.min(currentPage * filters.limit, meta.total)} of {meta.total} quotations
              </span>
              <div className="qt-pag-controls">
                <button className="qt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', 1)}><i className="fas fa-angles-left" /></button>
                <button className="qt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
                {pageRange().map((p) => (
                  <button key={p} className={`qt-pag-btn ${p === currentPage ? 'is-active' : ''}`} onClick={() => setFilter('page', p)}>{p}</button>
                ))}
                <button className="qt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
                <button className="qt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', totalPages)}><i className="fas fa-angles-right" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {confirm.type && confirmConfig[confirm.type] && (
        <ConfirmModal
          open={confirm.open}
          onClose={() => setConfirm({ open: false, type: '', ids: [], id: null, mailProvider: 'system' })}
          onConfirm={() => handleAction(confirm.type, confirm.id)}
          title={confirmConfig[confirm.type].title}
          message={confirmConfig[confirm.type].msg}
          confirmText={confirmConfig[confirm.type].btn}
          variant={confirmConfig[confirm.type].variant}
          loading={actionLoading}
          extraContent={confirm.type === 'send' ? (
            <MailProviderSelect
              value={confirm.mailProvider || 'system'}
              onChange={(mailProvider) => setConfirm((current) => ({ ...current, mailProvider }))}
              disabled={actionLoading}
              compact
            />
          ) : null}
        />
      )}

      {/* ── Reject Modal ── */}
      <RejectModal
        open={rejectOpen.open}
        quotationNumber={rejectOpen.number}
        onClose={() => setRejectOpen({ open: false, id: null, number: '' })}
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </div>
  );
};

export default Quotations;