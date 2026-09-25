// pages/proformas/Proformas.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useProformaStore from '../../stores/useProformaStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import ConfirmModal from '../../components/modals/ConfirmModal';
import MailProviderSelect from '../../components/mail/MailProviderSelect';
import RejectProformaModal from './RejectProformaModal';
import './Proformas.css';

// ── Status config ─────────────────────────────────────────────────
const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'pf-draft',     icon: 'fa-pen' },
  sent:      { label: 'Sent',      cls: 'pf-sent',      icon: 'fa-paper-plane' },
  approved:  { label: 'Approved',  cls: 'pf-approved',  icon: 'fa-circle-check' },
  rejected:  { label: 'Rejected',  cls: 'pf-rejected',  icon: 'fa-circle-xmark' },
  expired:   { label: 'Expired',   cls: 'pf-expired',   icon: 'fa-clock' },
  converted: { label: 'Converted', cls: 'pf-converted', icon: 'fa-arrows-turn-to-dots' },
};

const StatusBadge = ({ status, isExpired }) => {
  const s = isExpired ? STATUS_META.expired : (STATUS_META[status] || STATUS_META.draft);
  return (
    <span className={`pf-badge ${s.cls}`}>
      <i className={`fas ${s.icon}`} /> {s.label}
    </span>
  );
};

// ── Stat cards config ─────────────────────────────────────────────
const statCards = [
  { key: 'total',     label: 'Total',     icon: 'fa-file-circle-check',   g: ['#1a56db','#1e3a8a'], glow: 'rgba(26,86,219,0.25)' },
  { key: 'draft',     label: 'Drafts',    icon: 'fa-pen',                 g: ['#64748b','#475569'], glow: 'rgba(100,116,139,0.25)' },
  { key: 'sent',      label: 'Sent',      icon: 'fa-paper-plane',         g: ['#3b82f6','#2563eb'], glow: 'rgba(59,130,246,0.25)' },
  { key: 'approved',  label: 'Approved',  icon: 'fa-circle-check',        g: ['#10b981','#059669'], glow: 'rgba(16,185,129,0.25)' },
  { key: 'converted', label: 'Converted', icon: 'fa-arrows-turn-to-dots', g: ['#8b5cf6','#7c3aed'], glow: 'rgba(139,92,246,0.25)' },
  { key: 'expired',   label: 'Expired',   icon: 'fa-clock',               g: ['#f59e0b','#d97706'], glow: 'rgba(245,158,11,0.25)' },
];

const STATUS_OPTS = [
  { value: '',          label: 'All Statuses' },
  { value: 'draft',     label: 'Draft',     icon: 'fa-pen' },
  { value: 'sent',      label: 'Sent',      icon: 'fa-paper-plane' },
  { value: 'approved',  label: 'Approved',  icon: 'fa-circle-check' },
  { value: 'rejected',  label: 'Rejected',  icon: 'fa-circle-xmark' },
  { value: 'expired',   label: 'Expired',   icon: 'fa-clock' },
  { value: 'converted', label: 'Converted', icon: 'fa-arrows-turn-to-dots' },
];

const SORT_OPTS = [
  { value: 'created_at',   label: 'Date Added' },
  { value: 'issue_date',   label: 'Issue Date' },
  { value: 'total_amount', label: 'Total Amount' },
  { value: 'expiry_date',  label: 'Expiry Date' },
];

const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

// ── Skeleton ──────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="pft-skel-row">
    {[...Array(8)].map((_, i) => <td key={i}><div className="pft-skel-cell" /></td>)}
  </tr>
);

