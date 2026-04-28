// pages/reports/TopProducts.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import DatePicker from '../../components/DatePicker';
import reportService from '../../services/reportService';
import './Reports.css';

const fmtN = (n, sym = '₦') => sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

const TopProducts = () => {
  const { theme }     = useThemeStore();
  const { showToast } = useToastStore();
  const [nav, setNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to:   new Date().toISOString().split('T')[0],
    currency: 'NGN', sortBy: 'revenue', limit: 10,
  });
  const setF = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const sym  = filters.currency === 'USD' ? '$' : '₦';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getTopProducts(filters);
      setData(res.data.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load report.', 'error');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { document.title = 'Otelex | Top Products'; load(); }, []);

  const maxRevenue = Math.max(...(data?.products?.map((p) => p.total_revenue) || [1]), 1);

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav pageTitle="Top Products Report"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Reports', to: '/reports/sales' }, { label: 'Top Products', active: true }]} />

        {/* Filters */}
        <div className={`rpt-filter-bar theme-${theme}`}>
          <div className="rpt-filter-group">
            <label className="rpt-filter-label">From</label>
            <DatePicker value={filters.from} onChange={(v) => setF('from', v)} />
          </div>
          <div className="rpt-filter-group">
            <label className="rpt-filter-label">To</label>
            <DatePicker value={filters.to} onChange={(v) => setF('to', v)} />
          </div>
          <div className="rpt-filter-group">
            <label className="rpt-filter-label">Currency</label>
            <div className="rpt-currency-toggle">
              {['NGN','USD'].map((c) => (
                <button key={c} type="button"
                  className={`rpt-cur-btn ${filters.currency === c ? 'is-active' : ''}`}
                  onClick={() => setF('currency', c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="rpt-filter-group">
            <label className="rpt-filter-label">Sort By</label>
            <div className="rpt-currency-toggle">
              {[{v:'revenue',l:'Revenue'},{v:'quantity',l:'Quantity'}].map((o) => (
                <button key={o.v} type="button"
                  className={`rpt-cur-btn ${filters.sortBy === o.v ? 'is-active' : ''}`}
                  onClick={() => setF('sortBy', o.v)}>{o.l}</button>
              ))}
            </div>
          </div>
          <div className="rpt-filter-group">
            <label className="rpt-filter-label">Top N</label>
            <div className="rpt-currency-toggle">
              {[10,20,50].map((n) => (
                <button key={n} type="button"
                  className={`rpt-cur-btn ${filters.limit === n ? 'is-active' : ''}`}
                  onClick={() => setF('limit', n)}>{n}</button>
              ))}
            </div>
          </div>
          <button className="rpt-run-btn" onClick={load} disabled={loading} type="button">
            {loading ? <><span className="rpt-spinner" /> Loading...</> : <><i className="fas fa-rotate-right" /> Run</>}
          </button>
        </div>

        {loading && !data && (
          <div className="rpt-loading">
            {[...Array(3)].map((_, i) => <div key={i} className={`rpt-shimmer theme-${theme}`} style={{ height: 60 }} />)}
          </div>
        )}

        {data && (
          <div className="rpt-two-col">
            {/* Product Ranking */}
            <motion.div className={`rpt-card theme-${theme}`}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <h4 className="rpt-card-title"><i className="fas fa-trophy" /> Top Products — {filters.sortBy === 'revenue' ? 'By Revenue' : 'By Quantity'}</h4>
              {data.products?.length === 0 && <p className="rpt-no-data">No product sales in this period.</p>}
              <div className="rpt-product-list">
                {data.products?.map((p, i) => {
                  const barPct = filters.sortBy === 'revenue'
                    ? (p.total_revenue / maxRevenue) * 100
                    : (p.total_quantity / Math.max(...data.products.map((x) => x.total_quantity), 1)) * 100;
                  return (
                    <motion.div key={p.product_id} className="rpt-product-row"
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <span className="rpt-rank">{i + 1}</span>
                      <div className="rpt-product-info">
                        <div className="rpt-product-top">
                          <span className="rpt-product-name">{p.product_name}</span>
                          <span className="rpt-product-cat">{p.category || '—'}</span>
                        </div>
                        <div className="rpt-product-bar-wrap">
                          <motion.div className="rpt-product-bar"
                            initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.5, delay: i * 0.04 }} />
                        </div>
                        <div className="rpt-product-bottom">
                          <span className="rpt-product-sku">SKU: {p.sku}</span>
                          <span className="rpt-product-qty">{p.total_quantity} units sold</span>
                        </div>
                      </div>
                      <div className="rpt-product-val">
                        <span className="rpt-product-rev">{fmtN(p.total_revenue, sym)}</span>
                        <span className="rpt-product-disc">-{fmtN(p.total_discounts, sym)} disc.</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* By Category */}
            <motion.div className={`rpt-card theme-${theme}`}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h4 className="rpt-card-title"><i className="fas fa-tags" /> By Category</h4>
              {data.by_category?.length === 0 && <p className="rpt-no-data">No category data.</p>}
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="rpt-num">Products</th>
                      <th className="rpt-num">Units</th>
                      <th className="rpt-num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_category?.map((c, i) => (
                      <tr key={i}>
                        <td><span className="rpt-cat-name">{c.category_name}</span></td>
                        <td className="rpt-num">{c.product_count}</td>
                        <td className="rpt-num">{c.total_quantity}</td>
                        <td className="rpt-num rpt-val-blue">{fmtN(c.total_revenue, sym)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopProducts;
