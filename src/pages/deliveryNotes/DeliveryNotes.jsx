// pages/deliveryNotes/DeliveryNotes.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import useThemeStore from '../../stores/useThemeStore';
import useDeliveryNoteStore from '../../stores/useDeliveryNoteStore';
import './DeliveryNotes.css';
import '../invoices/Invoices.css';

const STATUS_META = {
  draft: { label: 'Draft', cls: 'draft', icon: 'fa-pen' },
  dispatched: { label: 'Dispatched', cls: 'dispatched', icon: 'fa-truck-fast' },
  delivered: { label: 'Delivered', cls: 'delivered', icon: 'fa-circle-check' },
  cancelled: { label: 'Cancelled', cls: 'cancelled', icon: 'fa-ban' },
};

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft', icon: 'fa-pen' },
  { value: 'dispatched', label: 'Dispatched', icon: 'fa-truck-fast' },
  { value: 'delivered', label: 'Delivered', icon: 'fa-circle-check' },
  { value: 'cancelled', label: 'Cancelled', icon: 'fa-ban' },
];

const SORT_OPTS = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'delivery_date', label: 'Delivery Date' },
  { value: 'dispatch_date', label: 'Dispatch Date' },
  { value: 'delivered_at', label: 'Delivered Date' },
  { value: 'delivery_note_number', label: 'Delivery Note #' },
];

const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

const statCards = [
  { key: 'total', label: 'Total', icon: 'fa-truck-ramp-box', g: ['#1a56db', '#1e3a8a'], glow: 'rgba(26,86,219,0.25)' },
  { key: 'draft', label: 'Drafts', icon: 'fa-pen', g: ['#64748b', '#475569'], glow: 'rgba(100,116,139,0.25)' },
  { key: 'dispatched', label: 'Dispatched', icon: 'fa-truck-fast', g: ['#3b82f6', '#2563eb'], glow: 'rgba(59,130,246,0.25)' },
  { key: 'delivered', label: 'Delivered', icon: 'fa-circle-check', g: ['#10b981', '#059669'], glow: 'rgba(16,185,129,0.25)' },
  { key: 'cancelled', label: 'Cancelled', icon: 'fa-ban', g: ['#6b7280', '#374151'], glow: 'rgba(107,114,128,0.25)' },
];

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(String(value).replace(' ', 'T')).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return <span className={`dn-status ${meta.cls}`}><i className={`fas ${meta.icon}`} /> {meta.label}</span>;
};

const SkeletonRow = () => (
  <tr className="invt-skel-row">
    {[...Array(8)].map((_, index) => <td key={index}><div className="invt-skel-cell" /></td>)}
  </tr>
);

const EmptyState = ({ error, theme, onRetry, onInvoices }) => (
  <div className={`invt-empty theme-${theme}`}>
    <div className={`invt-empty-icon ${error ? 'error-icon' : ''}`}>
      <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-truck-ramp-box'}`} />
    </div>
    <h4>{error ? 'Failed to Load Delivery Notes' : 'No Delivery Notes Found'}</h4>
    <p>{error || 'Delivery notes will appear here after they are created from finalized invoices.'}</p>
    <div className="invt-empty-actions">
      {error ? (
        <button className="invt-empty-btn primary" onClick={onRetry} type="button"><i className="fas fa-rotate-right" /> Retry</button>
      ) : (
        <button className="invt-empty-btn primary" onClick={onInvoices} type="button"><i className="fas fa-file-invoice" /> Go to Invoices</button>
      )}
    </div>
  </div>
);

