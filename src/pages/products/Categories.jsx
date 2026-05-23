// pages/products/Categories.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useProductStore from '../../stores/useProductStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import SelectInput from '../../components/SelectInput';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { CategoryFormModal } from './ProductModals';
import './Categories.css';

const SORT_OPTS = [
  { value: 'name',       label: 'Name' },
  { value: 'created_at', label: 'Date Added' },
];

const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

// ── Skeleton ─────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="cat-skel-row">
    {[...Array(5)].map((_, i) => <td key={i}><div className="cat-skel-cell" /></td>)}
  </tr>
);

// ── Empty State ───────────────────────────────────────────────────
const EmptyState = ({ onNew, error, onRetry, theme }) => (
  <div className={`cat-empty theme-${theme}`}>
    <div className={`cat-empty-icon ${error ? 'error-icon' : ''}`}>
      <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-tags'}`} />
    </div>
    <h4>{error ? 'Failed to Load Categories' : 'No Categories Found'}</h4>
    <p>{error || 'No categories yet. Create your first one to start organising products.'}</p>
    <div className="cat-empty-actions">
      {error
        ? <button className="cat-empty-btn primary" onClick={onRetry}><i className="fas fa-rotate-right" /> Retry</button>
        : <button className="cat-empty-btn primary" onClick={onNew}><i className="fas fa-plus" /> Add Category</button>
      }
    </div>
  </div>
);

