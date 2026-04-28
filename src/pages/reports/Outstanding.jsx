// pages/reports/Outstanding.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import reportService from '../../services/reportService';
import './Reports.css';

const fmtN = (n, sym = '₦') => sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

const BUCKET_COLORS = {
  0: { bg: '#10b981', label: 'Current',    cls: 'rpt-bucket-current' },
  1: { bg: '#f59e0b', label: '1–30 days',  cls: 'rpt-bucket-1' },
  2: { bg: '#f97316', label: '31–60 days', cls: 'rpt-bucket-2' },
  3: { bg: '#ef4444', label: '61–90 days', cls: 'rpt-bucket-3' },
  4: { bg: '#7f1d1d', label: '90+ days',   cls: 'rpt-bucket-4' },
};

const Outstanding = () => {
  const { theme }     = useThemeStore();
  const { showToast } = useToastStore();
  const navigate      = useNavigate();
  const [nav, setNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ currency: 'NGN', bucket: '' });
  const setF = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const sym  = filters.currency === 'USD' ? '$' : '₦';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { currency: filters.currency };
      if (filters.bucket !== '') params.bucket = filters.bucket;
      const res = await reportService.getInvoiceAging(params);
      setData(res.data.data);
      setSummary(res.data.summary);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load aging report.', 'error');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { document.title = 'Otelex | Outstanding Invoices'; load(); }, []);

  const maxBucketBalance = Math.max(...(summary?.buckets?.map((b) => b.total_balance) || [1]), 1);

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav pageTitle="Outstanding Invoices"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Reports', to: '/reports/sales' }, { label: 'Outstanding', active: true }]} />

        <div className={`rpt-filter-bar theme-${theme}`}>
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
            <label className="rpt-filter-label">Aging Bucket</label>
            <div className="rpt-currency-toggle">
              {[{ v: '', l: 'All' }, { v: 0, l: 'Current' }, { v: 1, l: '1-30' }, { v: 2, l: '31-60' }, { v: 3, l: '61-90' }, { v: 4, l: '90+' }].map((o) => (
                <button key={o.l} type="button"
                  className={`rpt-cur-btn ${filters.bucket === o.v ? 'is-active' : ''}`}
                  onClick={() => setF('bucket', o.v)}>{o.l}</button>
              ))}
            </div>
          </div>
          <button className="rpt-run-btn" onClick={load} disabled={loading} type="button">
            {loading ? <><span className="rpt-spinner" /> Loading...</> : <><i className="fas fa-rotate-right" /> Run</>}
          </button>
        </div>

        {loading && !data && (
          <div className="rpt-loading">
            {[...Array(4)].map((_, i) => <div key={i} className={`rpt-shimmer theme-${theme}`} style={{ height: 80 }} />)}
          </div>
        )}

        {summary && (
          <>
            {/* Summary KPIs */}
            <div className="rpt-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              {[
                { label: 'Total Outstanding', value: fmtN(summary.total_outstanding, sym), icon: 'fa-triangle-exclamation', color: '#ef4444' },
                { label: 'Invoices',          value: summary.total_invoices,               icon: 'fa-file-invoice',         color: '#1a56db' },
                { label: 'Overdue (90+ days)',value: summary.buckets?.[4]?.count || 0,      icon: 'fa-clock',                color: '#7f1d1d' },
              ].map((k, i) => (
                <motion.div key={k.label} className={`rpt-kpi-card theme-${theme}`}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="rpt-kpi-icon" style={{ background: `${k.color}18`, color: k.color }}>
                    <i className={`fas ${k.icon}`} />
                  </div>
                  <div><p className="rpt-kpi-label">{k.label}</p><h3 className="rpt-kpi-value">{k.value}</h3></div>
                </motion.div>
              ))}
            </div>

            {/* Aging Buckets */}
            <motion.div className={`rpt-card theme-${theme}`}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h4 className="rpt-card-title"><i className="fas fa-hourglass-half" /> Aging Buckets</h4>
              <div className="rpt-buckets">
                {summary.buckets?.map((bk, bi) => {
                  const meta = BUCKET_COLORS[bi] || BUCKET_COLORS[0];
                  const barPct = (bk.total_balance / maxBucketBalance) * 100;
                  return (
                    <div key={bi} className="rpt-bucket-row">
                      <div className="rpt-bucket-label">
                        <span className="rpt-bucket-dot" style={{ background: meta.bg }} />
                        <span>{meta.label}</span>
                      </div>
                      <div className="rpt-bucket-bar-wrap">
                        <motion.div className="rpt-bucket-bar"
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ duration: 0.5, delay: bi * 0.05 }}
                          style={{ background: meta.bg }} />
                      </div>
                      <span className="rpt-bucket-count">{bk.count} inv.</span>
                      <span className="rpt-bucket-total">{fmtN(bk.total_balance, sym)}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Invoice Table */}
            {data?.length > 0 && (
              <motion.div className={`rpt-card theme-${theme}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <h4 className="rpt-card-title"><i className="fas fa-list" /> Outstanding Invoices ({data.length})</h4>
                <div className="rpt-table-wrap">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Client</th>
                        <th className="rpt-num">Due Date</th>
                        <th className="rpt-num">Total</th>
                        <th className="rpt-num">Paid</th>
                        <th className="rpt-num">Balance Due</th>
                        <th>Aging</th>
                        <th className="rpt-num">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((inv) => {
                        const meta = BUCKET_COLORS[inv.aging_bucket] || BUCKET_COLORS[0];
                        return (
                          <tr key={inv.invoice_id} className="rpt-row-link" onClick={() => navigate(`/invoices/${inv.invoice_id}`)}>
                            <td><span className="rpt-link-cell">{inv.invoice_number}</span></td>
                            <td>{inv.company_name}</td>
                            <td className="rpt-num">{inv.due_date}</td>
                            <td className="rpt-num">{fmtN(inv.total_amount, sym)}</td>
                            <td className="rpt-num rpt-val-green">{fmtN(inv.amount_paid, sym)}</td>
                            <td className="rpt-num rpt-val-red">{fmtN(inv.balance_due, sym)}</td>
                            <td>
                              <span className="rpt-aging-badge" style={{ background: `${meta.bg}20`, color: meta.bg }}>
                                {inv.aging_label}
                              </span>
                            </td>
                            <td className="rpt-num">{inv.days_overdue > 0 ? `${inv.days_overdue}d` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            {data?.length === 0 && (
              <div className={`rpt-card theme-${theme}`}><p className="rpt-no-data">No outstanding invoices. 🎉</p></div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Outstanding;
