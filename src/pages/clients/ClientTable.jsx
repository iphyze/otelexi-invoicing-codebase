// pages/clients/ClientTable.jsx
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useClientStore from '../../stores/useClientStore';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import SelectInput from '../../components/SelectInput';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { ClientFormModal, ContactFormModal } from './ClientModals';
import './ClientTable.css';

const STATUS_OPTS = [
  { value: 'active', label: 'Active', icon: 'fa-circle-check' },
  { value: 'inactive', label: 'Inactive', icon: 'fa-circle-xmark' },
];
const CURRENCY_OPTS = [
  { value: '', label: 'All Currencies' },
  { value: 'NGN', label: '₦ NGN' },
  { value: 'USD', label: '$ USD' },
];
const SORT_OPTS = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'company_name', label: 'Company Name' },
  { value: 'city', label: 'City' },
];
const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

const StatusBadge = ({ active }) => (
  <span className={`ct-badge ${active ? 'badge-active' : 'badge-inactive'}`}>
    <i className={`fas ${active ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const SkeletonRow = () => (
  <tr className="ct-skel-row">
    {[...Array(8)].map((_, i) => <td key={i}><div className="ct-skel-cell" /></td>)}
  </tr>
);

const EmptyState = ({ onNew, error, onRetry, theme, canManageClients }) => (
  <div className={`ct-empty theme-${theme}`}>
    <div className={`ct-empty-icon ${error ? 'error-icon' : ''}`}>
      <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-users'}`} />
    </div>
    <h4>{error ? 'Failed to Load Clients' : 'No Clients Found'}</h4>
    <p>{error || 'No clients match your current filters. Try adjusting your search or add a new client.'}</p>
    <div className="ct-empty-actions">
      {error
        ? <button className="ct-empty-btn primary" onClick={onRetry}><i className="fas fa-rotate-right" /> Retry</button>
        : canManageClients ? <button className="ct-empty-btn primary" onClick={onNew}><i className="fas fa-plus" /> Add New Client</button> : null
      }
    </div>
  </div>
);

