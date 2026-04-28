// pages/reports/StaffPerformance.jsx
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

const StaffPerformance = () => {
  const { theme }     = useThemeStore();
  const { showToast } = useToastStore();
  const [nav, setNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState(null);
  const [expanded, setExpanded] = useState(null);
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
      const res = await reportService.getSalesByStaff(filters);
      setData(res.data.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load staff report.', 'error');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { document.title = 'Otelex | Staff Performance'; load(); }, []);

  const tt = data?.team_totals;
  const maxGross = Math.max(...(data?.staff?.map((s) => s.financials?.gross_invoiced) || [1]), 1);

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav pageTitle="Staff Performance"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Reports', to: '/reports/sales' }, { label: 'Staff Performance', active: true }]} />

        <div className={`rpt-filter-bar theme-${theme}`}>
          <div className="rpt-filter-group"><label className="rpt-filter-label">From</label>
            <DatePicker value={filters.from} onChange={(v) => setF('from', v)} /></div>
          <div className="rpt-filter-group"><label className="rpt-filter-label">To</label>
            <DatePicker value={filters.to} onChange={(v) => setF('to', v)} /></div>
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
            {[...Array(3)].map((_, i) => <div key={i} className={`rpt-shimmer theme-${theme}`} style={{ height: 100 }} />)}
          </div>
        )}

        {data && (
          <>
            {/* Team Totals */}
            {tt && (
              <div className="rpt-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { label: 'Team Gross Invoiced', value: fmtN(tt.gross_invoiced, sym), icon: 'fa-users', color: '#1a56db' },
                  { label: 'Total Collected',      value: fmtN(tt.total_collected, sym), icon: 'fa-hand-holding-dollar', color: '#10b981' },
                  { label: 'Team Collection Rate', value: `${tt.collection_rate}%`, icon: 'fa-percent', color: '#8b5cf6' },
                  { label: 'Active Staff',          value: tt.staff_count, icon: 'fa-user-tie', color: '#f59e0b' },
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
            )}

            {/* Staff Cards */}
            {data.staff?.length === 0 && <div className={`rpt-card theme-${theme}`}><p className="rpt-no-data">No staff sales data for this period.</p></div>}
            <div className="rpt-staff-list">
              {data.staff?.map((s, i) => {
                const barPct = (s.financials.gross_invoiced / maxGross) * 100;
                const isOpen = expanded === s.user_id;
                return (
                  <motion.div key={s.user_id} className={`rpt-staff-card theme-${theme}`}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className="rpt-staff-header" onClick={() => setExpanded(isOpen ? null : s.user_id)}>
                      <div className="rpt-staff-left">
                        <div className="rpt-staff-avatar">{s.staff_name?.slice(0,2).toUpperCase()}</div>
                        <div>
                          <p className="rpt-staff-name">{s.staff_name}</p>
                          <p className="rpt-staff-email">{s.staff_email}</p>
                        </div>
                      </div>
                      <div className="rpt-staff-metrics">
                        <div className="rpt-metric"><span className="rpt-metric-val rpt-val-blue">{fmtN(s.financials.gross_invoiced, sym)}</span><span className="rpt-metric-label">Invoiced</span></div>
                        <div className="rpt-metric"><span className="rpt-metric-val rpt-val-green">{fmtN(s.financials.total_collected, sym)}</span><span className="rpt-metric-label">Collected</span></div>
                        <div className="rpt-metric"><span className="rpt-metric-val">{s.financials.collection_rate}%</span><span className="rpt-metric-label">Collect Rate</span></div>
                        <div className="rpt-metric"><span className="rpt-metric-val">{s.quotations.conversion_rate}%</span><span className="rpt-metric-label">Quote Conv.</span></div>
                      </div>
                      <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} rpt-staff-chevron`} />
                    </div>

                    {/* Bar */}
                    <div className="rpt-staff-bar-wrap">
                      <motion.div className="rpt-staff-bar"
                        initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.5, delay: i * 0.06 }} />
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <motion.div className="rpt-staff-detail"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                        <div className="rpt-staff-detail-grid">
                          <div className="rpt-staff-section">
                            <p className="rpt-staff-section-title">Invoices</p>
                            {[
                              { label: 'Total',       value: s.invoices.total },
                              { label: 'Paid',        value: s.invoices.paid },
                              { label: 'Partial',     value: s.invoices.partial },
                              { label: 'Overdue',     value: s.invoices.overdue },
                            ].map((r) => (
                              <div key={r.label} className="rpt-detail-row">
                                <span>{r.label}</span><span>{r.value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="rpt-staff-section">
                            <p className="rpt-staff-section-title">Financials</p>
                            {[
                              { label: 'Gross Invoiced', value: fmtN(s.financials.gross_invoiced, sym) },
                              { label: 'Collected',      value: fmtN(s.financials.total_collected, sym) },
                              { label: 'Outstanding',    value: fmtN(s.financials.total_outstanding, sym) },
                              { label: 'Discounts',      value: fmtN(s.financials.total_discounts, sym) },
                            ].map((r) => (
                              <div key={r.label} className="rpt-detail-row">
                                <span>{r.label}</span><span>{r.value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="rpt-staff-section">
                            <p className="rpt-staff-section-title">Quotations</p>
                            {[
                              { label: 'Total',      value: s.quotations.total },
                              { label: 'Accepted',   value: s.quotations.accepted },
                              { label: 'Converted',  value: s.quotations.converted },
                              { label: 'Rejected',   value: s.quotations.rejected },
                              { label: 'Expired',    value: s.quotations.expired },
                            ].map((r) => (
                              <div key={r.label} className="rpt-detail-row">
                                <span>{r.label}</span><span>{r.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffPerformance;
