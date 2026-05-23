// pages/home/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import useAuthStore from '../../stores/useAuthStore';
import useDashboardStore from '../../stores/useDashboardStore';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import automationService from '../../services/automationService';
import './Dashboard.css';

const PERIOD_OPTIONS = [
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year to Date' },
];

const METHOD_LABELS = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  pos: 'POS',
  online: 'Online',
  other: 'Other',
};

const STATUS_META = {
  draft: { label: 'Draft', className: 'st-draft', color: '#94a3b8' },
  sent: { label: 'Sent', className: 'st-sent', color: '#2563eb' },
  partial: { label: 'Partially Paid', className: 'st-partial', color: '#f59e0b' },
  paid: { label: 'Paid', className: 'st-paid', color: '#10b981' },
  overdue: { label: 'Overdue', className: 'st-overdue', color: '#ef4444' },
  cancelled: { label: 'Cancelled', className: 'st-cancelled', color: '#64748b' },
};

const formatCurrency = (value, currency = 'NGN') => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const formatShortCurrency = (value, currency = 'NGN') => {
  const amount = Number(value || 0);
  const symbol = currency === 'USD' ? '$' : '₦';
  if (Math.abs(amount) >= 1_000_000_000) return `${symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatUpdatedTime = (value) => {
  if (!value) return 'Updating...';
  return new Date(value).toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRunDateTime = (value) => {
  if (!value) return 'Never run';
  return new Date(value.replace(' ', 'T')).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const plural = (count, singular, pluralText = `${singular}s`) => (
  `${count} ${Number(count) === 1 ? singular : pluralText}`
);

const Skeleton = ({ width = '100%', height = 14, radius = 7 }) => (
  <span className="db-skel" style={{ width, height, borderRadius: radius }} />
);

const SkeletonRows = ({ rows = 4 }) => (
  <div className="db-skel-rows">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="db-skel-row" />
    ))}
  </div>
);

const EmptyState = ({ icon, title, text }) => (
  <div className="db-empty">
    <i className={`fas ${icon}`} />
    <p className="db-empty-title">{title}</p>
    {text && <p className="db-empty-text">{text}</p>}
  </div>
);

const Panel = ({ title, icon, action, onAction, children, className = '', delay = 0 }) => (
  <motion.section
    className={`db-panel ${className}`}
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.33, delay, ease: 'easeOut' }}
  >
    <header className="db-panel-header">
      <h3><i className={`fas ${icon}`} /> {title}</h3>
      {action && (
        <button type="button" className="db-panel-link" onClick={onAction}>
          {action} <i className="fas fa-arrow-right" />
        </button>
      )}
    </header>
    {children}
  </motion.section>
);

const DeltaBadge = ({ change, loading }) => {
  if (loading) return <Skeleton width={78} height={18} radius={20} />;
  if (change === undefined) return <span className="delta-badge delta-live">Live</span>;
  if (change === null) return <span className="delta-badge delta-new">New activity</span>;
  if (Number(change) === 0) return <span className="delta-badge delta-flat">No change</span>;

  const positive = Number(change) > 0;
  return (
    <span className={`delta-badge ${positive ? 'delta-positive' : 'delta-negative'}`}>
      <i className={`fas ${positive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} />
      {Math.abs(Number(change)).toFixed(1)}%
    </span>
  );
};

const KpiCard = ({ icon, label, value, subText, change, tone, delay, onClick, loading }) => (
  <motion.button
    type="button"
    className={`db-kpi db-kpi-${tone}`}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.34, delay }}
    onClick={onClick}
  >
    <div className="db-kpi-head">
      <span className="db-kpi-icon"><i className={`fas ${icon}`} /></span>
      <DeltaBadge change={change} loading={loading} />
    </div>
    <p className="db-kpi-label">{label}</p>
    <h3 className="db-kpi-value">{loading ? <Skeleton width={112} height={29} /> : value}</h3>
    <p className="db-kpi-sub">{loading ? <Skeleton width={142} height={13} /> : subText}</p>
  </motion.button>
);

