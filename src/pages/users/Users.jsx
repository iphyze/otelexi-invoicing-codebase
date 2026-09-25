// pages/users/Users.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useUserStore from '../../stores/useUserStore';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import adminService from '../../services/adminService';
import SelectInput from '../../components/SelectInput';
import ConfirmModal from '../../components/modals/ConfirmModal';
import UserModal from './UserModal';
import { useNavigate } from 'react-router-dom';
import './Users.css';

const ROLE_META = {
  super_admin: { label: 'Super Admin', cls: 'use-role-admin', icon: 'fa-crown' },
  admin:       { label: 'Admin', cls: 'use-role-admin', icon: 'fa-shield-halved' },
  sales:       { label: 'Sales', cls: 'use-role-sales', icon: 'fa-handshake' },
  accounting:  { label: 'Accounting', cls: 'use-role-acc', icon: 'fa-calculator' },
};

const RoleBadge = ({ role }) => {
  const m = ROLE_META[role] || { label: role, cls: '', icon: 'fa-user' };
  return <span className={`use-role-badge ${m.cls}`}><i className={`fas ${m.icon}`} /> {m.label}</span>;
};

const ROLE_OPTS = [
  { value: '', label: 'All Roles' },
  { value: 'super_admin', label: 'Super Admin', icon: 'fa-crown' },
  { value: 'admin', label: 'Admin', icon: 'fa-shield-halved' },
  { value: 'sales', label: 'Sales', icon: 'fa-handshake' },
  { value: 'accounting', label: 'Accounting', icon: 'fa-calculator' },
];
const LIMIT_OPTS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
];

const SkeletonRow = () => (
  <tr className="use-skel-row">
    {[...Array(7)].map((_, i) => <td key={i}><div className="use-skel-cell" /></td>)}
  </tr>
);