const EmptyState = ({ onNew, error, onRetry, theme }) => (
  <div className={`pft-empty theme-${theme}`}>
    <div className={`pft-empty-icon ${error ? 'error-icon' : ''}`}>
      <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-file-circle-check'}`} />
    </div>
    <h4>{error ? 'Failed to Load Proformas' : 'No Proforma Invoices Found'}</h4>
    <p>{error || 'No proformas match your filters. Create your first one.'}</p>
    <div className="pft-empty-actions">
      {error
        ? <button className="pft-empty-btn primary" onClick={onRetry}><i className="fas fa-rotate-right" /> Retry</button>
        : <button className="pft-empty-btn primary" onClick={onNew}><i className="fas fa-plus" /> New Proforma</button>
      }
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────
const Proformas = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  const {
    proformas, meta, filters, loading, error,
    selectedIds, stats,
    fetchProformas, setFilter, fetchStats,
    toggleSelect, toggleSelectAll, clearSelection,
    deleteProformas, sendProforma, approveProforma,
    rejectProforma, convertToInvoice,
    downloadProformasExcel,
  } = useProformaStore();

  const [nav, setNav] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, type: '', id: null, ids: [], mailProvider: 'system' });
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, number: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchRef = useRef(null);

  const submitSearch = useCallback(() => setFilter('search', searchInput.trim()), [searchInput]);
  const clearSearch = () => { setSearchInput(''); setFilter('search', ''); };

  useEffect(() => { fetchProformas(); }, [filters]);
  useEffect(() => { fetchStats(); document.title = 'Otelex | Proforma Invoices'; }, []);

  const handleAction = async (type, id) => {
    setActionLoading(true);
    try {
      switch (type) {
        case 'delete':
          await deleteProformas(confirm.ids);
          showToast(`${confirm.ids.length} proforma(s) deleted.`, 'success');
          break;
        case 'send':
          await sendProforma(id, confirm.mailProvider || 'system');
          showToast('Proforma PDF emailed successfully.', 'success');
          break;
        case 'approve':
          await approveProforma(id);
          showToast('Proforma approved.', 'success');
          break;
        case 'convert-invoice':
          await convertToInvoice(id);
          showToast('Converted to invoice successfully.', 'success');
          break;
      }
      setConfirm({ open: false, type: '', id: null, ids: [], mailProvider: 'system' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      await rejectProforma(rejectModal.id, reason);
      showToast('Proforma rejected.', 'success');
      setRejectModal({ open: false, id: null, number: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject proforma.', 'error');
    } finally { setActionLoading(false); }
  };

  const allIds = proformas.filter((p) => p.status === 'draft').map((p) => p.id);
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
    delete:           { title: 'Delete Proforma(s)',   msg: `Permanently delete ${confirm.ids?.length} draft proforma(s)?`,                   btn: 'Yes, Delete',       variant: 'danger' },
    send:             { title: 'Email Proforma PDF',    msg: 'Email this proforma as a PDF attachment to the client email on file? It will be marked as sent after successful delivery.', btn: 'Send with PDF', variant: 'primary' },
    approve:          { title: 'Approve Proforma',      msg: 'Mark this proforma as approved? You can then convert it to a final invoice.',     btn: 'Approve',           variant: 'success' },
    'convert-invoice':{ title: 'Convert to Invoice',   msg: 'Convert this approved proforma to a final invoice? Stock deducts on finalization.', btn: 'Convert to Invoice', variant: 'success' },
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Proforma Invoices"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Proformas', active: true }]}
        />

        {/* ── Stat Cards ── */}
        <div className="pf-stats-grid">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              className="pf-stat-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              onClick={() => setFilter('status', card.key === 'total' ? '' : card.key)}
              style={{ cursor: 'pointer' }}
            >
              <div className="pf-stat-icon" style={{
                background: `linear-gradient(135deg, ${card.g[0]}, ${card.g[1]})`,
                boxShadow: `0 6px 16px ${card.glow}`,
              }}>
                <i className={`fas ${card.icon}`} />
              </div>
              <div className="pf-stat-body">
                <p className="pf-stat-label">{card.label}</p>
                <h3 className="pf-stat-value">{stats[card.key] ?? '—'}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className={`pft-wrapper theme-${theme}`}>

          {/* Toolbar */}
          <div className="pft-toolbar">
            <div className="pft-toolbar-left">
              <div className="pft-search-wrap">
                <i className="fas fa-magnifying-glass pft-search-icon" />
                <input
                  ref={searchRef}
                  className={`pft-search theme-${theme}`}
                  placeholder="Search proforma #, client..."
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); if (!e.target.value) clearSearch(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                />
                {searchInput && (
                  <button className="pft-search-clear" onClick={clearSearch} type="button">
                    <i className="fas fa-xmark" />
                  </button>
                )}
                <button className="pft-search-go" onClick={submitSearch} type="button">
                  <i className="fas fa-arrow-right" />
                </button>
              </div>
              <SelectInput options={STATUS_OPTS} value={filters.status} onChange={(v) => setFilter('status', v)} className="pft-filter-sel" clearable />
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
            <div className="pft-toolbar-right">
              <SelectInput options={SORT_OPTS} value={filters.sortBy} onChange={(v) => setFilter('sortBy', v)} className="pft-filter-sel" />
              <SelectInput options={LIMIT_OPTS} value={filters.limit} onChange={(v) => setFilter('limit', Number(v))} className="pft-filter-sel" />
              <button className="pft-btn-dl" onClick={downloadProformasExcel} type="button" disabled={!proformas.length} title="Export">
                <i className="fas fa-file-excel" /> Export
              </button>
              <button className="pft-btn-primary" onClick={() => navigate('/proformas/new')} type="button">
                <i className="fas fa-plus" /> New Proforma
              </button>
            </div>
          </div>

          {/* Bulk bar */}
          {selectedIds.length > 0 && (
            <div className={`pft-bulk-bar theme-${theme}`}>
              <span className="pft-bulk-count"><i className="fas fa-square-check" /> {selectedIds.length} selected</span>
              <div className="pft-bulk-actions">
                <button className="pft-bulk-btn danger" onClick={() => setConfirm({ open: true, type: 'delete', ids: selectedIds })} type="button">
                  <i className="fas fa-trash" /> Delete
                </button>
                <button className="pft-bulk-btn neutral" onClick={clearSelection} type="button">
                  <i className="fas fa-xmark" /> Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="pft-table-wrap">
            <table className="pft-table">
              <thead>
                <tr>
                  <th className="pft-th pft-th-check">
                    <label className="pft-check-label">
                      <input type="checkbox" className="pft-check-input" checked={allSelected} onChange={() => toggleSelectAll(allIds)} />
                      <span className="pft-check-box" />
                    </label>
                  </th>
                  <th className="pft-th">Proforma #</th>
                  <th className="pft-th">Client</th>
                  <th className="pft-th sortable" onClick={() => {
                    if (filters.sortBy === 'issue_date') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'issue_date');
                  }}>
                    Issue Date <i className={`fas fa-sort${filters.sortBy === 'issue_date' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} pft-sort-icon`} />
                  </th>
                  <th className="pft-th">Expiry</th>
                  <th className="pft-th sortable" onClick={() => {
                    if (filters.sortBy === 'total_amount') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'total_amount');
                  }}>
                    Total <i className={`fas fa-sort${filters.sortBy === 'total_amount' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} pft-sort-icon`} />
                  </th>
                  <th className="pft-th">Status</th>
                  <th className="pft-th pft-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                ) : error || proformas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                      <EmptyState
                        error={error} theme={theme}
                        onNew={() => navigate('/proformas/new')}
                        onRetry={() => fetchProformas()}
                      />
                    </td>
                  </tr>
                ) : (
                  proformas.map((p) => (
                    <tr key={p.id} className={`pft-row ${selectedIds.includes(p.id) ? 'is-selected' : ''}`}>
                      <td>
                        {p.status === 'draft' && (
                          <label className="pft-check-label">
                            <input type="checkbox" className="pft-check-input"
                              checked={selectedIds.includes(p.id)}
                              onChange={() => toggleSelect(p.id)} />
                            <span className="pft-check-box" />
                          </label>
                        )}
                      </td>
                      <td>
                        <div className="pft-num-cell">
                          <button className="pft-num-link" onClick={() => navigate(`/proformas/${p.id}`)} type="button">
                            {p.proforma_number}
                          </button>
                          <div className="pft-num-meta">
                            <span className="pft-items-count">{p.item_count} item{p.item_count !== 1 ? 's' : ''}</span>
                            {p.quotation_number && (
                              <span className="pft-from-quote" title="Created from quotation">
                                <i className="fas fa-link" /> {p.quotation_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><span className="pft-client">{p.client_name}</span></td>
                      <td>
                        <span className="pft-date">
                          {new Date(p.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        <span className={`pft-date ${p.is_expired || (p.status === 'sent' && new Date(p.expiry_date) < new Date()) ? 'pft-date-expired' : ''}`}>
                          {new Date(p.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        <div className="pft-amount-cell">
                          <span className="pft-total">{fmt(p.total_amount, p.currency)}</span>
                          {p.discount_amount > 0 && (
                            <span className="pft-discount">-{fmt(p.discount_amount, p.currency)} disc.</span>
                          )}
                        </div>
                      </td>
                      <td><StatusBadge status={p.status} isExpired={p.is_expired} /></td>
                      <td>
                        <div className="pft-row-actions">
                          <button className="pft-action-btn view" title="View" onClick={() => navigate(`/proformas/${p.id}`)}>
                            <i className="fas fa-eye" />
                          </button>
                          {p.status === 'draft' && (
                            <>
                              <button className="pft-action-btn edit" title="Edit" onClick={() => navigate(`/proformas/${p.id}/edit`)}>
                                <i className="fas fa-pen" />
                              </button>
                              <button className="pft-action-btn send" title="Email PDF" onClick={() => setConfirm({ open: true, type: 'send', id: p.id })}>
                                <i className="fas fa-paper-plane" />
                              </button>
                              <button className="pft-action-btn delete" title="Delete" onClick={() => setConfirm({ open: true, type: 'delete', ids: [p.id] })}>
                                <i className="fas fa-trash" />
                              </button>
                            </>
                          )}
                          {p.status === 'sent' && !p.is_expired && (
                            <>
                              <button className="pft-action-btn approve" title="Approve" onClick={() => setConfirm({ open: true, type: 'approve', id: p.id })}>
                                <i className="fas fa-circle-check" />
                              </button>
                              <button className="pft-action-btn reject" title="Reject" onClick={() => setRejectModal({ open: true, id: p.id, number: p.proforma_number })}>
                                <i className="fas fa-circle-xmark" />
                              </button>
                            </>
                          )}
                          {p.status === 'approved' && (
                            <button className="pft-action-btn invoice" title="Convert to Invoice" onClick={() => setConfirm({ open: true, type: 'convert-invoice', id: p.id })}>
                              <i className="fas fa-file-invoice" />
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
            <div className={`pft-pagination theme-${theme}`}>
              <span className="pft-pag-info">
                Showing {((currentPage - 1) * filters.limit) + 1}–{Math.min(currentPage * filters.limit, meta.total)} of {meta.total} proformas
              </span>
              <div className="pft-pag-controls">
                <button className="pft-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', 1)}><i className="fas fa-angles-left" /></button>
                <button className="pft-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
                {pageRange().map((pg) => (
                  <button key={pg} className={`pft-pag-btn ${pg === currentPage ? 'is-active' : ''}`} onClick={() => setFilter('page', pg)}>{pg}</button>
                ))}
                <button className="pft-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
                <button className="pft-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', totalPages)}><i className="fas fa-angles-right" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {confirm.type && confirmConfig[confirm.type] && (
        <ConfirmModal
          open={confirm.open}
          onClose={() => setConfirm({ open: false, type: '', id: null, ids: [], mailProvider: 'system' })}
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

      <RejectProformaModal
        open={rejectModal.open}
        proformaNumber={rejectModal.number}
        onClose={() => setRejectModal({ open: false, id: null, number: '' })}
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </div>
  );
};

export default Proformas;
