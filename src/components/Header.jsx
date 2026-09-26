// components/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useThemeStore from '../stores/useThemeStore';
import useNotificationStore from '../stores/useNotificationStore';
import GlobalSearch from './GlobalSearch';
import NotificationPanel from './NotificationPanel';
import LogoLight from '../assets/images/otelexi/logo-light.png';
import LogoDark  from '../assets/images/otelexi/logo-dark.png';
import './Header.css';

const Header = ({ nav, setNav }) => {
  const { user, logout }       = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate    = useNavigate();
  const [dropdownOpen, setDropdownOpen]         = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef     = useRef(null);   // passed to NotificationPanel for positioning
  const isSuperAdmin = user?.role === 'super_admin';

  // ── Notification store ─────────────────────────────────────────
  const { unreadCount, panelOpen, togglePanel, startPolling, stopPolling } = useNotificationStore();

  // Start near-live notification polling while the user is signed in.
  // Also refresh immediately when the app regains focus/visibility so
  // notifications created while the user was away appear straight away.
  useEffect(() => {
    if (!user) return undefined;

    startPolling(5000);

    const refreshNotifications = () => {
      useNotificationStore.getState().silentPoll();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshNotifications();
    };

    window.addEventListener('focus', refreshNotifications);
    window.addEventListener('online', refreshNotifications);
    window.addEventListener('otelex:activity-completed', refreshNotifications);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshNotifications);
      window.removeEventListener('online', refreshNotifications);
      window.removeEventListener('otelex:activity-completed', refreshNotifications);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [user, startPolling, stopPolling]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    stopPolling();
    await logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name = '') =>
    name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  const roleLabel = {
    super_admin: 'Super Administrator',
    admin:       'Administrator',
    sales:       'Sales Staff',
    accounting:  'Accounting',
  }[user?.role] || user?.role;

  // Badge display: show 99+ when over 99
  const badgeLabel = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <header className={`app-header theme-${theme}`}>
      <div className="header-left">
        <NavLink to="/" className="header-logo-link">
          <img src={theme === 'dark' ? LogoDark : LogoLight} alt="Otelex Ltd" className="header-logo-img" />
        </NavLink>
        <button className="hamburger-btn" onClick={() => setNav((v) => !v)} type="button" aria-label="Toggle navigation">
          <i className={`fas ${nav ? 'fa-xmark' : 'fa-bars'}`} />
        </button>
        <div className="header-search-desktop">
          <GlobalSearch theme={theme} />
        </div>
      </div>

      <div className="header-right">
        {/* Search icon — mobile only */}
        <button className="header-icon-btn mobile-search-btn" onClick={() => setMobileSearchOpen(true)} type="button">
          <i className="fas fa-magnifying-glass" />
        </button>

        {/* Theme toggle */}
        <button className="header-icon-btn" onClick={toggleTheme} type="button"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
        </button>

        {/* ── Bell — live unread count + opens panel ── */}
        <button
          ref={bellRef}
          className={`header-icon-btn notif-btn ${panelOpen ? 'notif-btn-active' : ''}`}
          type="button"
          title="Notifications"
          onClick={togglePanel}
        >
          <i className="fas fa-bell" />
          {unreadCount > 0 && (
            <span className="notif-badge notif-badge-live">{badgeLabel}</span>
          )}
        </button>

        {/* Notification panel (portal) */}
        <NotificationPanel triggerRef={bellRef} />

        {/* Avatar + dropdown */}
        <div className="avatar-wrapper" ref={dropdownRef}>
          <button
            className={`avatar-btn ${dropdownOpen ? 'active' : ''}`}
            onClick={() => setDropdownOpen((v) => !v)}
            type="button"
          >
            <div className="avatar-circle">{getInitials(user?.name)}</div>
            <div className="avatar-info">
              <span className="avatar-name">{user?.name?.split(' ')[0] || 'User'}</span>
              <span className="avatar-role">{roleLabel}</span>
            </div>
            <i className={`fas fa-chevron-down avatar-chevron ${dropdownOpen ? 'rotated' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="avatar-dropdown">
              <div className="dropdown-user">
                <div className="dropdown-avatar-circle">{getInitials(user?.name)}</div>
                <div className="dropdown-user-text">
                  <p className="dropdown-user-name">{user?.name?.split(' ')[0]}</p>
                  <p className="dropdown-user-email">{user?.email?.split('@')[0]}</p>
                </div>
              </div>
              <div className="dropdown-divider" />

              <NavLink to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-user-circle" /><span>My Profile</span>
              </NavLink>

              {isSuperAdmin && (
                <NavLink to="/settings/company" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  <i className="fas fa-gear" /><span>Company Settings</span>
                </NavLink>
              )}
              {isSuperAdmin && (
                <NavLink to="/settings/users" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  <i className="fas fa-users-cog" /><span>Manage Users</span>
                </NavLink>
              )}

              <div className="dropdown-divider" />

              {/* Quick notifications link in dropdown */}
              <NavLink to="/notifications" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-bell" />
                <span>Notifications</span>
                {unreadCount > 0 && <span className="dropdown-notif-count">{badgeLabel}</span>}
              </NavLink>

              <div className="dropdown-divider" />

              <button className="dropdown-item danger" onClick={handleLogout} type="button">
                <i className="fas fa-right-from-bracket" /><span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileSearchOpen && (
        <GlobalSearch theme={theme} forceOpen onClose={() => setMobileSearchOpen(false)} />
      )}
    </header>
  );
};

export default Header;