const Users = () => {
  const { theme } = useThemeStore();
  const navigate  = useNavigate();
  const { showToast } = useToastStore();
  const { user: me } = useAuthStore();

  const {
    users, meta, filters, loading, error, selectedIds,
    fetchUsers, setFilter, toggleSelect, toggleSelectAll, clearSelection,
    deleteUsers, deactivateUsers,
  } = useUserStore();

  const [nav, setNav]             = useState(false);
  const [userModal, setUserModal] = useState({ open: false, user: null });
  const [confirm, setConfirm]     = useState({ open: false, type: '', ids: [] });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchInput, setSearchInput]     = useState(filters.search || '');
  const searchRef = useRef(null);

  // Guard: user and role administration belongs to the Super Admin only
  useEffect(() => {
    if (me && me.role !== 'super_admin') { navigate('/profile'); return; }
    document.title = 'Otelex | User Management';
    fetchUsers();
  }, []);

  useEffect(() => { fetchUsers(); }, [filters]);

  const submitSearch = useCallback(() => setFilter('search', searchInput.trim()), [searchInput]);
  const clearSearch  = () => { setSearchInput(''); setFilter('search', ''); };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      if (confirm.type === 'delete') {
        await deleteUsers(confirm.ids);
        showToast(`${confirm.ids.length} user(s) deleted permanently.`, 'success');
      } else if (confirm.type === 'deactivate') {
        await deactivateUsers(confirm.ids);
        showToast(`${confirm.ids.length} user(s) deactivated.`, 'success');
      } else if (confirm.type === 'mfa') {
        const response = await adminService.resetUserMfa(confirm.ids[0]);
        showToast(response.data?.message || 'Email MFA reset successfully.', 'success');
      }
      setConfirm({ open: false, type: '', ids: [] });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally { setActionLoading(false); }
  };

  const totalPages  = meta?.total_pages || 1;
  const currentPage = filters.page;
  const pageRange   = () => {
    const pages = [], delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
    return pages;
  };

  const allIds     = users.filter((u) => u.id !== me?.id).map((u) => u.id);
  const allSelected = selectedIds.length === allIds.length && allIds.length > 0;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const confirmConfig = {
    delete:     { title: 'Delete Users',     msg: `Permanently delete ${confirm.ids.length} user(s)? This cannot be undone and will fail if they have linked records.`, btn: 'Yes, Delete',    variant: 'danger' },
    deactivate: { title: 'Deactivate Users', msg: `Deactivate ${confirm.ids.length} user(s)? They will lose access to the system.`,                                       btn: 'Deactivate',    variant: 'warning' },
    mfa:        { title: 'Reset Email MFA',   msg: 'Reset email MFA for this user? All of their active sessions will be signed out and they can enable MFA again after signing in.', btn: 'Reset MFA', variant: 'warning' },
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="User Management"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Settings', to: '/settings/company' }, { label: 'Users', active: true }]}
        />

        <div className={`use-wrapper theme-${theme}`}>
          {/* Toolbar */}
          <div className="use-toolbar">
            <div className="use-toolbar-left">
              <div className="use-search-wrap">
                <i className="fas fa-magnifying-glass use-search-icon" />
                <input
                  ref={searchRef}
                  className={`use-search theme-${theme}`}
                  placeholder="Search name, email, role..."
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); if (!e.target.value) clearSearch(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                />
                {searchInput && <button className="use-search-clear" onClick={clearSearch} type="button"><i className="fas fa-xmark" /></button>}
                <button className="use-search-go" onClick={submitSearch} type="button"><i className="fas fa-arrow-right" /></button>
              </div>
              <SelectInput options={ROLE_OPTS} value={filters.role} onChange={(v) => setFilter('role', v)} className="use-filter-sel" clearable />
            </div>
            <div className="use-toolbar-right">
              <SelectInput options={LIMIT_OPTS} value={filters.limit} onChange={(v) => setFilter('limit', Number(v))} className="use-filter-sel" />
              <button className="use-btn-primary" onClick={() => setUserModal({ open: true, user: null })} type="button">
                <i className="fas fa-user-plus" /> New User
              </button>
            </div>
          </div>

          {/* Bulk bar */}
          {selectedIds.length > 0 && (
            <div className={`use-bulk-bar theme-${theme}`}>
              <span className="use-bulk-count"><i className="fas fa-square-check" /> {selectedIds.length} selected</span>
              <div className="use-bulk-actions">
                <button className="use-bulk-btn warning" onClick={() => setConfirm({ open: true, type: 'deactivate', ids: selectedIds })} type="button">
                  <i className="fas fa-user-slash" /> Deactivate
                </button>
                <button className="use-bulk-btn danger" onClick={() => setConfirm({ open: true, type: 'delete', ids: selectedIds })} type="button">
                  <i className="fas fa-trash" /> Delete
                </button>
                <button className="use-bulk-btn neutral" onClick={clearSelection} type="button">
                  <i className="fas fa-xmark" /> Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="use-table-wrap">
            <table className="use-table">
              <thead>
                <tr>
                  <th className="use-th use-th-check">
                    <label className="use-check-label">
                      <input type="checkbox" className="use-check-input" checked={allSelected} onChange={() => toggleSelectAll(allIds)} />
                      <span className="use-check-box" />
                    </label>
                  </th>
                  <th className="use-th">User</th>
                  <th className="use-th">Role</th>
                  <th className="use-th">Status</th>
                  <th className="use-th">Last Login</th>
                  <th className="use-th">Created</th>
                  <th className="use-th use-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : error || !users.length ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 0, border: 'none' }}>
                      <div className={`use-empty theme-${theme}`}>
                        <div className={`use-empty-icon ${error ? 'error-icon' : ''}`}>
                          <i className={`fas ${error ? 'fa-triangle-exclamation' : 'fa-users'}`} />
                        </div>
                        <h4>{error ? 'Failed to Load Users' : 'No Users Found'}</h4>
                        <p>{error || 'No users match your current filters.'}</p>
                        {error && <button onClick={fetchUsers} className="use-empty-btn"><i className="fas fa-rotate-right" /> Retry</button>}
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className={`use-row ${selectedIds.includes(u.id) ? 'is-selected' : ''} ${!u.is_active ? 'is-inactive' : ''}`}>
                      <td>
                        {u.id !== me?.id && (
                          <label className="use-check-label">
                            <input type="checkbox" className="use-check-input" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                            <span className="use-check-box" />
                          </label>
                        )}
                      </td>
                      <td>
                        <div className="use-user-cell">
                          <div className="use-avatar">{u.name?.slice(0,2).toUpperCase()}</div>
                          <div className="use-user-info">
                            <span className="use-user-name">{u.name} {u.id === me?.id && <span className="use-you-tag">You</span>}</span>
                            <span className="use-user-email">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td>
                        <span className={`use-status-badge ${u.is_active ? 'use-active' : 'use-inactive'}`}>
                          <i className={`fas ${u.is_active ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td><span className="use-date">{fmtDate(u.last_login)}</span></td>
                      <td><span className="use-date">{fmtDate(u.created_at)}</span></td>
                      <td>
                        <div className="use-row-actions">
                          <button className="use-action-btn edit" title="Edit user" onClick={() => setUserModal({ open: true, user: u })} type="button">
                            <i className="fas fa-pen" />
                          </button>
                          {u.id !== me?.id && (
                            <>
                              <button className="use-action-btn edit" title="Reset email MFA" onClick={() => setConfirm({ open: true, type: 'mfa', ids: [u.id] })} type="button">
                                <i className="fas fa-shield-halved" />
                              </button>
                              <button className="use-action-btn deactivate" title="Deactivate" onClick={() => setConfirm({ open: true, type: 'deactivate', ids: [u.id] })} type="button">
                                <i className="fas fa-user-slash" />
                              </button>
                              <button className="use-action-btn delete" title="Delete" onClick={() => setConfirm({ open: true, type: 'delete', ids: [u.id] })} type="button">
                                <i className="fas fa-trash" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total > 0 && (
            <div className={`use-pagination theme-${theme}`}>
              <span className="use-pag-info">
                Showing {((currentPage - 1) * filters.limit) + 1}–{Math.min(currentPage * filters.limit, meta.total)} of {meta.total} users
              </span>
              <div className="use-pag-controls">
                <button className="use-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', 1)}><i className="fas fa-angles-left" /></button>
                <button className="use-pag-btn" disabled={currentPage === 1} onClick={() => setFilter('page', currentPage - 1)}><i className="fas fa-chevron-left" /></button>
                {pageRange().map((pg) => (
                  <button key={pg} className={`use-pag-btn ${pg === currentPage ? 'is-active' : ''}`} onClick={() => setFilter('page', pg)}>{pg}</button>
                ))}
                <button className="use-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', currentPage + 1)}><i className="fas fa-chevron-right" /></button>
                <button className="use-pag-btn" disabled={currentPage === totalPages} onClick={() => setFilter('page', totalPages)}><i className="fas fa-angles-right" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserModal
        open={userModal.open}
        user={userModal.user}
        onClose={() => setUserModal({ open: false, user: null })}
        onSuccess={(msg) => { showToast(msg, 'success'); fetchUsers(); }}
      />

      {confirm.type && confirmConfig[confirm.type] && (
        <ConfirmModal
          open={confirm.open}
          onClose={() => setConfirm({ open: false, type: '', ids: [] })}
          onConfirm={handleConfirm}
          title={confirmConfig[confirm.type].title}
          message={confirmConfig[confirm.type].msg}
          confirmText={confirmConfig[confirm.type].btn}
          variant={confirmConfig[confirm.type].variant}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default Users;