const DeliveryNotes = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const {
    deliveryNotes,
    meta,
    filters,
    loading,
    error,
    stats,
    fetchDeliveryNotes,
    fetchStats,
    setFilter,
    downloadDeliveryNotesExcel,
  } = useDeliveryNoteStore();

  const [nav, setNav] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchRef = useRef(null);

  useEffect(() => { fetchDeliveryNotes(); }, [filters]);
  useEffect(() => { fetchStats(); document.title = 'Otelex | Delivery Notes'; }, []);

  const submitSearch = useCallback(() => setFilter('search', searchInput.trim()), [searchInput, setFilter]);
  const clearSearch = () => { setSearchInput(''); setFilter('search', ''); };

  const totalPages = meta?.total_pages || 1;
  const currentPage = filters.page || 1;
  const pageRange = () => {
    const pages = [];
    const delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i += 1) pages.push(i);
    return pages;
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Delivery Notes"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Delivery Notes', active: true }]}
        />

        <div className="inv-stats-grid">
          {statCards.map((card, index) => (
            <motion.div
              key={card.key}
              className="inv-stat-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
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

        <div className={`invt-wrapper theme-${theme}`}>
          <div className="invt-toolbar">
            <div className="invt-toolbar-left">
              <div className="invt-search-wrap">
                <i className="fas fa-magnifying-glass invt-search-icon" />
                <input
                  ref={searchRef}
                  className={`invt-search theme-${theme}`}
                  placeholder="Search delivery note, invoice, client..."
                  value={searchInput}
                  onChange={(event) => { setSearchInput(event.target.value); if (!event.target.value) clearSearch(); }}
                  onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }}
                />
                {searchInput && <button className="invt-search-clear" onClick={clearSearch} type="button"><i className="fas fa-xmark" /></button>}
                <button className="invt-search-go" onClick={submitSearch} type="button"><i className="fas fa-arrow-right" /></button>
              </div>
              <SelectInput options={STATUS_OPTS} value={filters.status} onChange={(value) => setFilter('status', value)} className="invt-filter-sel" clearable />
              <DatePicker value={filters.from} onChange={(value) => setFilter('from', value)} placeholder="From date" />
              <DatePicker value={filters.to} onChange={(value) => setFilter('to', value)} placeholder="To date" />
            </div>
            <div className="invt-toolbar-right">
              <SelectInput options={SORT_OPTS} value={filters.sortBy} onChange={(value) => setFilter('sortBy', value)} className="invt-filter-sel" />
              <SelectInput options={LIMIT_OPTS} value={filters.limit} onChange={(value) => setFilter('limit', Number(value))} className="invt-filter-sel" />
              <button className="invt-btn-dl" onClick={downloadDeliveryNotesExcel} type="button" disabled={!deliveryNotes.length} title="Export">
                <i className="fas fa-file-excel" /> Export
              </button>
              <button className="invt-btn-primary" onClick={() => navigate('/invoices')} type="button">
                <i className="fas fa-file-invoice" /> Create from Invoice
              </button>
            </div>
          </div>

          <div className="invt-table-wrap">
            <table className="invt-table">
              <thead>
                <tr>
                  <th className="invt-th">Delivery Note #</th>
                  <th className="invt-th">Invoice #</th>
                  <th className="invt-th">Client</th>
                  <th className="invt-th sortable" onClick={() => {
                    if (filters.sortBy === 'delivery_date') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                    else setFilter('sortBy', 'delivery_date');
                  }}>Delivery Date <i className={`fas fa-sort${filters.sortBy === 'delivery_date' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} invt-sort-icon`} /></th>
                  <th className="invt-th">Dispatch</th>
                  <th className="invt-th">Items / Qty</th>
                  <th className="invt-th">Status</th>
                  <th className="invt-th invt-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, index) => <SkeletonRow key={index} />)
                ) : error || deliveryNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                      <EmptyState error={error} theme={theme} onRetry={fetchDeliveryNotes} onInvoices={() => navigate('/invoices')} />
                    </td>
                  </tr>
                ) : (
                  deliveryNotes.map((note) => (
                    <tr key={note.id} className="invt-row">
                      <td>
                        <div className="invt-num-cell">
                          <button className="invt-num-link" onClick={() => navigate(`/delivery-notes/${note.id}`)} type="button">
                            {note.delivery_note_number}
                          </button>
                          <div className="invt-num-meta">
                            {note.driver_name && <span className="dn-meta-tag"><i className="fas fa-id-card" /> {note.driver_name}</span>}
                            {note.vehicle_number && <span className="dn-meta-tag"><i className="fas fa-truck" /> {note.vehicle_number}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <button className="invt-num-link" onClick={() => navigate(`/invoices/${note.invoice_id}`)} type="button">
                          {note.invoice_number}
                        </button>
                      </td>
                      <td><span className="invt-client">{note.client_name}</span></td>
                      <td><span className="invt-date">{formatDate(note.delivery_date)}</span></td>
                      <td>
                        <div className="invt-due-cell">
                          <span className="invt-date">{formatDate(note.dispatch_date)}</span>
                          {note.delivered_at && <span className="invt-days-overdue">Delivered {formatDate(note.delivered_at)}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="invt-amount-cell">
                          <span className="invt-total">{note.item_count || 0} item{Number(note.item_count || 0) === 1 ? '' : 's'}</span>
                          <span className="invt-disc">Qty: {Number(note.total_quantity || 0).toLocaleString('en-NG')}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={note.status} /></td>
                      <td>
                        <div className="invt-row-actions">
                          <button className="invt-action-btn view" title="View" onClick={() => navigate(`/delivery-notes/${note.id}`)} type="button">
                            <i className="fas fa-eye" />
                          </button>
                          <button className="invt-action-btn edit" title="View Invoice" onClick={() => navigate(`/invoices/${note.invoice_id}`)} type="button">
                            <i className="fas fa-file-invoice" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.total > 0 && (
            <div className={`invt-pagination theme-${theme}`}>
              <span className="invt-pag-info">
                Showing {((currentPage - 1) * filters.limit) + 1}–{Math.min(currentPage * filters.limit, meta.total)} of {meta.total} delivery notes
              </span>
              <div className="invt-pag-controls">
                <button className="invt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', 1)} type="button"><i className="fas fa-angles-left" /></button>
                <button className="invt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', currentPage - 1)} type="button"><i className="fas fa-chevron-left" /></button>
                {pageRange().map((page) => (
                  <button key={page} className={`invt-pag-btn ${page === currentPage ? 'is-active' : ''}`} onClick={() => setFilter('page', page)} type="button">{page}</button>
                ))}
                <button className="invt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', currentPage + 1)} type="button"><i className="fas fa-chevron-right" /></button>
                <button className="invt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', totalPages)} type="button"><i className="fas fa-angles-right" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryNotes;