const ClientTable = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const canManageClients = ['super_admin', 'admin', 'sales'].includes(user?.role);
  const canChangeClientStatus = ['super_admin', 'admin'].includes(user?.role);
  const canDeleteClients = user?.role === 'super_admin';

  const {
    clients, meta, filters, loading, error,
    selectedIds, fetchClients, setFilter,
    toggleSelect, toggleSelectAll, clearSelection,
    deleteClients, deactivateClients, reactivateClients,
    downloadClientsExcel,
  } = useClientStore();

  const [modal, setModal] = useState({ type: null, data: null });
  const [confirm, setConfirm] = useState({ open: false, type: '', ids: [] });
  const [actionLoading, setActionLoading] = useState(false);

  // ── Local search state (only sends on Enter or button click) ────
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchRef = useRef(null);

  const submitSearch = useCallback(() => {
    setFilter('search', searchInput.trim());
  }, [searchInput, setFilter]);

  const clearSearch = () => {
    setSearchInput('');
    setFilter('search', '');
  };

  // Fetch whenever filters change
  useEffect(() => { fetchClients(); }, [filters]);

  const handleRetry = useCallback(() => fetchClients(), []);

  // ── Confirm action handler ───────────────────────────────────────
  const handleConfirmAction = async () => {
    setActionLoading(true);
    try {
      if (confirm.type === 'delete') {
        await deleteClients(confirm.ids);
        showToast(`${confirm.ids.length} client(s) deleted.`, 'success');
      } else if (confirm.type === 'deactivate') {
        await deactivateClients(confirm.ids);
        showToast(`${confirm.ids.length} client(s) deactivated.`, 'success');
      } else if (confirm.type === 'reactivate') {
        await reactivateClients(confirm.ids);
        showToast(`${confirm.ids.length} client(s) reactivated.`, 'success');
      }
      setConfirm({ open: false, type: '', ids: [] });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed. Please try again.', 'error');
    } finally { setActionLoading(false); }
  };

  const allIds = clients.map((c) => c.id);
  const allSelected = selectedIds.length === allIds.length && allIds.length > 0;
  const totalPages = meta?.total_pages || 1;
  const currentPage = filters.page;

  const pageRange = () => {
    const pages = [], delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
    return pages;
  };

  return (
    <div className={`ct-wrapper theme-${theme}`}>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="ct-toolbar">
        <div className="ct-toolbar-left">

          <div className="ct-search-wrap">
            <i className="fas fa-magnifying-glass ct-search-icon" />
            <input
              ref={searchRef}
              className={`ct-search theme-${theme}`}
              type="text"
              placeholder="Search company, email, phone..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value.length === 0) clearSearch();
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
            />
            {searchInput && (
              <button className="ct-search-clear" onClick={clearSearch} type="button" title="Clear">
                <i className="fas fa-xmark" />
              </button>
            )}
            <button className="ct-search-go" onClick={submitSearch} type="button" title="Search">
              <i className="fas fa-arrow-right" />
            </button>
          </div>

          <SelectInput options={STATUS_OPTS} value={filters.status} onChange={(v) => setFilter('status', v)} className="ct-filter-select" />
          <SelectInput options={CURRENCY_OPTS} value={filters.currency} onChange={(v) => setFilter('currency', v)} className="ct-filter-select" clearable />
        </div>

        <div className="ct-toolbar-right">
          <SelectInput options={SORT_OPTS} value={filters.sortBy} onChange={(v) => setFilter('sortBy', v)} className="ct-filter-select" />
          <SelectInput options={LIMIT_OPTS} value={filters.limit} onChange={(v) => setFilter('limit', Number(v))} className="ct-filter-select" />
          <button
            className="ct-btn-download"
            onClick={() => downloadClientsExcel()}
            type="button"
            disabled={loading || clients.length === 0}
            title="Export to Excel"
          >
            <i className="fas fa-file-excel" /> Export
          </button>
          {canManageClients && (
            <button className="ct-btn-primary" onClick={() => setModal({ type: 'client', data: null })} type="button">
              <i className="fas fa-plus" /> New Client
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk bar ──────────────────────────────────────────────── */}
      {selectedIds.length > 0 && canChangeClientStatus && (
        <div className={`ct-bulk-bar theme-${theme}`}>
          <span className="ct-bulk-count"><i className="fas fa-square-check" /> {selectedIds.length} selected</span>
          <div className="ct-bulk-actions">
            {filters.status === 'inactive' ? (
              <button className="ct-bulk-btn success"
                onClick={() => setConfirm({ open: true, type: 'reactivate', ids: selectedIds })} type="button">
                <i className="fas fa-user-check" /> Reactivate
              </button>
            ) : (
              <button className="ct-bulk-btn warning"
                onClick={() => setConfirm({ open: true, type: 'deactivate', ids: selectedIds })} type="button">
                <i className="fas fa-user-slash" /> Deactivate
              </button>
            )}
            {canDeleteClients && <button className="ct-bulk-btn danger"
              onClick={() => setConfirm({ open: true, type: 'delete', ids: selectedIds })} type="button">
              <i className="fas fa-trash" /> Delete
            </button>}
            <button className="ct-bulk-btn neutral" onClick={clearSelection} type="button">
              <i className="fas fa-xmark" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="ct-table-wrap">
        <table className="ct-table">
          <thead>
            <tr>
              <th className="ct-th ct-th-check">
                {canChangeClientStatus && (
                  <label className="ct-check-label">
                    <input type="checkbox" className="ct-check-input"
                      checked={allSelected}
                      onChange={() => toggleSelectAll(allIds)} />
                    <span className="ct-check-box" />
                  </label>
                )}
              </th>
              <th className="ct-th sortable" onClick={() => {
                if (filters.sortBy === 'company_name') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                else setFilter('sortBy', 'company_name');
              }}>
                Company
                <i className={`fas fa-sort${filters.sortBy === 'company_name' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} ct-sort-icon`} />
              </th>
              <th className="ct-th">Contact</th>
              <th className="ct-th">Location</th>
              <th className="ct-th">Currency</th>
              <th className="ct-th">Terms</th>
              <th className="ct-th">Status</th>
              <th className="ct-th ct-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
            ) : error || clients.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                  <EmptyState
                    error={error} theme={theme}
                    canManageClients={canManageClients}
                    onNew={() => setModal({ type: 'client', data: null })}
                    onRetry={handleRetry}
                  />
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className={`ct-row ${selectedIds.includes(client.id) ? 'is-selected' : ''}`}>
                  <td>
                    {canChangeClientStatus && (
                      <label className="ct-check-label">
                        <input type="checkbox" className="ct-check-input"
                          checked={selectedIds.includes(client.id)}
                          onChange={() => toggleSelect(client.id)} />
                        <span className="ct-check-box" />
                      </label>
                    )}
                  </td>
                  <td>
                    <div className="ct-company">
                      <div className="ct-avatar">{client.company_name?.[0]?.toUpperCase()}</div>
                      <div>
                        <p className="ct-company-name">{client.company_name}</p>
                        {client.tax_id && <p className="ct-company-sub">TIN: {client.tax_id}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="ct-contact-cell">
                      {client.email && (
                        <a href={`mailto:${client.email}`} className="ct-contact-row">
                          <i className="fas fa-envelope" /> {client.email}
                        </a>
                      )}
                      {client.phone && (
                        <span className="ct-contact-row">
                          <i className="fas fa-phone" /> {client.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="ct-location">
                      <i className="fas fa-location-dot" />
                      {[client.city, client.state].filter(Boolean).join(', ')}
                    </span>
                  </td>
                  <td>
                    <span className="ct-currency-badge">
                      {client.currency === 'NGN' ? '₦' : '$'} {client.currency}
                    </span>
                  </td>
                  <td>
                    <span className="ct-terms">
                      {client.payment_terms === 'due_on_receipt' ? 'Due on Receipt' : 'Net 7'}
                    </span>
                  </td>
                  <td><StatusBadge active={client.is_active === 1} /></td>
                  <td>
                    <div className="ct-row-actions">
                      <button className="ct-action-btn view" title="View Details"
                        onClick={() => navigate(`/clients/${client.id}`)}>
                        <i className="fas fa-eye" />
                      </button>
                      {canManageClients && (
                        <>
                          <button className="ct-action-btn edit" title="Edit"
                            onClick={() => setModal({ type: 'client', data: client })}>
                            <i className="fas fa-pen" />
                          </button>
                          <button className="ct-action-btn contact" title="Add Contact"
                            onClick={() => setModal({ type: 'contact', data: { preselectedClientId: client.id } })}>
                            <i className="fas fa-user-plus" />
                          </button>
                        </>
                      )}
                      {canChangeClientStatus && (client.is_active === 1 ? (
                        <button className="ct-action-btn deactivate" title="Deactivate"
                          onClick={() => setConfirm({ open: true, type: 'deactivate', ids: [client.id] })}>
                          <i className="fas fa-user-slash" />
                        </button>
                      ) : (
                        <button className="ct-action-btn reactivate" title="Reactivate"
                          onClick={() => setConfirm({ open: true, type: 'reactivate', ids: [client.id] })}>
                          <i className="fas fa-user-check" />
                        </button>
                      ))}
                      {canDeleteClients && <button className="ct-action-btn delete" title="Delete"
                        onClick={() => setConfirm({ open: true, type: 'delete', ids: [client.id] })}>
                        <i className="fas fa-trash" />
                      </button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {meta && meta.total > 0 && (
        <div className={`ct-pagination theme-${theme}`}>
          <span className="ct-pag-info">
            Showing {((currentPage - 1) * filters.limit) + 1}–{Math.min(currentPage * filters.limit, meta.total)} of {meta.total} clients
          </span>
          <div className="ct-pag-controls">
            <button className="ct-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', 1)}><i className="fas fa-angles-left" /></button>
            <button className="ct-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
            {pageRange().map((p) => (
              <button key={p} className={`ct-pag-btn ${p === currentPage ? 'is-active' : ''}`} onClick={() => setFilter('page', p)}>{p}</button>
            ))}
            <button className="ct-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
            <button className="ct-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', totalPages)}><i className="fas fa-angles-right" /></button>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────── */}
      {canManageClients && (
        <>
          <ClientFormModal open={modal.type === 'client'} onClose={() => setModal({ type: null, data: null })} client={modal.data} />
          <ContactFormModal open={modal.type === 'contact'} onClose={() => setModal({ type: null, data: null })} preselectedClientId={modal.data?.preselectedClientId} />
        </>
      )}

      <ConfirmModal open={confirm.open && confirm.type === 'delete'} onClose={() => setConfirm({ open: false, type: '', ids: [] })}
        onConfirm={handleConfirmAction} title="Delete Client(s)"
        message={`Permanently delete ${confirm.ids?.length} client record(s)? This cannot be undone and will fail if the client has associated invoices or quotations.`}
        confirmText="Yes, Delete" variant="danger" loading={actionLoading} />

      <ConfirmModal open={confirm.open && confirm.type === 'deactivate'} onClose={() => setConfirm({ open: false, type: '', ids: [] })}
        onConfirm={handleConfirmAction} title="Deactivate Client(s)"
        message={`Deactivating ${confirm.ids?.length} client(s) will hide them from active use. Clients with outstanding invoices or active quotations cannot be deactivated.`}
        confirmText="Deactivate" variant="warning" loading={actionLoading} />

      <ConfirmModal open={confirm.open && confirm.type === 'reactivate'} onClose={() => setConfirm({ open: false, type: '', ids: [] })}
        onConfirm={handleConfirmAction} title="Reactivate Client(s)"
        message={`Reactivate ${confirm.ids?.length} client(s)? They will be visible and usable again.`}
        confirmText="Reactivate" variant="success" loading={actionLoading} />
    </div>
  );
};

export default ClientTable;