// pages/products/ProductTable.jsx
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProductStore from '../../stores/useProductStore';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import SelectInput from '../../components/SelectInput';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { ProductFormModal } from './ProductModals';
import './ProductTable.css';

const STATUS_OPTS = [
  { value: 'active',   label: 'Active',   icon: 'fa-circle-check' },
  { value: 'inactive', label: 'Inactive', icon: 'fa-circle-xmark' },
];
const TAX_OPTS = [
  { value: '',       label: 'All Tax Types' },
  { value: 'vat',    label: 'VAT (7.5%)' },
  { value: 'exempt', label: 'Tax Exempt' },
];
const UOM_OPTS = [
  { value: '',        label: 'All Units' },
  { value: 'single',  label: 'Single' },
  { value: 'set',     label: 'Set' },
  { value: 'carton',  label: 'Carton' },
  { value: 'dozen',   label: 'Dozen' },
];
const SORT_OPTS = [
  { value: 'created_at',    label: 'Date Added' },
  { value: 'name',          label: 'Name' },
  { value: 'unit_price',    label: 'Unit Price' },
  { value: 'stock_quantity',label: 'Stock Qty' },
];
const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

// ── Stock Badge ─────────────────────────────────────────────────
const StockBadge = ({ status, qty }) => {
  const map = {
    in_stock:    { cls: 'stock-ok',  icon: 'fa-circle-check',       label: 'In Stock' },
    low_stock:   { cls: 'stock-low', icon: 'fa-triangle-exclamation', label: 'Low Stock' },
    out_of_stock:{ cls: 'stock-out', icon: 'fa-ban',                 label: 'Out of Stock' },
  };
  const { cls, icon, label } = map[status] || map['in_stock'];
  return (
    <div className={`pt-stock-wrap`}>
      <span className={`pt-stock-badge ${cls}`}>
        <i className={`fas ${icon}`} /> {label}
      </span>
      <span className="pt-stock-qty">{qty} units</span>
    </div>
  );
};

// ── Status Badge ────────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <span className={`pt-badge ${active ? 'badge-active' : 'badge-inactive'}`}>
    <i className={`fas ${active ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ── Skeleton ────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="pt-skel-row">
    {[...Array(9)].map((_, i) => (
      <td key={i}><div className="pt-skel-cell" /></td>
    ))}
  </tr>
);

// ── Empty State ─────────────────────────────────────────────────
const EmptyState = ({ onNew, error, onRetry, theme, canManage }) => (
  <div className={`pt-empty theme-${theme}`}>
    <div className={`pt-empty-icon ${error ? 'error-icon' : ''}`}>
      <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-boxes-stacked'}`} />
    </div>
    <h4>{error ? 'Failed to Load Products' : 'No Products Found'}</h4>
    <p>{error || 'No products match your current filters. Try adjusting your search or add a new product.'}</p>
    <div className="pt-empty-actions">
      {error
        ? <button className="pt-empty-btn primary" onClick={onRetry}><i className="fas fa-rotate-right" /> Retry</button>
        : canManage ? <button className="pt-empty-btn primary" onClick={onNew}><i className="fas fa-plus" /> Add New Product</button> : null
      }
    </div>
  </div>
);

