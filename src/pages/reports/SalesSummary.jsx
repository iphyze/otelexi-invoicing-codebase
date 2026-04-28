// pages/reports/SalesSummary.jsx
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

const CURRENCY_OPTS = [
  { value: 'NGN', label: '₦ NGN' },
  { value: 'USD', label: '$ USD' },
];

const METHOD_ICONS = {
  bank_transfer: 'fa-building-columns',
  cash:          'fa-money-bills',
  pos:           'fa-credit-card',
  cheque:        'fa-file-invoice',
  online:        'fa-globe',
};

const fmtN = (n, sym = '₦') => sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
const pct  = (n) => `${Number(n || 0).toFixed(1)}%`;

// ── Simple inline bar chart ───────────────────────────────────────
const BarChart = ({ data, theme }) => {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map((d) => d.gross_revenue || 0), 1);
  return (
    <div className="rpt-barchart">
      {data.map((row, i) => (
        <div key={i} className="rpt-bar-row">
          <span className="rpt-bar-label">{row.month}</span>
          <div className="rpt-bar-track">
            <motion.div
              className="rpt-bar-fill rpt-bar-revenue"
              initial={{ width: 0 }}
              animate={{ width: `${(row.gross_revenue / maxVal) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
            />
            <motion.div
              className="rpt-bar-fill rpt-bar-collected"
              initial={{ width: 0 }}
              animate={{ width: `${(row.amount_collected / maxVal) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.04 + 0.1 }}
            />
          </div>
          <span className="rpt-bar-val">{fmtN(row.gross_revenue)}</span>
        </div>
      ))}
      <div className="rpt-bar-legend">
        <span className="rpt-legend-dot revenue" /> Revenue
        <span className="rpt-legend-dot collected" /> Collected
      </div>
    </div>
  );
};

