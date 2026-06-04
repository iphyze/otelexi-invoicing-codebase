// pages/reports/StockLevels.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import DatePicker from '../../components/DatePicker';
import SelectInput from '../../components/SelectInput';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import reportService from '../../services/reportService';
import productService from '../../services/productService';
import './Reports.css';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Stock' },
  { value: 'ok', label: 'Healthy' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

const LIMIT_OPTIONS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
  { value: 100, label: '100 / page' },
];

const STOCK_STATUS = {
  ok: {
    label: 'Healthy',
    icon: 'fa-circle-check',
    className: 'rpt-stock-ok',
    color: '#10b981',
  },
  low_stock: {
    label: 'Low Stock',
    icon: 'fa-triangle-exclamation',
    className: 'rpt-stock-low',
    color: '#f59e0b',
  },
  out_of_stock: {
    label: 'Out of Stock',
    icon: 'fa-circle-xmark',
    className: 'rpt-stock-out',
    color: '#ef4444',
  },
};

const fmtN = (n, sym = '₦') => sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });

const toCsvValue = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const StockLevels = () => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const [nav, setNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    category_id: '',
    filter: 'all',
    search: '',
    page: 1,
    limit: 20,
  });

  const setF = (key, val) => {
    setFilters((prev) => ({
      ...prev,
      [key]: val,
      page: key === 'page' ? Number(val) : 1,
    }));
  };

  const categoryOptions = useMemo(() => ([
    { value: '', label: 'All Categories' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ]), [categories]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await productService.getCategories({ page: 1, limit: 200, sortBy: 'name', sortOrder: 'ASC' });
      setCategories(res.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load categories for the stock report.', 'error');
    } finally {
      setCategoriesLoading(false);
    }
  }, [showToast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        from: filters.from,
        to: filters.to,
        filter: filters.filter,
        page: filters.page,
        limit: filters.limit,
      };

      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.search) params.search = filters.search;

      const res = await reportService.getStockLevels(params);
      setData(res.data?.data || null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load stock levels report.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    document.title = 'Otelex | Stock Levels Report';
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary || {};
  const products = data?.products || [];
  const meta = data?.meta || {};
  const totalPages = Number(meta.total_pages || 0);
  const currentPage = Number(meta.page || filters.page || 1);

  const kpis = [
    { label: 'Tracked SKUs', value: fmtQty(summary.total_tracked_skus), icon: 'fa-boxes-stacked', color: '#1a56db' },
    { label: 'Stock Value', value: fmtN(summary.total_stock_value), icon: 'fa-sack-dollar', color: '#10b981' },
    { label: 'Low Stock', value: fmtQty(summary.low_stock_count), icon: 'fa-triangle-exclamation', color: '#f59e0b' },
    { label: 'Out of Stock', value: fmtQty(summary.out_of_stock_count), icon: 'fa-circle-xmark', color: '#ef4444' },
    { label: 'Units Sold', value: fmtQty(summary.units_sold_in_period), icon: 'fa-arrow-trend-down', color: '#8b5cf6' },
    { label: 'Units Received', value: fmtQty(summary.units_received_in_period), icon: 'fa-arrow-trend-up', color: '#06b6d4' },
  ];

  const pageRange = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  };

  const submitSearch = () => {
    setF('search', searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setF('search', '');
  };

  const exportCurrentView = () => {
    if (!products.length) {
      showToast('No stock rows to export for the current view.', 'info');
      return;
    }

    const headers = [
      'Product', 'SKU', 'Category', 'Unit', 'Current Stock', 'Reorder Level',
      'Units Sold In Period', 'Units Received In Period', 'Unit Price', 'Stock Value', 'Status',
    ];
    const rows = products.map((p) => [
      p.product_name,
      p.sku,
      p.category || '',
      p.unit_of_measure,
      p.current_stock,
      p.reorder_level,
      p.units_sold_in_period,
      p.units_received_in_period,
      p.unit_price,
      p.stock_value,
      STOCK_STATUS[p.stock_status]?.label || p.stock_status,
    ]);

    const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `otelex-stock-levels-${filters.from}-to-${filters.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const healthTotal = Math.max(Number(summary.total_tracked_skus || 0), 1);
  const healthRows = [
    { key: 'ok', label: 'Healthy Stock', count: Number(summary.ok_count || 0), color: '#10b981' },
    { key: 'low_stock', label: 'Low Stock', count: Number(summary.low_stock_count || 0), color: '#f59e0b' },
    { key: 'out_of_stock', label: 'Out of Stock', count: Number(summary.out_of_stock_count || 0), color: '#ef4444' },
  ];

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Stock Levels Report"
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Reports', to: '/reports/sales' },
            { label: 'Stock Levels', active: true },
          ]}
        />

        <div className={`rpt-filter-bar theme-${theme}`}>
          <div className="rpt-filter-group">
            <label className="rpt-filter-label">From</label>
            <DatePicker value={filters.from} onChange={(v) => setF('from', v)} />
          </div>
          <div className="rpt-filter-group">
            <label className="rpt-filter-label">To</label>
            <DatePicker value={filters.to} onChange={(v) => setF('to', v)} />
          </div>
          <div className="rpt-filter-group rpt-filter-wide">
            <label className="rpt-filter-label">Category</label>
            <SelectInput
              options={categoryOptions}
              value={filters.category_id}
              onChange={(v) => setF('category_id', v)}
              placeholder={categoriesLoading ? 'Loading categories...' : 'All Categories'}
              searchable
              clearable
              size="sm"
            />
          </div>
          <div className="rpt-filter-group rpt-filter-medium">
            <label className="rpt-filter-label">Stock Status</label>
            <SelectInput
              options={STATUS_OPTIONS}
              value={filters.filter}
              onChange={(v) => setF('filter', v)}
              size="sm"
            />
          </div>
          <div className="rpt-filter-group rpt-filter-medium">
            <label className="rpt-filter-label">Rows</label>
            <SelectInput
              options={LIMIT_OPTIONS}
              value={filters.limit}
              onChange={(v) => setF('limit', Number(v))}
              size="sm"
            />
          </div>
          <div className="rpt-search-wrap">
            <i className="fas fa-magnifying-glass rpt-search-icon" />
            <input
              className={`rpt-search-input theme-${theme}`}
              type="text"
              value={searchInput}
              placeholder="Search product, SKU, category..."
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value) setF('search', '');
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
            />
            {searchInput && (
              <button className="rpt-search-clear" type="button" onClick={clearSearch}>
                <i className="fas fa-xmark" />
              </button>
            )}
            <button className="rpt-search-go" type="button" onClick={submitSearch}>
              <i className="fas fa-arrow-right" />
            </button>
          </div>
          <button className="rpt-run-btn" onClick={load} disabled={loading} type="button">
            {loading ? <><span className="rpt-spinner" /> Loading...</> : <><i className="fas fa-rotate-right" /> Run</>}
          </button>
          <button className="rpt-export-btn" onClick={exportCurrentView} disabled={loading || !products.length} type="button">
            <i className="fas fa-file-export" /> Export CSV
          </button>
        </div>

        {loading && !data && (
          <div className="rpt-loading">
            {[...Array(6)].map((_, i) => <div key={i} className={`rpt-shimmer theme-${theme}`} style={{ height: 86, borderRadius: 14 }} />)}
          </div>
        )}

        {data && (
          <>
            <div className="rpt-kpi-grid">
              {kpis.map((k, i) => (
                <motion.div
                  key={k.label}
                  className={`rpt-kpi-card theme-${theme}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="rpt-kpi-icon" style={{ background: `${k.color}18`, color: k.color }}>
                    <i className={`fas ${k.icon}`} />
                  </div>
                  <div>
                    <p className="rpt-kpi-label">{k.label}</p>
                    <h3 className="rpt-kpi-value">{k.value}</h3>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="rpt-two-col">
              <motion.div
                className={`rpt-card theme-${theme}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h4 className="rpt-card-title"><i className="fas fa-heart-pulse" /> Stock Health</h4>
                <div className="rpt-stock-health-list">
                  {healthRows.map((row, i) => {
                    const pct = (row.count / healthTotal) * 100;
                    return (
                      <div key={row.key} className="rpt-stock-health-row">
                        <div className="rpt-stock-health-top">
                          <span className="rpt-stock-health-label">
                            <span className="rpt-stock-health-dot" style={{ background: row.color }} />
                            {row.label}
                          </span>
                          <span className="rpt-stock-health-count">{fmtQty(row.count)} SKU{row.count === 1 ? '' : 's'}</span>
                        </div>
                        <div className="rpt-stock-health-track">
                          <motion.div
                            className="rpt-stock-health-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.45, delay: i * 0.08 }}
                            style={{ background: row.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                className={`rpt-card theme-${theme}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <h4 className="rpt-card-title"><i className="fas fa-calendar-days" /> Movement Period</h4>
                <div className="rpt-stock-period-grid">
                  <div className="rpt-stock-period-box">
                    <span>From</span>
                    <strong>{data.period?.from || filters.from}</strong>
                  </div>
                  <div className="rpt-stock-period-box">
                    <span>To</span>
                    <strong>{data.period?.to || filters.to}</strong>
                  </div>
                  <div className="rpt-stock-period-box success">
                    <span>Received</span>
                    <strong>{fmtQty(summary.units_received_in_period)}</strong>
                  </div>
                  <div className="rpt-stock-period-box warning">
                    <span>Sold / Out</span>
                    <strong>{fmtQty(summary.units_sold_in_period)}</strong>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              className={`rpt-card theme-${theme}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
            >
              <div className="rpt-card-headline">
                <h4 className="rpt-card-title"><i className="fas fa-list-check" /> Current Stock Positions</h4>
                <span className="rpt-card-count">{fmtQty(meta.total)} product{Number(meta.total || 0) === 1 ? '' : 's'}</span>
              </div>

              {products.length === 0 ? (
                <p className="rpt-no-data">No stock records match the selected filters.</p>
              ) : (
                <div className="rpt-table-wrap">
                  <table className="rpt-table rpt-stock-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Unit</th>
                        <th className="rpt-num">Current</th>
                        <th className="rpt-num">Reorder</th>
                        <th className="rpt-num">Sold / Out</th>
                        <th className="rpt-num">Received</th>
                        <th className="rpt-num">Unit Price</th>
                        <th className="rpt-num">Stock Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product, index) => {
                        const status = STOCK_STATUS[product.stock_status] || STOCK_STATUS.ok;
                        return (
                          <motion.tr
                            key={product.product_id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.025 }}
                          >
                            <td>
                              <span className="rpt-stock-product-name">{product.product_name}</span>
                              <span className="rpt-stock-sku">SKU: {product.sku || '—'}</span>
                            </td>
                            <td>{product.category || '—'}</td>
                            <td><span className="rpt-stock-unit">{product.unit_of_measure || '—'}</span></td>
                            <td className="rpt-num rpt-stock-current">{fmtQty(product.current_stock)}</td>
                            <td className="rpt-num">{fmtQty(product.reorder_level)}</td>
                            <td className="rpt-num rpt-val-red">{fmtQty(product.units_sold_in_period)}</td>
                            <td className="rpt-num rpt-val-green">{fmtQty(product.units_received_in_period)}</td>
                            <td className="rpt-num">{fmtN(product.unit_price)}</td>
                            <td className="rpt-num rpt-val-blue">{fmtN(product.stock_value)}</td>
                            <td>
                              <span className={`rpt-stock-badge ${status.className}`}>
                                <i className={`fas ${status.icon}`} /> {status.label}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="rpt-pagination">
                  <button type="button" className="rpt-page-btn" disabled={currentPage <= 1 || loading} onClick={() => setF('page', currentPage - 1)}>
                    <i className="fas fa-chevron-left" /> Previous
                  </button>
                  <div className="rpt-page-list">
                    {pageRange().map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`rpt-page-num ${page === currentPage ? 'active' : ''}`}
                        disabled={loading}
                        onClick={() => setF('page', page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="rpt-page-btn" disabled={currentPage >= totalPages || loading} onClick={() => setF('page', currentPage + 1)}>
                    Next <i className="fas fa-chevron-right" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockLevels;
