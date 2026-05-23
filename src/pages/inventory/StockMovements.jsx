import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import useThemeStore from '../../stores/useThemeStore';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import inventoryService from '../../services/inventoryService';
import productService from '../../services/productService';
import './StockMovements.css';

const MOVEMENT_OPTIONS = [
  { value: '', label: 'All movement types' },
  { value: 'in', label: 'Stock In', icon: 'fa-arrow-trend-up' },
  { value: 'out', label: 'Stock Out', icon: 'fa-arrow-trend-down' },
  { value: 'adjustment', label: 'Manual Adjustment', icon: 'fa-sliders' },
];

const REASON_OPTIONS = [
  { value: 'opening_stock', label: 'Opening Stock' },
  { value: 'physical_count', label: 'Physical Count' },
  { value: 'damaged', label: 'Damaged Stock' },
  { value: 'returned_goods', label: 'Returned Goods' },
  { value: 'correction', label: 'Correction' },
  { value: 'other', label: 'Other' },
];

const TYPE_OPTIONS = [
  { value: 'increase', label: 'Increase Stock' },
  { value: 'decrease', label: 'Decrease Stock' },
  { value: 'set', label: 'Set Exact Balance' },
];

const INITIAL_FILTERS = { search: '', movement_type: '', from: '', to: '', page: 1, limit: 20 };
const INITIAL_FORM = { product_id: '', adjustment_type: 'increase', quantity: '', reason_code: 'physical_count', reason: '' };
const number = (value) => Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const StockAdjustmentModal = ({ open, onClose, onSaved, theme }) => {
  const { showToast } = useToastStore();
  const [form, setForm] = useState(INITIAL_FORM);
  const [options, setOptions] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(INITIAL_FORM);
    setLoadingProducts(true);
    productService.getProducts({ status: 'active', page: 1, limit: 100, sortBy: 'name', sortOrder: 'ASC' })
      .then((response) => {
        const products = response.data?.data || [];
        setOptions(products.map((product) => ({
          value: product.id,
          label: `${product.name} (${product.sku}) — Available: ${number(product.stock_quantity)}`,
        })));
      })
      .catch(() => showToast('Unable to load active products.', 'error'))
      .finally(() => setLoadingProducts(false));
  }, [open]);

  if (!open) return null;

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await inventoryService.adjustStock({ ...form, product_id: Number(form.product_id), quantity: Number(form.quantity) });
      showToast('Stock adjustment recorded successfully.', 'success');
      onSaved();
      onClose();
    } catch (error) {
      showToast(error.response?.data?.message || 'Stock adjustment could not be recorded.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.div
        className={`stm-modal theme-${theme}`}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="stm-modal-head">
          <div>
            <span className="stm-eyebrow">Controlled inventory action</span>
            <h2>Record Stock Adjustment</h2>
            <p>Every change is stored in movement history and the audit log.</p>
          </div>
          <button type="button" className="stm-close" onClick={onClose}><i className="fas fa-xmark" /></button>
        </div>
        <form className="stm-form" onSubmit={handleSubmit}>
          <div className="stm-form-field full">
            <label>Product</label>
            <SelectInput options={options} value={form.product_id} onChange={(value) => set('product_id', value)} placeholder={loadingProducts ? 'Loading products...' : 'Select product'} />
          </div>
          <div className="stm-form-field">
            <label>Adjustment Type</label>
            <SelectInput options={TYPE_OPTIONS} value={form.adjustment_type} onChange={(value) => set('adjustment_type', value)} />
          </div>
          <div className="stm-form-field">
            <label>{form.adjustment_type === 'set' ? 'New Stock Balance' : 'Quantity'}</label>
            <input type="number" min="0" step="0.01" required value={form.quantity} onChange={(event) => set('quantity', event.target.value)} placeholder="0.00" />
          </div>
          <div className="stm-form-field full">
            <label>Reason Category</label>
            <SelectInput options={REASON_OPTIONS} value={form.reason_code} onChange={(value) => set('reason_code', value)} />
          </div>
          <div className="stm-form-field full">
            <label>Explanation</label>
            <textarea rows="3" required minLength="8" value={form.reason} onChange={(event) => set('reason', event.target.value)} placeholder="State why this stock adjustment is necessary..." />
          </div>
          <div className="stm-modal-actions">
            <button type="button" className="stm-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="stm-btn primary" disabled={saving || !form.product_id}>
              {saving ? <><span className="stm-spinner" /> Saving...</> : <><i className="fas fa-check" /> Record Adjustment</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const StockMovements = () => {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const [nav, setNav] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [searchValue, setSearchValue] = useState('');
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState({ total_in: 0, total_out: 0, net_adjustment: 0, products_affected: 0 });
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const canAdjust = ['super_admin', 'admin'].includes(user?.role);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await inventoryService.getMovements(filters);
      setMovements(response.data?.data || []);
      setSummary(response.data?.summary || {});
      setMeta(response.data?.meta || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Stock movement history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { document.title = 'Otelex | Stock Movements'; }, []);
  useEffect(() => { loadMovements(); }, [loadMovements]);

  const submitSearch = () => setFilters((current) => ({ ...current, search: searchValue.trim(), page: 1 }));
  const pages = useMemo(() => Array.from({ length: meta?.total_pages || 1 }, (_, index) => index + 1), [meta]);

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav pageTitle="Stock Movements" links={[{ label: 'Dashboard', to: '/' }, { label: 'Products', to: '/products' }, { label: 'Stock Movements', active: true }]} />
        <div className="stm-wrapper">
          <div className="stm-heading">
            <div>
              <span className="stm-eyebrow">Inventory control ledger</span>
              <h1>Stock Movement History</h1>
              <p>Review all product movements and record controlled manual adjustments with full audit visibility.</p>
            </div>
            {canAdjust && (
              <button type="button" className="stm-btn primary" onClick={() => setShowAdjust(true)}>
                <i className="fas fa-sliders" /> New Adjustment
              </button>
            )}
          </div>

          <div className="stm-stats">
            <div className="stm-stat"><span>Stock In</span><strong className="positive">+{number(summary.total_in)}</strong></div>
            <div className="stm-stat"><span>Stock Out</span><strong className="negative">-{number(summary.total_out)}</strong></div>
            <div className="stm-stat"><span>Net Manual Adjustment</span><strong>{summary.net_adjustment >= 0 ? '+' : ''}{number(summary.net_adjustment)}</strong></div>
            <div className="stm-stat"><span>Products Affected</span><strong>{summary.products_affected || 0}</strong></div>
          </div>

          <div className="stm-filters">
            <div className="stm-search">
              <i className="fas fa-magnifying-glass" />
              <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submitSearch()} placeholder="Search product, SKU, reference or note..." />
              <button type="button" onClick={submitSearch}>Search</button>
            </div>
            <SelectInput options={MOVEMENT_OPTIONS} value={filters.movement_type} onChange={(value) => setFilters((current) => ({ ...current, movement_type: value, page: 1 }))} clearable />
            <DatePicker value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value, page: 1 }))} placeholder="From date" />
            <DatePicker value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value, page: 1 }))} placeholder="To date" />
          </div>

          <div className="stm-table-card">
            <table className="stm-table">
              <thead><tr><th>Date</th><th>Product</th><th>Type</th><th>Quantity</th><th>Balance</th><th>Reference</th><th>Recorded By</th></tr></thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => <tr key={index} className="stm-loading"><td colSpan="7"><span /></td></tr>)
                ) : error || movements.length === 0 ? (
                  <tr><td colSpan="7"><div className="stm-empty"><i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-box-open'}`} /><strong>{error || 'No stock movements found'}</strong>{error && <button type="button" onClick={loadMovements}>Try Again</button>}</div></td></tr>
                ) : movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td><strong>{movement.product_name}</strong><small>{movement.sku}</small></td>
                    <td><span className={`stm-type ${movement.movement_type}`}>{movement.movement_type.replace('_', ' ')}</span></td>
                    <td className={movement.quantity >= 0 ? 'positive' : 'negative'}>{movement.quantity > 0 ? '+' : ''}{number(movement.quantity)}</td>
                    <td>{movement.balance_after === null ? '—' : `${number(movement.balance_before)} → ${number(movement.balance_after)}`}</td>
                    <td><strong>{movement.movement_number || movement.reference_type || '—'}</strong><small>{movement.notes || '—'}</small></td>
                    <td>{movement.created_by_name || 'System'}<small>{movement.created_by_email || ''}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && meta.total_pages > 1 && (
              <div className="stm-pagination">
                {pages.map((page) => (
                  <button key={page} type="button" className={page === filters.page ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, page }))}>{page}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <StockAdjustmentModal open={showAdjust} onClose={() => setShowAdjust(false)} onSaved={loadMovements} theme={theme} />
    </div>
  );
};

export default StockMovements;
