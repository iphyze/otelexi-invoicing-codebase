// pages/reports/VatReport.jsx
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

const VatReport = () => {
  const { theme }     = useThemeStore();
  const { showToast } = useToastStore();
  const [nav, setNav] = useState(false);
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
      const res = await reportService.getVatReport(filters);
      setData(res.data.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load VAT report.', 'error');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { document.title = 'Otelex | VAT Report'; load(); }, []);

  const s = data?.summary;
  const kpis = s ? [
    { label: 'Total VAT Collected',   value: fmtN(s.total_vat_collected, sym),   icon: 'fa-percent',   color: '#1a56db' },
    { label: 'Taxable Sales',         value: fmtN(s.taxable_net_sales, sym),      icon: 'fa-receipt',   color: '#10b981' },
    { label: 'Exempt Sales',          value: fmtN(s.exempt_net_sales, sym),       icon: 'fa-ban',       color: '#64748b' },
    { label: 'Taxable %',             value: `${s.taxable_percentage}%`,           icon: 'fa-chart-pie', color: '#f59e0b' },
    { label: 'Total Invoice Value',   value: fmtN(s.total_invoice_value, sym),    icon: 'fa-file-invoice', color: '#8b5cf6' },
    { label: 'Invoices',              value: s.total_invoices,                     icon: 'fa-hashtag',   color: '#06b6d4' },
  ] : [];

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav pageTitle="VAT Report"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Reports', to: '/reports/sales' }, { label: 'VAT Report', active: true }]} />

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
          <button className="rpt-run-btn" onClick={load} disabled={loading} type="button">
            {loading ? <><span className="rpt-spinner" /> Loading...</> : <><i className="fas fa-rotate-right" /> Run</>}
          </button>
        </div>

        {loading && !data && (
          <div className="rpt-loading">
            {[...Array(6)].map((_, i) => <div key={i} className={`rpt-shimmer theme-${theme}`} style={{ height: 90, borderRadius: 14 }} />)}
          </div>
        )}

        {data && (
          <>
            <div className="rpt-kpi-grid">
              {kpis.map((k, i) => (
                <motion.div key={k.label} className={`rpt-kpi-card theme-${theme}`}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="rpt-kpi-icon" style={{ background: `${k.color}18`, color: k.color }}>
                    <i className={`fas ${k.icon}`} />
                  </div>
                  <div><p className="rpt-kpi-label">{k.label}</p><h3 className="rpt-kpi-value">{k.value}</h3></div>
                </motion.div>
              ))}
            </div>

            <div className="rpt-two-col">
              {/* By Tax Rate */}
              <motion.div className={`rpt-card theme-${theme}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h4 className="rpt-card-title"><i className="fas fa-percent" /> VAT Breakdown by Rate</h4>
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Tax Rate</th>
                        <th>Type</th>
                        <th className="rpt-num">Invoices</th>
                        <th className="rpt-num">Net Sales</th>
                        <th className="rpt-num">VAT Collected</th>
                        <th className="rpt-num">Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_tax_rate?.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.tax_rate}%</strong></td>
                          <td>
                            <span className={`rpt-tax-badge ${r.tax_status === 'exempt' ? 'rpt-tax-exempt' : 'rpt-tax-taxable'}`}>
                              {r.tax_status}
                            </span>
                          </td>
                          <td className="rpt-num">{r.invoice_count}</td>
                          <td className="rpt-num rpt-val-blue">{fmtN(r.net_sales, sym)}</td>
                          <td className="rpt-num rpt-val-green">{fmtN(r.vat_collected, sym)}</td>
                          <td className="rpt-num">{r.total_units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Monthly VAT Trend */}
              <motion.div className={`rpt-card theme-${theme}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <h4 className="rpt-card-title"><i className="fas fa-chart-bar" /> Monthly VAT Trend</h4>
                {data.trend?.length === 0 && <p className="rpt-no-data">No data for this period.</p>}
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="rpt-num">Invoices</th>
                        <th className="rpt-num">Taxable Amount</th>
                        <th className="rpt-num">VAT Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trend?.map((row, i) => (
                        <tr key={i}>
                          <td>{row.month}</td>
                          <td className="rpt-num">{row.invoice_count}</td>
                          <td className="rpt-num rpt-val-blue">{fmtN(row.taxable_amount, sym)}</td>
                          <td className="rpt-num rpt-val-green">{fmtN(row.vat_collected, sym)}</td>
                        </tr>
                      ))}
                      {data.trend?.length > 0 && (
                        <tr className="rpt-total-row">
                          <td><strong>Total</strong></td>
                          <td className="rpt-num"><strong>{data.summary.total_invoices}</strong></td>
                          <td className="rpt-num rpt-val-blue"><strong>{fmtN(data.summary.total_taxable_amount, sym)}</strong></td>
                          <td className="rpt-num rpt-val-green"><strong>{fmtN(data.summary.total_vat_collected, sym)}</strong></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VatReport;