// ── Main Component ──────────────────────────────────────────────
const ProductTable = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
  const canDelete = user?.role === 'super_admin';

  const {
    products, meta, filters, loading, error,
    selectedIds, fetchProducts, setFilter,
    toggleSelect, toggleSelectAll, clearSelection,
    deleteProducts, deactivateProducts,
    categoryOptions, fetchCategoryOptions,
    downloadProductsExcel,
  } = useProductStore();

  const [modal, setModal] = useState({ type: null, data: null });
  const [confirm, setConfirm] = useState({ open: false, type: '', ids: [] });
  const [actionLoading, setActionLoading] = useState(false);

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchRef = useRef(null);

  const submitSearch = useCallback(() => {
    setFilter('search', searchInput.trim());
  }, [searchInput, setFilter]);

  const clearSearch = () => {
    setSearchInput('');
    setFilter('search', '');
  };

  useEffect(() => { fetchProducts(); }, [filters]);
  useEffect(() => { fetchCategoryOptions(); }, []);

  const handleRetry = useCallback(() => fetchProducts(), []);

  // Build category options for filter dropdown
  const catFilterOpts = [
    { value: '', label: 'All Categories' },
    ...categoryOptions.map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleConfirmAction = async () => {
    setActionLoading(true);
    try {
      if (confirm.type === 'delete') {
        await deleteProducts(confirm.ids);
        showToast(`${confirm.ids.length} product(s) deleted.`, 'success');
      } else if (confirm.type === 'deactivate') {
        await deactivateProducts(confirm.ids);
        showToast(`${confirm.ids.length} product(s) deactivated.`, 'success');
      }
      setConfirm({ open: false, type: '', ids: [] });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed. Please try again.', 'error');
    } finally { setActionLoading(false); }
  };

  const allIds = products.map((p) => p.id);
  const allSelected = selectedIds.length === allIds.length && allIds.length > 0;
  const totalPages = meta?.total_pages || 1;
  const currentPage = filters.page;

  const pageRange = () => {
    const pages = [], delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
    return pages;
  };

  const uomLabel = (u) => ({ single: 'Single', set: 'Set', carton: 'Carton', dozen: 'Dozen' }[u] || u);

  return (
    <div className={`pt-wrapper theme-${theme}`}>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="pt-toolbar">
        <div className="pt-toolbar-left">
          <div className="pt-search-wrap">
            <i className="fas fa-magnifying-glass pt-search-icon" />
            <input
              ref={searchRef}
              className={`pt-search theme-${theme}`}
              type="text"
              placeholder="Search name, SKU, category..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value.length === 0) clearSearch();
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
            />
            {searchInput && (
              <button className="pt-search-clear" onClick={clearSearch} type="button">
                <i className="fas fa-xmark" />
              </button>
            )}
            <button className="pt-search-go" onClick={submitSearch} type="button">
              <i className="fas fa-arrow-right" />
            </button>
          </div>

          <SelectInput options={STATUS_OPTS} value={filters.status} onChange={(v) => setFilter('status', v)} className="pt-filter-select" />
          <SelectInput options={catFilterOpts} value={filters.category_id} onChange={(v) => setFilter('category_id', v)} className="pt-filter-select" clearable />
          <SelectInput options={TAX_OPTS} value={filters.tax_type} onChange={(v) => setFilter('tax_type', v)} className="pt-filter-select" clearable />

          {/* Low stock toggle */}
          <button
            className={`pt-lowstock-btn ${filters.low_stock === 1 ? 'is-active' : ''}`}
            onClick={() => setFilter('low_stock', filters.low_stock === 1 ? 0 : 1)}
            type="button"
            title="Show low stock only"
          >
            <i className="fas fa-triangle-exclamation" /> Low Stock
          </button>
        </div>

        <div className="pt-toolbar-right">
          <SelectInput options={SORT_OPTS} value={filters.sortBy} onChange={(v) => setFilter('sortBy', v)} className="pt-filter-select" />
          <SelectInput options={UOM_OPTS}  value={filters.unit_of_measure} onChange={(v) => setFilter('unit_of_measure', v)} className="pt-filter-select" clearable />
          <SelectInput options={LIMIT_OPTS} value={filters.limit} onChange={(v) => setFilter('limit', Number(v))} className="pt-filter-select" />
          <button
            className="pt-btn-download"
            onClick={() => downloadProductsExcel()}
            type="button"
            disabled={loading || products.length === 0}
            title="Export to Excel"
          >
            <i className="fas fa-file-excel" /> Export
          </button>
          {canManage && (
            <>
              <button className="pt-btn-import" onClick={() => navigate('/products/import')} type="button">
                <i className="fas fa-file-import" /> Import Products
              </button>
              <button className="pt-btn-primary" onClick={() => setModal({ type: 'product', data: null })} type="button">
                <i className="fas fa-plus" /> New Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Bulk Bar ─────────────────────────────────────────── */}
      {selectedIds.length > 0 && canManage && (
        <div className={`pt-bulk-bar theme-${theme}`}>
          <span className="pt-bulk-count"><i className="fas fa-square-check" /> {selectedIds.length} selected</span>
          <div className="pt-bulk-actions">
            {filters.status === 'active' && (
              <button className="pt-bulk-btn warning"
                onClick={() => setConfirm({ open: true, type: 'deactivate', ids: selectedIds })} type="button">
                <i className="fas fa-toggle-off" /> Deactivate
              </button>
            )}
            {canDelete && <button className="pt-bulk-btn danger"
              onClick={() => setConfirm({ open: true, type: 'delete', ids: selectedIds })} type="button">
              <i className="fas fa-trash" /> Delete
            </button>}
            <button className="pt-bulk-btn neutral" onClick={clearSelection} type="button">
              <i className="fas fa-xmark" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="pt-table-wrap">
        <table className="pt-table">
          <thead>
            <tr>
              <th className="pt-th pt-th-check">
                {canManage && (
                  <label className="pt-check-label">
                    <input type="checkbox" className="pt-check-input"
                      checked={allSelected}
                      onChange={() => toggleSelectAll(allIds)} />
                    <span className="pt-check-box" />
                  </label>
                )}
              </th>
              <th className="pt-th sortable" onClick={() => {
                if (filters.sortBy === 'name') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                else setFilter('sortBy', 'name');
              }}>
                Product
                <i className={`fas fa-sort${filters.sortBy === 'name' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} pt-sort-icon`} />
              </th>
              <th className="pt-th">Category</th>
              <th className="pt-th sortable" onClick={() => {
                if (filters.sortBy === 'unit_price') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                else setFilter('sortBy', 'unit_price');
              }}>
                Price
                <i className={`fas fa-sort${filters.sortBy === 'unit_price' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} pt-sort-icon`} />
              </th>
              <th className="pt-th">Unit</th>
              <th className="pt-th">Tax</th>
              <th className="pt-th sortable" onClick={() => {
                if (filters.sortBy === 'stock_quantity') setFilter('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                else setFilter('sortBy', 'stock_quantity');
              }}>
                Stock
                <i className={`fas fa-sort${filters.sortBy === 'stock_quantity' ? (filters.sortOrder === 'ASC' ? '-up' : '-down') : ''} pt-sort-icon`} />
              </th>
              <th className="pt-th">Status</th>
              <th className="pt-th pt-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
            ) : error || products.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                  <EmptyState
                    error={error} theme={theme}
                    canManage={canManage}
                    onNew={() => setModal({ type: 'product', data: null })}
                    onRetry={handleRetry}
                  />
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className={`pt-row ${selectedIds.includes(product.id) ? 'is-selected' : ''}`}>
                  <td>
                    {canManage && (
                      <label className="pt-check-label">
                        <input type="checkbox" className="pt-check-input"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelect(product.id)} />
                        <span className="pt-check-box" />
                      </label>
                    )}
                  </td>
                  <td>
                    <div className="pt-product-cell">
                      <div className="pt-avatar">{product.name?.[0]?.toUpperCase()}</div>
                      <div>
                        <p className="pt-product-name">{product.name}</p>
                        <p className="pt-product-sku">SKU: {product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="pt-category-tag">
                      <i className="fas fa-tag" /> {product.category_name || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="pt-price">
                      ₦{Number(product.unit_price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    <span className="pt-uom-badge">{uomLabel(product.unit_of_measure)}</span>
                  </td>
                  <td>
                    {product.tax_type === 'vat'
                      ? <span className="pt-tax-badge vat"><i className="fas fa-percent" /> VAT {product.tax_rate}%</span>
                      : <span className="pt-tax-badge exempt"><i className="fas fa-ban" /> Exempt</span>
                    }
                  </td>
                  <td>
                    <StockBadge status={product.stock_status} qty={product.stock_quantity} />
                  </td>
                  <td><StatusBadge active={product.is_active === 1} /></td>
                  <td>
                    <div className="pt-row-actions">
                      <button className="pt-action-btn view" title="View Details"
                        onClick={() => navigate(`/products/${product.id}`)}>
                        <i className="fas fa-eye" />
                      </button>
                      {canManage && <button className="pt-action-btn edit" title="Edit"
                        onClick={() => setModal({ type: 'product', data: product })}>
                        <i className="fas fa-pen" />
                      </button>}
                      {canManage && product.is_active === 1 && (
                        <button className="pt-action-btn deactivate" title="Deactivate"
                          onClick={() => setConfirm({ open: true, type: 'deactivate', ids: [product.id] })}>
                          <i className="fas fa-toggle-off" />
                        </button>
                      )}
                      {canDelete && (
                        <button className="pt-action-btn delete" title="Delete"
                          onClick={() => setConfirm({ open: true, type: 'delete', ids: [product.id] })}>
                          <i className="fas fa-trash" />
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

      {/* ── Pagination ───────────────────────────────────────── */}
      {meta && meta.total > 0 && (
        <div className={`pt-pagination theme-${theme}`}>
          <span className="pt-pag-info">
            Showing {((currentPage - 1) * filters.limit) + 1}–{Math.min(currentPage * filters.limit, meta.total)} of {meta.total} products
          </span>
          <div className="pt-pag-controls">
            <button className="pt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', 1)}><i className="fas fa-angles-left" /></button>
            <button className="pt-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
            {pageRange().map((p) => (
              <button key={p} className={`pt-pag-btn ${p === currentPage ? 'is-active' : ''}`} onClick={() => setFilter('page', p)}>{p}</button>
            ))}
            <button className="pt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
            <button className="pt-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', totalPages)}><i className="fas fa-angles-right" /></button>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      <ProductFormModal
        open={modal.type === 'product'}
        onClose={() => setModal({ type: null, data: null })}
        product={modal.data}
      />

      <ConfirmModal
        open={confirm.open && confirm.type === 'delete'}
        onClose={() => setConfirm({ open: false, type: '', ids: [] })}
        onConfirm={handleConfirmAction}
        title="Delete Product(s)"
        message={`Permanently delete ${confirm.ids?.length} product(s)? Line items in existing invoices/quotations will be preserved but unlinked from this product.`}
        confirmText="Yes, Delete" variant="danger" loading={actionLoading}
      />

      <ConfirmModal
        open={confirm.open && confirm.type === 'deactivate'}
        onClose={() => setConfirm({ open: false, type: '', ids: [] })}
        onConfirm={handleConfirmAction}
        title="Deactivate Product(s)"
        message={`Deactivating ${confirm.ids?.length} product(s) will hide them from active use and new quotations/invoices.`}
        confirmText="Deactivate" variant="warning" loading={actionLoading}
      />
    </div>
  );
};

export default ProductTable;
