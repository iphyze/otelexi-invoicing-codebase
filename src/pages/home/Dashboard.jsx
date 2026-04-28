// pages/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useAuthStore from '../../stores/useAuthStore';
import useThemeStore from '../../stores/useThemeStore';
import useDashboardStore from '../../stores/useDashboardStore';
import './Dashboard.css';

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (n, currency = 'NGN') => {
  const symbol = currency === 'USD' ? '$' : '₦';
  return symbol + Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};
const fmtShort = (n, currency = 'NGN') => {
  const symbol = currency === 'USD' ? '$' : '₦';
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${symbol}${(num / 1_000).toFixed(1)}K`;
  return `${symbol}${num.toFixed(2)}`;
};

const methodLabel = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash', cheque: 'Cheque', pos: 'POS', other: 'Other',
};

// ── Shimmer skeleton ──────────────────────────────────────────────
const Skel = ({ w = '100%', h = 16, r = 6 }) => (
  <span className="db-skel" style={{ width: w, height: h, borderRadius: r }} />
);

const SkelRows = ({ n = 4 }) => (
  <div className="db-skel-rows">
    {[...Array(n)].map((_, i) => <div key={i} className="db-skel-row" />)}
  </div>
);

// ── KPI Card ──────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, subIcon, gradient, glow, delay, onClick, loading }) => (
  <motion.div
    className={`kpi-card ${onClick ? 'clickable' : ''}`}
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.38, delay, ease: 'easeOut' }}
    onClick={onClick}
  >
    <div className="kpi-accent" style={{ background: `linear-gradient(180deg, ${gradient[0]}, ${gradient[1]})` }} />
    <div className="kpi-icon-wrap" style={{
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      boxShadow: `0 8px 20px ${glow}`,
    }}>
      <i className={`fas ${icon}`} />
    </div>
    <div className="kpi-body">
      <p className="kpi-label">{label}</p>
      <h3 className="kpi-value">{loading ? <Skel w={90} h={24} /> : (value ?? '—')}</h3>
      {sub !== undefined && (
        <p className="kpi-sub">
          {loading ? <Skel w={120} h={12} /> : (
            <>{subIcon && <i className={`fas ${subIcon}`} />} {sub ?? '—'}</>
          )}
        </p>
      )}
    </div>
    <div className="kpi-blob" style={{ background: `radial-gradient(circle at top right, ${gradient[0]}18, transparent 70%)` }} />
  </motion.div>
);

// ── Status Pill ───────────────────────────────────────────────────
const statusMap = {
  draft: { cls: 'st-draft', label: 'Draft' },
  sent: { cls: 'st-sent', label: 'Sent' },
  partial: { cls: 'st-partial', label: 'Partial' },
  paid: { cls: 'st-paid', label: 'Paid' },
  overdue: { cls: 'st-overdue', label: 'Overdue' },
  cancelled: { cls: 'st-cancelled', label: 'Cancelled' },
};
const StatusPill = ({ status }) => {
  const { cls, label } = statusMap[status] || statusMap.draft;
  return <span className={`st-pill ${cls}`}>{label}</span>;
};

// ── Panel shell ───────────────────────────────────────────────────
const Panel = ({ title, icon, action, onAction, children, delay = 0 }) => {
  const { theme } = useThemeStore();
  return (
    <motion.div
      className={`db-panel theme-${theme}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <div className="db-panel-header">
        <h4><i className={`fas ${icon}`} /> {title}</h4>
        {action && (
          <button className="db-panel-link" onClick={onAction} type="button">{action}</button>
        )}
      </div>
      {children}
    </motion.div>
  );
};

const Empty = ({ icon, text }) => (
  <div className="db-empty">
    <i className={`fas ${icon}`} />
    <p>{text}</p>
  </div>
);