const InsightCard = ({ icon, label, value, loading }) => (
  <div className="db-insight-card">
    <i className={`fas ${icon}`} />
    <div>
      <p>{label}</p>
      <strong>{loading ? <Skeleton width={65} height={18} /> : value}</strong>
    </div>
  </div>
);

const StatusPill = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return <span className={`st-pill ${meta.className}`}>{meta.label}</span>;
};

const RevenueChart = ({ data, currency, loading }) => {
  if (loading) return <Skeleton width="100%" height={235} radius={14} />;
  if (!data?.length || data.every((item) => item.invoiced === 0 && item.collected === 0)) {
    return <EmptyState icon="fa-chart-column" title="No sales trend yet" text="Finalised invoices and received payments will appear here." />;
  }

  const maximum = Math.max(...data.flatMap((item) => [item.invoiced, item.collected]), 1);

  return (
    <div className="db-revenue-chart">
      <div className="db-chart-bars">
        {data.map((item) => (
          <div key={item.month} className="db-chart-column">
            <div className="db-chart-bar-group">
              <span
                className="db-chart-bar bar-invoiced"
                style={{ height: `${Math.max((item.invoiced / maximum) * 100, item.invoiced > 0 ? 4 : 0)}%` }}
                title={`Invoiced: ${formatCurrency(item.invoiced, currency)}`}
              />
              <span
                className="db-chart-bar bar-collected"
                style={{ height: `${Math.max((item.collected / maximum) * 100, item.collected > 0 ? 4 : 0)}%` }}
                title={`Collected: ${formatCurrency(item.collected, currency)}`}
              />
            </div>
            <span className="db-chart-label">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="db-chart-legend">
        <span><i className="legend-dot invoiced" /> Invoiced</span>
        <span><i className="legend-dot collected" /> Collected</span>
      </div>
    </div>
  );
};

const StatusDistribution = ({ data, loading }) => {
  const populated = (data || []).filter((item) => item.count > 0);
  const total = populated.reduce((sum, item) => sum + item.count, 0);

  const donutBackground = useMemo(() => {
    if (!total) return 'conic-gradient(#e2e8f0 0 100%)';
    let previous = 0;
    const segments = populated.map((item) => {
      const start = previous;
      previous += (item.count / total) * 100;
      const color = STATUS_META[item.status]?.color || '#94a3b8';
      return `${color} ${start}% ${previous}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [populated, total]);

  if (loading) return <Skeleton width="100%" height={235} radius={14} />;
  if (!total) return <EmptyState icon="fa-chart-pie" title="No invoice status data" text="Invoices for the selected period will appear here." />;

  return (
    <div className="db-status-distribution">
      <div className="db-donut" style={{ background: donutBackground }}>
        <div className="db-donut-centre">
          <strong>{total}</strong>
          <span>Invoices</span>
        </div>
      </div>
      <div className="db-status-legend">
        {populated.map((item) => (
          <div key={item.status} className="db-status-row">
            <span className="db-status-dot" style={{ background: STATUS_META[item.status]?.color }} />
            <span className="db-status-name">{item.label}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const AgingChart = ({ data, currency, loading }) => {
  if (loading) return <SkeletonRows rows={5} />;
  if (!data?.length || data.every((item) => item.count === 0)) {
    return <EmptyState icon="fa-face-smile" title="No outstanding invoices" text="There are no open receivables in this currency." />;
  }

  const maximum = Math.max(...data.map((item) => item.amount), 1);
  const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c'];

  return (
    <div className="db-aging-list">
      {data.map((item, index) => (
        <div key={item.bracket} className="db-aging-row">
          <div className="db-aging-meta">
            <span>{item.label}</span>
            <strong>{formatShortCurrency(item.amount, currency)}</strong>
          </div>
          <div className="db-aging-line">
            <span style={{ width: `${(item.amount / maximum) * 100}%`, background: colors[index] }} />
          </div>
          <small>{plural(item.count, 'invoice')}</small>
        </div>
      ))}
    </div>
  );
};

const PaymentMethods = ({ data, currency, loading }) => {
  if (loading) return <SkeletonRows rows={4} />;
  if (!data?.length) {
    return <EmptyState icon="fa-wallet" title="No payments collected" text="Recorded payments in this period will appear here." />;
  }

  const maximum = Math.max(...data.map((item) => item.amount), 1);

  return (
    <div className="db-payment-methods">
      {data.map((item) => (
        <div className="db-method-row" key={item.method}>
          <div className="db-method-head">
            <span>{METHOD_LABELS[item.method] || item.method}</span>
            <strong>{formatShortCurrency(item.amount, currency)}</strong>
          </div>
          <div className="db-method-line"><span style={{ width: `${(item.amount / maximum) * 100}%` }} /></div>
          <small>{plural(item.count, 'payment')}</small>
        </div>
      ))}
    </div>
  );
};

const Pipeline = ({ data, loading, navigate }) => {
  const stages = [
    {
      title: 'Quotations',
      icon: 'fa-file-pen',
      route: '/quotations',
      accent: 'purple',
      values: [
        { label: 'Created', value: data?.quotations?.total },
        { label: 'Accepted', value: data?.quotations?.accepted },
        { label: 'Converted', value: data?.quotations?.converted },
      ],
    },
    {
      title: 'Proformas',
      icon: 'fa-file-circle-check',
      route: '/proformas',
      accent: 'teal',
      values: [
        { label: 'Created', value: data?.proformas?.total },
        { label: 'Approved', value: data?.proformas?.approved },
        { label: 'Converted', value: data?.proformas?.converted },
      ],
    },
    {
      title: 'Invoices',
      icon: 'fa-file-invoice-dollar',
      route: '/invoices',
      accent: 'blue',
      values: [
        { label: 'Issued', value: data?.invoices?.issued },
        { label: 'Paid', value: data?.invoices?.paid },
        { label: 'Open', value: data?.invoices?.open },
      ],
    },
  ];

  return (
    <div className="db-pipeline">
      {stages.map((stage, index) => (
        <React.Fragment key={stage.title}>
          <button type="button" className={`db-pipeline-stage stage-${stage.accent}`} onClick={() => navigate(stage.route)}>
            <div className="db-stage-title"><i className={`fas ${stage.icon}`} /> {stage.title}</div>
            <div className="db-stage-values">
              {stage.values.map((value) => (
                <div key={value.label}>
                  <strong>{loading ? <Skeleton width={25} height={19} /> : (value.value ?? 0)}</strong>
                  <span>{value.label}</span>
                </div>
              ))}
            </div>
          </button>
          {index < stages.length - 1 && <i className="fas fa-chevron-right db-pipeline-arrow" />}
        </React.Fragment>
      ))}
    </div>
  );
};

const AttentionList = ({ attention, currency, loading, navigate }) => {
  if (loading) return <SkeletonRows rows={5} />;

  const items = [
    ...(attention?.overdue_invoices || []).map((item) => ({
      key: `invoice-${item.id}`,
      icon: 'fa-triangle-exclamation',
      tone: 'urgent',
      title: item.invoice_number,
      description: `${item.client_name} · ${item.days_overdue} day(s) overdue`,
      amount: formatShortCurrency(item.balance_due, item.currency || currency),
      route: `/invoices/${item.id}`,
    })),
    ...(attention?.expiring_quotations || []).map((item) => ({
      key: `quotation-${item.id}`,
      icon: 'fa-file-circle-exclamation',
      tone: 'warning',
      title: item.number,
      description: `${item.client_name} · expires ${formatDate(item.expiry_date)}`,
      amount: 'Quotation',
      route: `/quotations/${item.id}`,
    })),
    ...(attention?.expiring_proformas || []).map((item) => ({
      key: `proforma-${item.id}`,
      icon: 'fa-hourglass-half',
      tone: 'warning',
      title: item.number,
      description: `${item.client_name} · expires ${formatDate(item.expiry_date)}`,
      amount: 'Proforma',
      route: `/proformas/${item.id}`,
    })),
  ].slice(0, 7);

  if (!items.length) {
    return <EmptyState icon="fa-circle-check" title="Nothing urgent" text="No overdue invoices or documents expiring within 7 days." />;
  }

  return (
    <div className="db-attention-list">
      {items.map((item) => (
        <button type="button" key={item.key} className="db-attention-row" onClick={() => navigate(item.route)}>
          <i className={`fas ${item.icon} attention-${item.tone}`} />
          <div>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </div>
          <small>{item.amount}</small>
        </button>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const [nav, setNav] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState('');
  const {
    data,
    loading,
    refreshing,
    error,
    filters,
    setCurrency,
    setPeriod,
    fetchDashboard,
    refreshDashboard,
  } = useDashboardStore();

  const { meta, kpis, charts, lists } = data;
  const currency = meta?.currency || filters.currency;
  const isSuperAdmin = user?.role === 'super_admin';
  const canViewReports = meta?.can_view_financial_reports ?? ['super_admin', 'admin', 'accounting'].includes(user?.role);
  const canManageStock = ['super_admin', 'admin'].includes(user?.role);
  const canCreateDocuments = ['super_admin', 'admin', 'sales'].includes(user?.role);

  useEffect(() => {
    document.title = 'Otelex | Dashboard';
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    automationService.getDocumentMaintenanceStatus()
      .then((response) => {
        setMaintenance(response.data?.data || null);
        setMaintenanceError('');
      })
      .catch((requestError) => {
        setMaintenanceError(
          requestError.response?.data?.message || 'Unable to load document-check status.'
        );
      });
  }, [isSuperAdmin]);

  const handleMaintenanceRun = async () => {
    setMaintenanceLoading(true);
    setMaintenanceError('');

    try {
      const response = await automationService.runDocumentMaintenance();
      const result = response.data?.data || {};

      showToast(
        `Checks complete: ${result.invoices_marked_overdue || 0} overdue invoice(s), ${result.quotation_expired_count || 0} expired quotation(s), ${result.proforma_expired_count || 0} expired proforma(s), ${result.reminders_sent || 0} reminder(s) sent.`,
        'success'
      );

      const statusResponse = await automationService.getDocumentMaintenanceStatus();
      setMaintenance(statusResponse.data?.data || null);
      refreshDashboard();
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Document checks could not be completed.';
      setMaintenanceError(message);
      showToast(message, 'error');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const outstandingRoute = canViewReports ? '/reports/outstanding' : '/invoices';
  const periodLabel = meta?.period?.label || 'This Month';

  const kpiCards = [
    {
      icon: 'fa-file-invoice-dollar',
      label: `Invoiced · ${periodLabel}`,
      value: formatShortCurrency(kpis?.revenue?.gross_invoiced, currency),
      subText: plural(kpis?.invoices?.issued_count || 0, 'invoice'),
      change: kpis?.revenue?.invoiced_change_percent,
      tone: 'primary',
      route: '/invoices',
    },
    {
      icon: 'fa-money-check-dollar',
      label: `Collected · ${periodLabel}`,
      value: formatShortCurrency(kpis?.revenue?.collected, currency),
      subText: `${kpis?.revenue?.collection_rate || 0}% of invoiced value`,
      change: kpis?.revenue?.collected_change_percent,
      tone: 'success',
      route: '/payments',
    },
    {
      icon: 'fa-wallet',
      label: 'Outstanding Balance',
      value: formatShortCurrency(kpis?.revenue?.total_outstanding, currency),
      subText: plural(kpis?.invoices?.open_count || 0, 'open invoice'),
      change: undefined,
      tone: 'warning',
      route: outstandingRoute,
    },
    {
      icon: 'fa-triangle-exclamation',
      label: 'Overdue Receivables',
      value: formatShortCurrency(kpis?.revenue?.total_overdue, currency),
      subText: `${kpis?.revenue?.overdue_ratio || 0}% of outstanding`,
      change: undefined,
      tone: 'danger',
      route: outstandingRoute,
    },
  ];

  const quickActions = canCreateDocuments
    ? [
        { label: 'New Invoice', icon: 'fa-file-invoice', route: '/invoices/new' },
        { label: 'New Quotation', icon: 'fa-file-pen', route: '/quotations/new' },
        { label: 'New Proforma', icon: 'fa-file-circle-check', route: '/proformas/new' },
        { label: 'Add Client', icon: 'fa-user-plus', route: '/clients' },
      ]
    : [
        { label: 'Record Payment', icon: 'fa-money-check-dollar', route: '/payments' },
        { label: 'Sales Report', icon: 'fa-chart-line', route: '/reports/sales' },
        { label: 'VAT Report', icon: 'fa-percent', route: '/reports/vat' },
        { label: 'Outstanding', icon: 'fa-clock', route: '/reports/outstanding' },
      ];

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <main className="page-content dashboard-page">
        <PageNav pageTitle="Dashboard" links={[{ label: 'Home', to: '/', active: true }]} />

        <motion.section
          className="db-hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          <div className="db-hero-copy">
            <span className="db-scope-badge"><i className="fas fa-chart-line" /> {meta?.scope_label || 'Business overview'}</span>
            <h1>Welcome back, <span>{user?.name?.split(' ')[0] || 'there'}</span></h1>
            <p>
              Monitor invoices, collections and urgent follow-ups in one place.
              <span className="db-updated"> Updated {formatUpdatedTime(meta?.generated_at)}</span>
            </p>
          </div>

          <div className="db-control-area">
            <div className="db-toggle" aria-label="Dashboard period">
              {PERIOD_OPTIONS.map((period) => (
                <button
                  key={period.value}
                  type="button"
                  className={filters.period === period.value ? 'active' : ''}
                  onClick={() => setPeriod(period.value)}
                  disabled={refreshing}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <div className="db-control-row">
              <div className="db-toggle db-currency" aria-label="Currency">
                {['NGN', 'USD'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={filters.currency === item ? 'active' : ''}
                    onClick={() => setCurrency(item)}
                    disabled={refreshing}
                  >
                    {item === 'NGN' ? '₦ NGN' : '$ USD'}
                  </button>
                ))}
              </div>
              <button type="button" className="db-refresh" onClick={refreshDashboard} disabled={refreshing}>
                <i className={`fas fa-rotate ${refreshing ? 'is-spinning' : ''}`} />
                {refreshing ? 'Updating' : 'Refresh'}
              </button>
            </div>
          </div>
        </motion.section>

        {isSuperAdmin && (
          <motion.section
            className="db-maintenance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.05 }}
          >
            <div className="db-maintenance-icon">
              <i className="fas fa-arrows-rotate" />
            </div>
            <div className="db-maintenance-copy">
              <h3>Document Checks &amp; Reminders</h3>
              <p>
                Mark overdue invoices, expire sent quotations/proformas and send due payment reminders.
                <span> Last run: {formatRunDateTime(maintenance?.last_run?.completed_at)}</span>
              </p>
              {maintenanceError && <small className="db-maintenance-error">{maintenanceError}</small>}
            </div>
            <div className="db-maintenance-pending">
              <div><strong>{maintenance?.pending?.invoices_due_for_overdue || 0}</strong><span>Invoices due</span></div>
              <div><strong>{maintenance?.pending?.quotations_due_for_expiry || 0}</strong><span>Quotes due</span></div>
              <div><strong>{maintenance?.pending?.proformas_due_for_expiry || 0}</strong><span>Proformas due</span></div>
            </div>
            <button
              type="button"
              className="db-maintenance-btn"
              onClick={handleMaintenanceRun}
              disabled={maintenanceLoading}
            >
              <i className={`fas fa-rotate ${maintenanceLoading ? 'is-spinning' : ''}`} />
              {maintenanceLoading ? 'Running Checks...' : 'Run Document Checks Now'}
            </button>
          </motion.section>
        )}

        {error && (
          <div className="db-error">
            <i className="fas fa-circle-exclamation" />
            <span>{error}</span>
            <button type="button" onClick={refreshDashboard}>Try again</button>
          </div>
        )}

        <section className="db-kpi-grid">
          {kpiCards.map((card, index) => (
            <KpiCard
              key={card.label}
              {...card}
              onClick={() => navigate(card.route)}
              delay={0.04 + (index * 0.04)}
              loading={loading}
            />
          ))}
        </section>

        <section className="db-insights-grid">
          <InsightCard
            icon="fa-receipt"
            label="Average Invoice Value"
            value={formatShortCurrency(kpis?.invoices?.average_invoice_value, currency)}
            loading={loading}
          />
          <InsightCard
            icon="fa-percent"
            label={`VAT · ${periodLabel}`}
            value={formatShortCurrency(kpis?.invoices?.vat_amount, currency)}
            loading={loading}
          />
          <InsightCard
            icon="fa-money-bill-transfer"
            label="Payments Recorded"
            value={kpis?.invoices?.payment_count || 0}
            loading={loading}
          />
          <InsightCard
            icon="fa-bell"
            label="Unread Notifications"
            value={meta?.unread_notifications || 0}
            loading={loading}
          />
        </section>

        <Panel title={`Document Pipeline · ${periodLabel}`} icon="fa-shuffle" className="db-pipeline-panel" delay={0.14}>
          <Pipeline data={kpis?.pipeline} loading={loading} navigate={navigate} />
        </Panel>

        <section className="db-chart-grid">
          <Panel title="Revenue & Collection Trend" icon="fa-chart-column" delay={0.18}>
            <RevenueChart data={charts?.revenue_trend} currency={currency} loading={loading} />
          </Panel>
          <Panel title={`Invoice Status · ${periodLabel}`} icon="fa-chart-pie" delay={0.21}>
            <StatusDistribution data={charts?.status_distribution} loading={loading} />
          </Panel>
        </section>

        <section className="db-work-grid">
          <Panel
            title="Receivables Aging"
            icon="fa-clock-rotate-left"
            action={canViewReports ? 'View report' : 'View invoices'}
            onAction={() => navigate(outstandingRoute)}
            delay={0.24}
          >
            <AgingChart data={charts?.invoice_aging} currency={currency} loading={loading} />
          </Panel>

          <Panel title={`Needs Attention${kpis?.alerts?.follow_up_count ? ` · ${kpis.alerts.follow_up_count}` : ''}`} icon="fa-bell" delay={0.27}>
            <AttentionList attention={lists?.attention} currency={currency} loading={loading} navigate={navigate} />
          </Panel>

          <Panel title={`Collections by Method · ${periodLabel}`} icon="fa-credit-card" delay={0.3}>
            <PaymentMethods data={charts?.payment_methods} currency={currency} loading={loading} />
          </Panel>
        </section>

        <section className="db-record-grid">
          <Panel title="Recent Invoices" icon="fa-file-invoice" action="View all" onAction={() => navigate('/invoices')} delay={0.32}>
            {loading ? <SkeletonRows rows={5} /> : !lists?.recent_invoices?.length ? (
              <EmptyState icon="fa-file-circle-plus" title="No invoices yet" text="Your latest invoices will appear here." />
            ) : (
              <div className="db-record-list">
                {lists.recent_invoices.map((invoice) => (
                  <button type="button" key={invoice.id} className="db-invoice-row" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <div>
                      <strong>{invoice.invoice_number}</strong>
                      <span>{invoice.client_name}</span>
                    </div>
                    <div className="db-record-right">
                      <StatusPill status={invoice.is_overdue ? 'overdue' : invoice.status} />
                      <strong>{formatShortCurrency(invoice.total_amount, invoice.currency)}</strong>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent Payments" icon="fa-money-check-dollar" action="View all" onAction={() => navigate('/payments')} delay={0.35}>
            {loading ? <SkeletonRows rows={5} /> : !lists?.recent_payments?.length ? (
              <EmptyState icon="fa-receipt" title="No payments yet" text="Recent client payments will appear here." />
            ) : (
              <div className="db-record-list">
                {lists.recent_payments.map((payment) => (
                  <button type="button" key={payment.id} className="db-payment-row" onClick={() => navigate(`/invoices/${payment.invoice_id}`)}>
                    <span className="db-payment-icon"><i className="fas fa-arrow-down" /></span>
                    <div>
                      <strong>{payment.client_name}</strong>
                      <span>{payment.invoice_number} · {METHOD_LABELS[payment.payment_method] || payment.payment_method}</span>
                    </div>
                    <div className="db-record-right">
                      <strong className="db-paid-value">{formatShortCurrency(payment.amount, payment.currency)}</strong>
                      <span>{formatDate(payment.payment_date)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <div className="db-side-stack">
            <Panel title={`Top Products · ${periodLabel}`} icon="fa-trophy" action={canViewReports ? 'View report' : 'View products'} onAction={() => navigate(canViewReports ? '/reports/top-products' : '/products')} delay={0.38}>
              {loading ? <SkeletonRows rows={4} /> : !lists?.top_products?.length ? (
                <EmptyState icon="fa-box-open" title="No product sales" text="Completed invoice lines will appear here." />
              ) : (
                <div className="db-top-products">
                  {lists.top_products.map((product, index) => (
                    <button type="button" key={product.product_id} onClick={() => navigate(`/products/${product.product_id}`)}>
                      <span className={`db-rank rank-${index + 1}`}>{index + 1}</span>
                      <div>
                        <strong>{product.product_name}</strong>
                        <span>{product.sku} · {product.total_quantity} units</span>
                      </div>
                      <b>{formatShortCurrency(product.total_revenue, currency)}</b>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            {canManageStock && (
              <Panel title={`Stock Alerts${kpis?.alerts?.low_stock_count ? ` · ${kpis.alerts.low_stock_count}` : ''}`} icon="fa-boxes-stacked" action="Products" onAction={() => navigate('/products')} delay={0.41}>
                {loading ? <SkeletonRows rows={3} /> : !lists?.low_stock_alerts?.length ? (
                  <EmptyState icon="fa-circle-check" title="Stock levels healthy" />
                ) : (
                  <div className="db-stock-list">
                    {lists.low_stock_alerts.map((product) => (
                      <button type="button" key={product.product_id} onClick={() => navigate(`/products/${product.product_id}`)}>
                        <span className={`stock-indicator ${product.alert_type}`} />
                        <div>
                          <strong>{product.product_name}</strong>
                          <span>{product.sku}</span>
                        </div>
                        <b>{product.stock_quantity} left</b>
                      </button>
                    ))}
                  </div>
                )}
              </Panel>
            )}
          </div>
        </section>

        <Panel title="Quick Actions" icon="fa-bolt" className="db-actions-panel" delay={0.44}>
          <div className="db-actions-grid">
            {quickActions.map((action) => (
              <button type="button" key={action.label} onClick={() => navigate(action.route)}>
                <i className={`fas ${action.icon}`} />
                <span>{action.label}</span>
                <i className="fas fa-arrow-right" />
              </button>
            ))}
          </div>
        </Panel>
      </main>
    </div>
  );
};

export default Dashboard;
