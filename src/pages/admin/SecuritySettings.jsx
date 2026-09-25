import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import ConfirmModal from '../../components/modals/ConfirmModal';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import useAuthStore from '../../stores/useAuthStore';
import adminService from '../../services/adminService';
import './SecuritySettings.css';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'sales', label: 'Sales' },
  { value: 'accounting', label: 'Accounting' },
];

const LIMIT_OPTIONS = [
  { value: 10, label: '10 per page' },
  { value: 20, label: '20 per page' },
  { value: 50, label: '50 per page' },
];

const fmtDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const roleLabel = (role) => ({
  super_admin: 'Super Admin',
  admin: 'Admin',
  sales: 'Sales',
  accounting: 'Accounting',
}[role] || role);

const deviceIcon = (type) => {
  if (type === 'mobile') return 'fa-mobile-screen-button';
  if (type === 'tablet') return 'fa-tablet-screen-button';
  return 'fa-desktop';
};

const SecuritySettings = () => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const me = useAuthStore((state) => state.user);
  const [nav, setNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [maxDevices, setMaxDevices] = useState(2);

  const [sessions, setSessions] = useState([]);
  const [sessionSummary, setSessionSummary] = useState({});
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, total_pages: 1, total: 0, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', role: '', page: 1, limit: 20 });
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { document.title = 'Otelex | Security Settings'; }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getSecuritySettings();
      const data = response.data?.data || null;
      setSettings(data);
      setMaxDevices(Number(data?.max_active_sessions) || 2);
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to load security settings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const response = await adminService.getSecuritySessions(filters);
      setSessions(response.data?.data || []);
      setSessionSummary(response.data?.summary || {});
      setMeta(response.data?.meta || { page: 1, total_pages: 1, total: 0, limit: filters.limit });
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to load active user sessions.', 'error');
    } finally {
      setSessionsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadSessions(); }, [loadSessions]);

  const saveSettings = async () => {
    const value = Number(maxDevices);
    if (!Number.isInteger(value) || value < 1 || value > 20) {
      showToast('Maximum active devices must be between 1 and 20.', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await adminService.updateSecuritySettings({ max_active_sessions: value });
      const saved = Number(response.data?.data?.max_active_sessions) || value;
      setMaxDevices(saved);
      setSettings((current) => current ? { ...current, max_active_sessions: saved } : current);
      showToast(response.data?.message || 'Security settings updated successfully.', 'success');
      await loadSessions();
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to update security settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitSearch = () => setFilters((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
  const setFilter = (key, value) => setFilters((current) => ({
    ...current,
    [key]: value,
    ...(key !== 'page' ? { page: 1 } : {}),
  }));

  const performSessionAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const response = confirm.type === 'user'
        ? await adminService.revokeUserSessions(confirm.user_id)
        : await adminService.revokeSecuritySession(confirm.session_key);
      showToast(response.data?.message || 'Session revoked successfully.', 'success');
      setConfirm(null);
      await Promise.all([loadSettings(), loadSessions()]);
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to revoke the selected session.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const pageNumbers = useMemo(() => {
    const total = Math.max(1, Number(meta.total_pages) || 1);
    const current = Math.max(1, Number(meta.page) || 1);
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [meta.page, meta.total_pages]);

  const policy = settings?.session_policy || {};
  const idleMinutes = Math.round((policy.idle_timeout_seconds || 600) / 60);
  const warningSeconds = Number(policy.idle_warning_seconds) || 60;
  const absoluteHours = Math.round((policy.absolute_timeout_seconds || 43200) / 3600);

  if (loading && !settings) {
    return (
      <div className={`main-container theme-${theme}`}>
        <Header setNav={setNav} nav={nav} />
        <NavBar setNav={setNav} nav={nav} />
        <div className="page-content">
          <PageNav pageTitle="Security Settings" links={[{ label: 'Dashboard', to: '/' }, { label: 'Administration', to: '/admin/audit-logs' }, { label: 'Security Settings', active: true }]} />
          <div className="secset-loading"><span className="secset-spinner dark" /> Loading security settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav pageTitle="Security Settings" links={[{ label: 'Dashboard', to: '/' }, { label: 'Administration', to: '/admin/audit-logs' }, { label: 'Security Settings', active: true }]} />

        <div className="secset-wrapper">
          <div className={`secset-notice theme-${theme}`}>
            <i className="fas fa-shield-halved" />
            <div>
              <strong>Session security is enforced by the backend.</strong>
              <span>Changing the device limit affects new sign-ins immediately. Existing sessions are not silently removed; use Active User Sessions below when a device must be signed out.</span>
            </div>
          </div>

          <div className="secset-policy-grid">
            <section className={`secset-card secset-primary-card theme-${theme}`}>
              <div className="secset-card-heading">
                <div className="secset-icon"><i className="fas fa-laptop-file" /></div>
                <div>
                  <span className="secset-eyebrow">Concurrent access</span>
                  <h2>Maximum Active Devices</h2>
                  <p>Maximum simultaneous signed-in devices allowed for each account.</p>
                </div>
              </div>

              <div className="secset-limit-control">
                <button type="button" onClick={() => setMaxDevices((value) => Math.max(1, Number(value || 1) - 1))} disabled={saving}><i className="fas fa-minus" /></button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxDevices}
                  onChange={(event) => setMaxDevices(event.target.value)}
                  aria-label="Maximum active devices"
                />
                <button type="button" onClick={() => setMaxDevices((value) => Math.min(20, Number(value || 1) + 1))} disabled={saving}><i className="fas fa-plus" /></button>
              </div>

              <button type="button" className="secset-save-btn" onClick={saveSettings} disabled={saving || Number(maxDevices) === Number(settings?.max_active_sessions)}>
                {saving ? <><span className="secset-spinner" /> Saving...</> : <><i className="fas fa-floppy-disk" /> Save Device Limit</>}
              </button>
            </section>

            <section className={`secset-card theme-${theme}`}>
              <span className="secset-eyebrow">Session policy</span>
              <h2>Automatic Sign-out</h2>
              <div className="secset-policy-list">
                <div><span>Inactive session timeout</span><strong>{idleMinutes} minutes</strong></div>
                <div><span>Expiry warning</span><strong>{warningSeconds} seconds</strong></div>
                <div><span>Absolute session lifetime</span><strong>{absoluteHours} hours</strong></div>
              </div>
              <p className="secset-muted">These values are server security policy values. The inactivity timeout is enforced even if the browser timer is bypassed.</p>
            </section>

            <section className={`secset-card theme-${theme}`}>
              <span className="secset-eyebrow">Current usage</span>
              <h2>Active Access</h2>
              <div className="secset-stat-grid">
                <div><strong>{settings?.summary?.active_sessions ?? 0}</strong><span>Active sessions</span></div>
                <div><strong>{settings?.summary?.users_with_sessions ?? 0}</strong><span>Signed-in users</span></div>
                <div><strong>{settings?.summary?.users_over_limit ?? 0}</strong><span>Users over new limit</span></div>
              </div>
            </section>
          </div>

          <section className={`secset-card secset-sessions-card theme-${theme}`}>
            <div className="secset-session-header">
              <div>
                <span className="secset-eyebrow">Session oversight</span>
                <h2>Active User Sessions</h2>
                <p>Review currently active devices and revoke access when required.</p>
              </div>
              <div className="secset-summary-pills">
                <span><strong>{sessionSummary.active_sessions ?? 0}</strong> sessions</span>
                <span><strong>{sessionSummary.users_with_sessions ?? 0}</strong> users</span>
              </div>
            </div>

            <div className="secset-toolbar">
              <div className={`secset-search theme-${theme}`}>
                <i className="fas fa-magnifying-glass" />
                <input
                  value={searchInput}
                  placeholder="Search user, email, device or IP..."
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    if (!event.target.value) setFilters((current) => ({ ...current, search: '', page: 1 }));
                  }}
                  onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }}
                />
                {searchInput && <button type="button" onClick={() => { setSearchInput(''); setFilters((current) => ({ ...current, search: '', page: 1 })); }}><i className="fas fa-xmark" /></button>}
                <button type="button" className="go" onClick={submitSearch}><i className="fas fa-arrow-right" /></button>
              </div>
              <SelectInput options={ROLE_OPTIONS} value={filters.role} onChange={(value) => setFilter('role', value)} className="secset-filter" />
              <SelectInput options={LIMIT_OPTIONS} value={filters.limit} onChange={(value) => setFilter('limit', Number(value))} className="secset-filter limit" />
            </div>

            <div className="secset-table-wrap">
              <table className="secset-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Device</th>
                    <th>IP Address</th>
                    <th>Last Active</th>
                    <th>Signed In</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionsLoading ? (
                    <tr><td colSpan="6"><div className="secset-table-state"><span className="secset-spinner dark" /> Loading active sessions...</div></td></tr>
                  ) : sessions.length === 0 ? (
                    <tr><td colSpan="6"><div className="secset-table-state"><i className="fas fa-shield-halved" /> No active sessions match the current filters.</div></td></tr>
                  ) : sessions.map((session) => (
                    <tr key={session.session_key} className={session.current ? 'is-current' : ''}>
                      <td>
                        <div className="secset-user-cell">
                          <div className="secset-avatar">{session.user_name?.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <strong>{session.user_name} {session.user_id === me?.id && <span className="secset-you">You</span>}</strong>
                            <span>{session.user_email}</span>
                            <small>{roleLabel(session.user_role)}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="secset-device-cell">
                          <i className={`fas ${deviceIcon(session.device_type)}`} />
                          <div><strong>{session.device_name}</strong>{session.current && <span className="secset-current">Current device</span>}</div>
                        </div>
                      </td>
                      <td><span className="secset-mono">{session.ip_address || '—'}</span></td>
                      <td>{fmtDate(session.last_activity_at)}</td>
                      <td>{fmtDate(session.signed_in_at)}</td>
                      <td>
                        <div className="secset-actions">
                          <button
                            type="button"
                            title={session.current ? 'Manage your current device from My Profile' : 'Sign out this device'}
                            disabled={session.current}
                            onClick={() => setConfirm({ type: 'session', session_key: session.session_key, user_name: session.user_name, device_name: session.device_name })}
                          >
                            <i className="fas fa-right-from-bracket" />
                          </button>
                          <button
                            type="button"
                            className="danger"
                            title={session.user_id === me?.id ? 'Manage your own sessions from My Profile' : 'Sign out all devices for this user'}
                            disabled={session.user_id === me?.id}
                            onClick={() => setConfirm({ type: 'user', user_id: session.user_id, user_name: session.user_name })}
                          >
                            <i className="fas fa-user-slash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta.total > 0 && (
              <div className="secset-pagination">
                <span>Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} active sessions</span>
                <div>
                  <button type="button" disabled={meta.page <= 1} onClick={() => setFilter('page', meta.page - 1)}><i className="fas fa-chevron-left" /></button>
                  {pageNumbers.map((page) => <button type="button" key={page} className={page === meta.page ? 'active' : ''} onClick={() => setFilter('page', page)}>{page}</button>)}
                  <button type="button" disabled={meta.page >= meta.total_pages} onClick={() => setFilter('page', meta.page + 1)}><i className="fas fa-chevron-right" /></button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirm)}
        onClose={() => !actionLoading && setConfirm(null)}
        onConfirm={performSessionAction}
        title={confirm?.type === 'user' ? 'Sign out all user devices?' : 'Sign out this device?'}
        message={confirm?.type === 'user'
          ? `${confirm?.user_name || 'This user'} will be signed out from every active device and must sign in again.`
          : `${confirm?.user_name || 'This user'} will be signed out from ${confirm?.device_name || 'the selected device'}.`}
        confirmText="Sign Out"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default SecuritySettings;