// ── Main ─────────────────────────────────────────────────────────
const Categories = () => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [nav, setNav] = useState(false);

  const {
    categories, categoriesMeta, catFilters, catsLoading, catsError,
    selectedCatIds, fetchCategories, setCatFilter,
    toggleSelectCat, toggleSelectAllCats, clearCatSelection,
    deleteCategories,
  } = useProductStore();

  const [modal, setModal] = useState({ open: false, data: null });
  const [confirm, setConfirm] = useState({ open: false, ids: [] });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(catFilters.search || '');
  const searchRef = useRef(null);

  const submitSearch = useCallback(() => {
    setCatFilter('search', searchInput.trim());
  }, [searchInput, setCatFilter]);

  const clearSearch = () => {
    setSearchInput('');
    setCatFilter('search', '');
  };

  useEffect(() => { fetchCategories(); }, [catFilters]);
  useEffect(() => { document.title = 'Otelex | Product Categories'; }, []);

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteCategories(confirm.ids);
      showToast(`${confirm.ids.length} categor${confirm.ids.length === 1 ? 'y' : 'ies'} deleted.`, 'success');
      setConfirm({ open: false, ids: [] });
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed. Category may have linked products.', 'error');
    } finally { setActionLoading(false); }
  };

  const allIds = categories.map((c) => c.id);
  const allSelected = selectedCatIds.length === allIds.length && allIds.length > 0;
  const totalPages = categoriesMeta?.total_pages || 1;
  const currentPage = catFilters.page;

  const pageRange = () => {
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
          pageTitle="Product Categories"
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Products', to: '/products' },
            { label: 'Categories', active: true },
          ]}
        />

        <div className="cat-page-wrapper">
          <div className={`cat-wrapper theme-${theme}`}>

            {/* ── Toolbar ── */}
            <div className="cat-toolbar">
              <div className="cat-toolbar-left">
                <div className="cat-search-wrap">
                  <i className="fas fa-magnifying-glass cat-search-icon" />
                  <input
                    ref={searchRef}
                    className={`cat-search theme-${theme}`}
                    type="text"
                    placeholder="Search categories..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      if (e.target.value.length === 0) clearSearch();
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                  />
                  {searchInput && (
                    <button className="cat-search-clear" onClick={clearSearch} type="button">
                      <i className="fas fa-xmark" />
                    </button>
                  )}
                  <button className="cat-search-go" onClick={submitSearch} type="button">
                    <i className="fas fa-arrow-right" />
                  </button>
                </div>
              </div>

              <div className="cat-toolbar-right">
                <SelectInput options={SORT_OPTS} value={catFilters.sortBy} onChange={(v) => setCatFilter('sortBy', v)} className="cat-filter-select" />
                <SelectInput options={LIMIT_OPTS} value={catFilters.limit} onChange={(v) => setCatFilter('limit', Number(v))} className="cat-filter-select" />
                <button
                  className="cat-btn-primary"
                  onClick={() => setModal({ open: true, data: null })}
                  type="button"
                >
                  <i className="fas fa-plus" /> New Category
                </button>
              </div>
            </div>

            {/* ── Bulk Bar ── */}
            {selectedCatIds.length > 0 && isSuperAdmin && (
              <div className={`cat-bulk-bar theme-${theme}`}>
                <span className="cat-bulk-count"><i className="fas fa-square-check" /> {selectedCatIds.length} selected</span>
                <div className="cat-bulk-actions">
                  <button className="cat-bulk-btn danger"
                    onClick={() => setConfirm({ open: true, ids: selectedCatIds })} type="button">
                    <i className="fas fa-trash" /> Delete
                  </button>
                  <button className="cat-bulk-btn neutral" onClick={clearCatSelection} type="button">
                    <i className="fas fa-xmark" /> Clear
                  </button>
                </div>
              </div>
            )}

            {/* ── Table ── */}
            <div className="cat-table-wrap">
              <table className="cat-table">
                <thead>
                  <tr>
                    <th className="cat-th cat-th-check">
                      <label className="cat-check-label">
                        <input type="checkbox" className="cat-check-input"
                          checked={allSelected}
                          onChange={() => toggleSelectAllCats(allIds)} />
                        <span className="cat-check-box" />
                      </label>
                    </th>
                    <th className="cat-th sortable" onClick={() => {
                      if (catFilters.sortBy === 'name') setCatFilter('sortOrder', catFilters.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                      else setCatFilter('sortBy', 'name');
                    }}>
                      Category Name
                      <i className={`fas fa-sort${catFilters.sortBy === 'name' ? (catFilters.sortOrder === 'ASC' ? '-up' : '-down') : ''} cat-sort-icon`} />
                    </th>
                    <th className="cat-th">Description</th>
                    <th className="cat-th">Active Products</th>
                    <th className="cat-th cat-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catsLoading ? (
                    [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  ) : catsError || categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                        <EmptyState
                          error={catsError} theme={theme}
                          onNew={() => setModal({ open: true, data: null })}
                          onRetry={() => fetchCategories()}
                        />
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id} className={`cat-row ${selectedCatIds.includes(cat.id) ? 'is-selected' : ''}`}>
                        <td>
                          <label className="cat-check-label">
                            <input type="checkbox" className="cat-check-input"
                              checked={selectedCatIds.includes(cat.id)}
                              onChange={() => toggleSelectCat(cat.id)} />
                            <span className="cat-check-box" />
                          </label>
                        </td>
                        <td>
                          <div className="cat-name-cell">
                            <div className="cat-icon-wrap"><i className="fas fa-tag" /></div>
                            <div>
                              <p className="cat-name">{cat.name}</p>
                              <p className="cat-meta">
                                {cat.total_product_count} product{cat.total_product_count !== 1 ? 's' : ''} total
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="cat-desc">
                            {cat.description || <span style={{ opacity: 0.3 }}>No description</span>}
                          </span>
                        </td>
                        <td>
                          <span className={`cat-count-badge ${cat.active_product_count > 0 ? 'has-products' : ''}`}>
                            {cat.active_product_count}
                          </span>
                        </td>
                        <td>
                          <div className="cat-row-actions">
                            <button className="cat-action-btn edit" title="Edit"
                              onClick={() => setModal({ open: true, data: cat })}>
                              <i className="fas fa-pen" />
                            </button>
                            {isSuperAdmin && <button
                              className="cat-action-btn delete"
                              title={cat.total_product_count > 0 ? 'Cannot delete: has linked products' : 'Delete'}
                              onClick={() => {
                                if (cat.total_product_count > 0) {
                                  showToast(`Cannot delete "${cat.name}": it has ${cat.total_product_count} linked product(s). Reassign or delete them first.`, 'error');
                                  return;
                                }
                                setConfirm({ open: true, ids: [cat.id] });
                              }}
                            >
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

            {/* ── Pagination ── */}
            {categoriesMeta && categoriesMeta.total > 0 && (
              <div className={`cat-pagination theme-${theme}`}>
                <span className="cat-pag-info">
                  Showing {((currentPage - 1) * catFilters.limit) + 1}–{Math.min(currentPage * catFilters.limit, categoriesMeta.total)} of {categoriesMeta.total} categories
                </span>
                <div className="cat-pag-controls">
                  <button className="cat-pag-btn" disabled={currentPage === 1} onClick={() => setCatFilter('page', 1)}><i className="fas fa-angles-left" /></button>
                  <button className="cat-pag-btn" disabled={currentPage === 1} onClick={() => setCatFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
                  {pageRange().map((p) => (
                    <button key={p} className={`cat-pag-btn ${p === currentPage ? 'is-active' : ''}`} onClick={() => setCatFilter('page', p)}>{p}</button>
                  ))}
                  <button className="cat-pag-btn" disabled={currentPage === totalPages} onClick={() => setCatFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
                  <button className="cat-pag-btn" disabled={currentPage === totalPages} onClick={() => setCatFilter('page', totalPages)}><i className="fas fa-angles-right" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <CategoryFormModal
        open={modal.open}
        onClose={() => setModal({ open: false, data: null })}
        category={modal.data}
      />

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm({ open: false, ids: [] })}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Permanently delete ${confirm.ids?.length} categor${confirm.ids?.length === 1 ? 'y' : 'ies'}? This will fail if any products are still linked.`}
        confirmText="Yes, Delete" variant="danger" loading={actionLoading}
      />
    </div>
  );
};

export default Categories;