const SalesSummary = () => {
  const { theme }      = useThemeStore();
  const { showToast }  = useToastStore();
  const [nav, setNav]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to:   new Date().toISOString().split('T')[0],
    currency: 'NGN',
  });

  const setF = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const sym  = filters.currency === 'USD' ? '$' : '₦';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getSalesSummary(filters);
      setData(res.data.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load report.', 'error');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { document.title = 'Otelex | Monthly Sales'; load(); }, []);

  const inv = data?.invoices;
  const col = data?.collections;

  const kpis = inv ? [
    { label: 'Gross Revenue',   value: fmtN(inv.gross_revenue, sym),     icon: 'fa-chart-line',  color: '#1a56db' },
    { label: 'Total Collected', value: fmtN(col?.total_collected, sym),   icon: 'fa-hand-holding-dollar', color: '#10b981' },
    { label: 'Outstanding',     value: fmtN(inv.total_outstanding, sym),  icon: 'fa-clock',       color: '#f59e0b' },
    { label: 'Collection Rate', value: pct(col?.collection_rate),         icon: 'fa-percent',     color: '#8b5cf6' },
    { label: 'VAT Collected',   value: fmtN(inv.total_vat_collected, sym),icon: 'fa-receipt',     color: '#06b6d4' },
    { label: 'Discounts Given', value: fmtN(inv.total_discounts_given, sym), icon: 'fa-tag',      color: '#ef4444' },
  ] : [];

  const byStatus = inv?.by_status ? [
    { label: 'Paid',        count: inv.by_status.paid,        cls: 'rpt-st-paid' },
    { label: 'Partial',     count: inv.by_status.partial,     cls: 'rpt-st-partial' },
    { label: 'Outstanding', count: inv.by_status.outstanding, cls: 'rpt-st-overdue' },
    { label: 'Overdue',     count: inv.by_status.overdue,     cls: 'rpt-st-red' },
    { label: 'Cancelled',   count: inv.by_status.cancelled,   cls: 'rpt-st-grey' },
    { label: 'Draft',       count: inv.by_status.draft,       cls: 'rpt-st-grey' },
  ] : [];

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav pageTitle="Monthly Sales Report"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Reports', to: '/reports/sales' }, { label: 'Monthly Sales', active: true }]} />

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
              {CURRENCY_OPTS.map((c) => (
                <button key={c.value} type="button"
                  className={`rpt-cur-btn ${filters.currency === c.value ? 'is-active' : ''}`}
                  onClick={() => setF('currency', c.value)}>{c.label}</button>
              ))}
            </div>
          </div>
          <button className="rpt-run-btn" onClick={load} disabled={loading} type="button">
            {loading ? <><span className="rpt-spinner" /> Loading...</> : <><i className="fas fa-rotate-right" /> Run Report</>}
          </button>
        </div>

        {loading && !data && (
          <div className="rpt-loading">
            {[...Array(6)].map((_, i) => <div key={i} className={`rpt-shimmer theme-${theme}`} style={{ height: 90, borderRadius: 14 }} />)}
          </div>
        )}

        {data && (
          <>
            {/* KPI Cards */}
            <div className="rpt-kpi-grid">
              {kpis.map((k, i) => (
                <motion.div key={k.label} className={`rpt-kpi-card theme-${theme}`}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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
              {/* Revenue Trend Chart */}
              <motion.div className={`rpt-card theme-${theme}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <h4 className="rpt-card-title"><i className="fas fa-chart-bar" /> Revenue Trend</h4>
                <BarChart data={data.trend} theme={theme} />
                {!data.trend?.length && <p className="rpt-no-data">No trend data for this period.</p>}
              </motion.div>

              {/* Right side: by status + payment methods */}
              <div className="rpt-col-stack">
                <motion.div className={`rpt-card theme-${theme}`}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h4 className="rpt-card-title"><i className="fas fa-chart-pie" /> By Status</h4>
                  <div className="rpt-status-list">
                    {byStatus.map((s) => (
                      <div key={s.label} className="rpt-status-row">
                        <span className={`rpt-st-dot ${s.cls}`} />
                        <span className="rpt-status-label">{s.label}</span>
                        <span className="rpt-status-count">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div className={`rpt-card theme-${theme}`}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <h4 className="rpt-card-title"><i className="fas fa-money-bill-wave" /> Payment Methods</h4>
                  {col?.by_method?.map((m) => {
                    const pctVal = col.total_collected > 0 ? (m.total / col.total_collected) * 100 : 0;
                    return (
                      <div key={m.method} className="rpt-method-row">
                        <i className={`fas ${METHOD_ICONS[m.method] || 'fa-money-bill'} rpt-method-icon`} />
                        <div className="rpt-method-info">
                          <div className="rpt-method-top">
                            <span className="rpt-method-name">{m.method?.replace('_', ' ')}</span>
                            <span className="rpt-method-amt">{fmtN(m.total, sym)}</span>
                          </div>
                          <div className="rpt-method-bar-wrap">
                            <motion.div className="rpt-method-bar"
                              initial={{ width: 0 }} animate={{ width: `${pctVal}%` }} transition={{ duration: 0.5 }} />
                          </div>
                        </div>
                        <span className="rpt-method-pct">{pctVal.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                  {!col?.by_method?.length && <p className="rpt-no-data">No payments in this period.</p>}
                </motion.div>
              </div>
            </div>

            {/* Trend Table */}
            {data.trend?.length > 0 && (
              <motion.div className={`rpt-card theme-${theme}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h4 className="rpt-card-title"><i className="fas fa-table" /> Monthly Breakdown</h4>
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="rpt-num">Invoices</th>
                        <th className="rpt-num">Gross Revenue</th>
                        <th className="rpt-num">Collected</th>
                        <th className="rpt-num">Outstanding</th>
                        <th className="rpt-num">Collect Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trend.map((row, i) => {
                        const rate = row.gross_revenue > 0 ? (row.amount_collected / row.gross_revenue * 100).toFixed(1) : 0;
                        return (
                          <tr key={i}>
                            <td>{row.month}</td>
                            <td className="rpt-num">{row.invoice_count}</td>
                            <td className="rpt-num rpt-val-blue">{fmtN(row.gross_revenue, sym)}</td>
                            <td className="rpt-num rpt-val-green">{fmtN(row.amount_collected, sym)}</td>
                            <td className="rpt-num rpt-val-amber">{fmtN(row.outstanding, sym)}</td>
                            <td className="rpt-num">{rate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesSummary;