// ── Revenue Bar Chart (pure CSS) ──────────────────────────────────
const RevenueChart = ({ trend, currency }) => {
  if (!trend || trend.length === 0) return <Empty icon="fa-chart-bar" text="No revenue data yet" />;
  const max = Math.max(...trend.flatMap((t) => [t.invoiced, t.collected]), 1);
  return (
    <div className="rev-chart">
      <div className="rev-bars-row">
        {trend.map((t) => {
          const [y, m] = t.month.split('-');
          const label = new Date(y, m - 1).toLocaleString('en', { month: 'short' });
          return (
            <div key={t.month} className="rev-col">
              <div className="rev-bars">
                <div className="rev-bar invoiced" style={{ height: `${Math.round((t.invoiced / max) * 100)}%` }}
                  title={`Invoiced: ${fmtShort(t.invoiced, currency)}`} />
                <div className="rev-bar collected" style={{ height: `${Math.round((t.collected / max) * 100)}%` }}
                  title={`Collected: ${fmtShort(t.collected, currency)}`} />
              </div>
              <span className="rev-month">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="rev-legend">
        <span><span className="rev-dot invoiced" /> Invoiced</span>
        <span><span className="rev-dot collected" /> Collected</span>
      </div>
    </div>
  );
};

// ── Aging Horizontal Bars ─────────────────────────────────────────
const AgingChart = ({ aging, currency }) => {
  if (!aging || aging.every((a) => a.count === 0))
    return <Empty icon="fa-clock" text="No outstanding invoices" />;
  const maxAmt = Math.max(...aging.map((a) => a.amount), 1);
  const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#dc2626'];
  return (
    <div className="aging-chart">
      {aging.map((bucket, i) => (
        <div key={bucket.bracket} className="aging-row">
          <span className="aging-label">{bucket.label}</span>
          <div className="aging-track">
            <div className="aging-fill" style={{ width: `${Math.round((bucket.amount / maxAmt) * 100)}%`, background: colors[i] }} />
          </div>
          <div className="aging-meta">
            <span className="aging-count">{bucket.count}</span>
            <span className="aging-amount">{fmtShort(bucket.amount, currency)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────
const Dashboard = () => {
  const [nav, setNav] = useState(false);
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data, loading, error, currency, setCurrency, fetchDashboard } = useDashboardStore();
  const { meta, kpis, charts, lists } = data;

  useEffect(() => {
    document.title = 'Otelex | Dashboard';
    fetchDashboard();
  }, []);

  const cur = meta?.currency || currency;
  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';

  const kpiCards = [
    {
      icon: 'fa-file-invoice-dollar', label: 'Invoiced (This Month)',
      value: kpis ? fmtShort(kpis.revenue.gross_invoiced_mtd, cur) : null,
      sub: kpis ? `${kpis.invoices.total_mtd} invoice(s) issued` : null,
      subIcon: 'fa-file',
      gradient: ['#1a56db', '#1e3a8a'], glow: 'rgba(26,86,219,0.28)',
      delay: 0.05, onClick: () => navigate('/invoices'),
    },
    {
      icon: 'fa-money-bill-trend-up', label: 'Collected (This Month)',
      value: kpis ? fmtShort(kpis.revenue.collected_mtd, cur) : null,
      sub: kpis ? `${kpis.revenue.collection_rate}% collection rate` : null,
      subIcon: 'fa-percent',
      gradient: ['#10b981', '#059669'], glow: 'rgba(16,185,129,0.28)',
      delay: 0.10, onClick: () => navigate('/invoices/payments'),
    },
    {
      icon: 'fa-clock', label: 'Outstanding',
      value: kpis ? fmtShort(kpis.revenue.total_outstanding, cur) : null,
      sub: kpis ? `${kpis.invoices.open_count} open invoice(s)` : null,
      subIcon: 'fa-file-circle-exclamation',
      gradient: ['#f59e0b', '#d97706'], glow: 'rgba(245,158,11,0.28)',
      delay: 0.15, onClick: () => navigate('/reports/outstanding'),
    },
    {
      icon: 'fa-triangle-exclamation', label: 'Overdue',
      value: kpis ? fmtShort(kpis.revenue.total_overdue, cur) : null,
      sub: kpis ? `${kpis.invoices.overdue_count} overdue invoice(s)` : null,
      subIcon: 'fa-exclamation',
      gradient: ['#ef4444', '#dc2626'], glow: 'rgba(239,68,68,0.28)',
      delay: 0.20, onClick: () => navigate('/invoices'),
    },
    {
      icon: 'fa-circle-check', label: 'Paid (This Month)',
      value: kpis ? String(kpis.invoices.paid_mtd) : null,
      sub: kpis ? `${kpis.invoices.draft_count} draft(s) pending` : null,
      subIcon: 'fa-pen',
      gradient: ['#8b5cf6', '#7c3aed'], glow: 'rgba(139,92,246,0.28)',
      delay: 0.25, onClick: () => navigate('/invoices'),
    },
  ];

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav pageTitle="Dashboard" links={[{ label: 'Home', to: '/', active: true }]} />

        {/* ── Welcome + Currency ── */}
        <motion.div
          className={`welcome-banner theme-${theme}`}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="welcome-text">
            <h2>Welcome back, <span>{user?.name?.split(' ')[0] || 'there'}</span> 👋</h2>
            <p>
              {meta
                ? `${new Date().toLocaleString('en', { month: 'long', year: 'numeric' })} · Last updated ${meta.generated_at?.slice(11, 16)}`
                : 'Loading your dashboard...'}
            </p>
          </div>
          <div className="welcome-right">
            <div className="currency-toggle">
              {['NGN', 'USD'].map((c) => (
                <button key={c} className={`cur-btn ${currency === c ? 'is-active' : ''}`}
                  onClick={() => setCurrency(c)} type="button">
                  {c === 'NGN' ? '₦ NGN' : '$ USD'}
                </button>
              ))}
            </div>
            <div className="welcome-badge"><i className="fas fa-chart-line" /></div>
          </div>
        </motion.div>

        {/* ── Error ── */}
        {error && !loading && (
          <div className={`db-error theme-${theme}`}>
            <i className="fas fa-triangle-exclamation" />
            <span>{error}</span>
            <button onClick={() => fetchDashboard()} type="button">
              <i className="fas fa-rotate-right" /> Retry
            </button>
          </div>
        )}

        {/* ── KPI Grid ── */}
        <div className="kpi-grid">
          {kpiCards.map((card) => <KpiCard key={card.label} {...card} loading={loading} />)}
        </div>

        {/* ── Quotation Strip ── */}
        <motion.div
          className={`quote-strip theme-${theme}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.3 }}
        >
          {[
            { label: 'Quotations (Month)', val: kpis?.quotations.total_mtd, icon: 'fa-file-pen', color: '#8b5cf6' },
            { label: 'Accepted', val: kpis?.quotations.accepted_mtd, icon: 'fa-circle-check', color: '#10b981' },
            { label: 'Converted', val: kpis?.quotations.converted_mtd, icon: 'fa-arrows-turn-to-dots', color: '#1a56db' },
            { label: 'Awaiting Response', val: kpis?.quotations.pending_mtd, icon: 'fa-hourglass-half', color: '#f59e0b' },
          ].map((q) => (
            <div key={q.label} className="quote-chip">
              <i className={`fas ${q.icon}`} style={{ color: q.color }} />
              <span className="quote-chip-val">
                {loading ? <Skel w={24} h={16} /> : (q.val ?? '—')}
              </span>
              <span className="quote-chip-label">{q.label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Charts Row ── */}
        <div className="db-charts-grid">
          <Panel title="Revenue Trend (6 Months)" icon="fa-chart-line" delay={0.15}>
            {loading
              ? <div style={{ padding: '8px 0' }}><Skel w="100%" h={160} r={10} /></div>
              : <RevenueChart trend={charts?.revenue_trend} currency={cur} />
            }
          </Panel>
          <Panel title="Invoice Aging" icon="fa-clock" action="View Report" onAction={() => navigate('/reports/outstanding')} delay={0.2}>
            {loading ? <SkelRows n={5} /> : <AgingChart aging={charts?.invoice_aging} currency={cur} />}
          </Panel>
        </div>

        {/* ── Lower Grid ── */}
        <div className="db-lower-grid">

          {/* Recent Invoices */}
          <Panel title="Recent Invoices" icon="fa-file-invoice" action="View all" onAction={() => navigate('/invoices')} delay={0.25}>
            {loading ? <SkelRows /> :
              !lists?.recent_invoices?.length ? <Empty icon="fa-file-circle-xmark" text="No invoices yet" /> :
                <div className="inv-list">
                  {lists.recent_invoices.map((inv) => (
                    <div key={inv.id} className="inv-row" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <div className="inv-row-left">
                        <p className="inv-number">{inv.invoice_number}</p>
                        <p className="inv-client">{inv.client_name}</p>
                      </div>
                      <div className="inv-row-right">
                        <StatusPill status={inv.is_overdue ? 'overdue' : inv.status} />
                        <p className="inv-amount">{fmt(inv.total_amount, inv.currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </Panel>

          {/* Recent Payments */}
          <Panel title="Recent Payments" icon="fa-money-bill-wave" action="View all" onAction={() => navigate('/invoices/payments')} delay={0.30}>
            {loading ? <SkelRows /> :
              !lists?.recent_payments?.length ? <Empty icon="fa-receipt" text="No payments recorded yet" /> :
                <div className="pay-list">
                  {lists.recent_payments.map((p) => (
                    <div key={p.id} className="pay-row">
                      <div className="pay-row-left">
                        <div className="pay-icon"><i className="fas fa-money-bill" /></div>
                        <div>
                          <p className="pay-client">{p.client_name}</p>
                          <p className="pay-meta">{p.invoice_number} · {methodLabel[p.payment_method] || p.payment_method}</p>
                        </div>
                      </div>
                      <div className="pay-row-right">
                        <p className="pay-amount">{fmt(p.amount, p.currency)}</p>
                        <p className="pay-date">{new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </Panel>

          {/* Right Column */}
          <div className="db-right-col">

            {/* Top Products */}
            <Panel title="Top Products (Month)" icon="fa-trophy" delay={0.35}>
              {loading ? <SkelRows n={5} /> :
                !lists?.top_products?.length ? <Empty icon="fa-boxes-stacked" text="No product sales this month" /> :
                  <div className="top-prod-list">
                    {lists.top_products.map((p, i) => (
                      <div key={p.product_id} className="top-prod-row" onClick={() => navigate(`/products/${p.product_id}`)}>
                        <span className={`top-prod-rank rank-${i + 1}`}>{i + 1}</span>
                        <div className="top-prod-info">
                          <p className="top-prod-name">{p.product_name}</p>
                          <p className="top-prod-sku">{p.sku} · {p.total_quantity} units</p>
                        </div>
                        <span className="top-prod-rev">{fmtShort(p.total_revenue, cur)}</span>
                      </div>
                    ))}
                  </div>
              }
            </Panel>

            {/* Low Stock (Admin + Accountant) */}
            {(isAdmin || isAccountant) && (
              <Panel title="Low Stock Alerts" icon="fa-triangle-exclamation" action="View all" onAction={() => navigate('/products')} delay={0.40}>
                {loading ? <SkelRows n={4} /> :
                  !lists?.low_stock_alerts?.length ? <Empty icon="fa-boxes-stacked" text="All stock levels healthy" /> :
                    <div className="stock-list">
                      {lists.low_stock_alerts.map((item) => (
                        <div key={item.product_id} className="stock-row" onClick={() => navigate(`/products/${item.product_id}`)}>
                          <div className="stock-row-left">
                            <div className={`stock-dot ${item.alert_type === 'out_of_stock' ? 'dot-out' : 'dot-low'}`} />
                            <div>
                              <p className="stock-name">{item.product_name}</p>
                              <p className="stock-sku">{item.sku}</p>
                            </div>
                          </div>
                          <div className="stock-row-right">
                            <span className={`stock-qty ${item.alert_type === 'out_of_stock' ? 'qty-out' : 'qty-low'}`}>
                              {item.stock_quantity} left
                            </span>
                            <p className="stock-reorder">Reorder at {item.reorder_level}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </Panel>
            )}

            {/* Quick Actions */}
            <Panel title="Quick Actions" icon="fa-bolt" delay={0.45}>
              <div className="quick-action-list">
                {[
                  { label: 'New Invoice', icon: 'fa-file-invoice', to: '/invoices/new', g: ['#1a56db', '#1e3a8a'], glow: 'rgba(26,86,219,0.28)' },
                  { label: 'New Quotation', icon: 'fa-file-pen', to: '/quotations/new', g: ['#8b5cf6', '#7c3aed'], glow: 'rgba(139,92,246,0.25)' },
                  { label: 'New Proforma', icon: 'fa-file-circle-check', to: '/proformas/new', g: ['#10b981', '#059669'], glow: 'rgba(16,185,129,0.25)' },
                  { label: 'Add Client', icon: 'fa-user-plus', to: '/clients', g: ['#f59e0b', '#d97706'], glow: 'rgba(245,158,11,0.25)' },
                  { label: 'Add Product', icon: 'fa-boxes-stacked', to: '/products', g: ['#3b82f6', '#2563eb'], glow: 'rgba(59,130,246,0.25)' },
                ].map((a) => (
                  <button key={a.label} className="quick-action-btn" onClick={() => navigate(a.to)} type="button">
                    <div className="qa-icon" style={{ background: `linear-gradient(135deg, ${a.g[0]}, ${a.g[1]})`, boxShadow: a.glow }}>
                      <i className={`fas ${a.icon}`} />
                    </div>
                    <span>{a.label}</span>
                    <i className="fas fa-arrow-right qa-arrow" />
                  </button>
                ))}
              </div>
            </Panel>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;