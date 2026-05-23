import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import useThemeStore from '../../stores/useThemeStore';
import adminService from '../../services/adminService';
import './AuditLogs.css';

const ACTION_GROUPS = [
  { value: '', label: 'All actions' },
  { value: 'auth.', label: 'Authentication' },
  { value: 'inventory.', label: 'Inventory Control' },
  { value: 'invoice.', label: 'Invoices' },
  { value: 'payment.', label: 'Payments' },
  { value: 'credit_note.', label: 'Credit Notes' },
  { value: 'refund.', label: 'Refunds' },
  { value: 'user.', label: 'User Administration' },
];
const INITIAL_FILTERS = { search: '', action: '', model_type: '', user_id: '', from: '', to: '', page: 1, limit: 20 };

const Stat = ({ label, value, icon, tone = '' }) => (
  <div className={`audit-stat ${tone}`}>
    <div className="audit-stat-icon"><i className={`fas ${icon}`} /></div>
    <div><span>{label}</span><strong>{Number(value || 0).toLocaleString()}</strong></div>
  </div>
);

const AuditLogs = () => {
  const { theme } = useThemeStore();
  const [nav, setNav] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({});
  const [facets, setFacets] = useState({ users: [], models: [] });
  const [meta, setMeta] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [auditRes, overviewRes] = await Promise.all([
        adminService.getAuditLogs(filters),
        adminService.getOverview(),
      ]);
      setLogs(auditRes.data?.data || []);
      setSummary(auditRes.data?.summary || {});
      setFacets(auditRes.data?.facets || { users: [], models: [] });
      setMeta(auditRes.data?.meta || null);
      setOverview(overviewRes.data?.data || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Administration audit data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { document.title = 'Otelex | Audit & Administration'; }, []);
  useEffect(() => { loadAudit(); }, [loadAudit]);

  const userOptions = [{ value: '', label: 'All users' }, ...(facets.users || []).map((user) => ({ value: user.id, label: `${user.name} — ${user.email}` }))];
  const modelOptions = [{ value: '', label: 'All records' }, ...(facets.models || []).map((model) => ({ value: model, label: model }))];
  const pages = useMemo(() => Array.from({ length: meta?.total_pages || 1 }, (_, index) => index + 1), [meta]);
  const policy = overview?.role_policy || {};

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav pageTitle="Audit & Administration" links={[{ label: 'Dashboard', to: '/' }, { label: 'Administration', active: true }]} />
        <div className="audit-wrapper">
          <section className="audit-hero">
            <div>
              <span className="audit-eyebrow">Super Administrator control centre</span>
              <h1>Audit Log & Access Governance</h1>
              <p>Monitor privileged actions, review system history and maintain clear separation of operational and ownership-level authority.</p>
            </div>
            <div className="audit-security"><i className="fas fa-shield-halved" /><div><strong>Protected Area</strong><span>Super Admin access only</span></div></div>
          </section>

          <div className="audit-stats">
            <Stat label="Total Events" value={summary.total_events} icon="fa-list-check" />
            <Stat label="Last 24 Hours" value={summary.last_24_hours} icon="fa-clock-rotate-left" />
            <Stat label="Inventory Actions" value={summary.inventory_events} icon="fa-boxes-stacked" tone="blue" />
            <Stat label="Controlled Finance" value={summary.controlled_finance_events} icon="fa-scale-balanced" tone="amber" />
          </div>

          <div className="audit-grid">
            <section className="audit-card audit-events">
              <div className="audit-card-head"><div><h2>Activity Ledger</h2><p>Search and filter system events.</p></div></div>
              <div className="audit-filters">
                <div className="audit-search">
                  <i className="fas fa-magnifying-glass" />
                  <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && setFilters((current) => ({ ...current, search: searchInput.trim(), page: 1 }))} placeholder="Search descriptions, action or user..." />
                  <button type="button" onClick={() => setFilters((current) => ({ ...current, search: searchInput.trim(), page: 1 }))}>Search</button>
                </div>
                <SelectInput options={ACTION_GROUPS} value={filters.action} onChange={(value) => setFilters((current) => ({ ...current, action: value, page: 1 }))} clearable />
                <SelectInput options={modelOptions} value={filters.model_type} onChange={(value) => setFilters((current) => ({ ...current, model_type: value, page: 1 }))} clearable />
                <SelectInput options={userOptions} value={filters.user_id} onChange={(value) => setFilters((current) => ({ ...current, user_id: value, page: 1 }))} clearable />
                <DatePicker value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value, page: 1 }))} placeholder="From date" />
                <DatePicker value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value, page: 1 }))} placeholder="To date" />
              </div>

              <div className="audit-list">
                {loading ? Array.from({ length: 5 }).map((_, index) => <div key={index} className="audit-skeleton" />)
                  : error ? <div className="audit-empty"><i className="fas fa-triangle-exclamation" /><p>{error}</p><button type="button" onClick={loadAudit}>Try Again</button></div>
                  : logs.length === 0 ? <div className="audit-empty"><i className="fas fa-clipboard-list" /><p>No matching audit events found.</p></div>
                  : logs.map((log, index) => (
                    <motion.article className="audit-event" key={log.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.015 }}>
                      <div className="audit-event-icon"><i className={`fas ${log.action.startsWith('auth.') ? 'fa-key' : log.action.startsWith('inventory.') ? 'fa-boxes-stacked' : log.action.startsWith('user.') ? 'fa-users-gear' : 'fa-file-shield'}`} /></div>
                      <div className="audit-event-body">
                        <div className="audit-event-title"><strong>{log.action}</strong><span>{log.model_type}{log.model_id ? ` #${log.model_id}` : ''}</span></div>
                        <p>{log.description || 'No event description provided.'}</p>
                        <div className="audit-event-meta"><span><i className="fas fa-user" /> {log.user_name}</span><span><i className="fas fa-clock" /> {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span><span><i className="fas fa-location-dot" /> {log.ip_address || '—'}</span></div>
                      </div>
                    </motion.article>
                  ))}
              </div>
              {meta && meta.total_pages > 1 && <div className="audit-pagination">{pages.map((page) => <button key={page} className={page === filters.page ? 'active' : ''} type="button" onClick={() => setFilters((current) => ({ ...current, page }))}>{page}</button>)}</div>}
            </section>

            <aside className="audit-sidebar">
              <section className="audit-card">
                <div className="audit-card-head"><div><h2>User Access</h2><p>Active users by role.</p></div></div>
                <div className="audit-role-counts">
                  {(overview?.roles || []).map((role) => (
                    <div className="audit-role" key={role.role}><span>{role.role.replace('_', ' ')}</span><strong>{role.active} / {role.total}</strong></div>
                  ))}
                </div>
              </section>
              <section className="audit-card">
                <div className="audit-card-head"><div><h2>Role Boundaries</h2><p>Administration controls in force.</p></div></div>
                <div className="audit-policy">
                  {Object.entries(policy).map(([role, description]) => (
                    <div key={role}><strong>{role.replace('_', ' ')}</strong><p>{description}</p></div>
                  ))}
                </div>
              </section>
              <section className="audit-card">
                <div className="audit-card-head"><div><h2>Recent Privileged Actions</h2></div></div>
                <div className="audit-recent">
                  {(overview?.recent_privileged_activity || []).slice(0, 5).map((event, index) => (
                    <div key={`${event.action}-${index}`}><strong>{event.action}</strong><span>{event.actor} · {new Date(event.created_at).toLocaleDateString('en-GB')}</span></div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
