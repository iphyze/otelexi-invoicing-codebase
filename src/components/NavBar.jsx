// components/NavBar.jsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useThemeStore from '../stores/useThemeStore';
import useNotificationStore from '../stores/useNotificationStore';
import LogoLight from '../assets/images/otelexi/logo-light.png';
import LogoDark  from '../assets/images/otelexi/logo-dark.png';
import './NavBar.css';

// ── Builds menu dynamically based on user role ────────────────────
const buildMenu = (role) => {
  const isAdmin      = role === 'admin';
  const isSales      = role === 'sales';
  const isAccountant = role === 'accountant';

  const items = [
    { label: 'Dashboards', icon: 'fas fa-gauge-high', to: '/', exact: true },
    { label: 'Clients',    icon: 'fas fa-users',      to: '/clients' },
  ];

  // Products — admin and sales see this
  if (isAdmin || isSales) {
    items.push({
      label: 'Products', icon: 'fas fa-boxes-stacked',
      children: [
        { label: 'Product List', icon: 'fas fa-list', to: '/products' },
        { label: 'Categories',   icon: 'fas fa-tags', to: '/products/categories' },
      ],
    });
  }

  // Quotations — admin and sales
  if (isAdmin || isSales) {
    items.push({
      label: 'Quotations', icon: 'fas fa-file-pen',
      children: [
        { label: 'All Quotations', icon: 'fas fa-list', to: '/quotations' },
        { label: 'New Quotation',  icon: 'fas fa-plus', to: '/quotations/new' },
      ],
    });
    items.push({
      label: 'Proforma', icon: 'fas fa-file-circle-check',
      children: [
        { label: 'All Proformas', icon: 'fas fa-list', to: '/proformas' },
        { label: 'New Proforma',  icon: 'fas fa-plus', to: '/proformas/new' },
      ],
    });
  }

  // Invoices — everyone sees all invoices & payments; only admin+sales see New Invoice
  const invoiceChildren = [
    { label: 'All Invoices', icon: 'fas fa-list',            to: '/invoices' },
    ...(isAdmin || isSales ? [{ label: 'New Invoice', icon: 'fas fa-plus', to: '/invoices/new' }] : []),
    { label: 'Payments',     icon: 'fas fa-money-bill-wave', to: '/invoices/payments' },
  ];
  items.push({ label: 'Invoices', icon: 'fas fa-file-invoice', children: invoiceChildren });

  // Reports
  items.push({
    label: 'Reports', icon: 'fas fa-chart-line',
    children: [
      { label: 'Monthly Sales',     icon: 'fas fa-chart-bar', to: '/reports/sales' },
      { label: 'Top Products',      icon: 'fas fa-trophy',    to: '/reports/top-products' },
      { label: 'VAT Report',        icon: 'fas fa-percent',   to: '/reports/vat' },
      { label: 'Staff Performance', icon: 'fas fa-user-tie',  to: '/reports/staff' },
      { label: 'Outstanding',       icon: 'fas fa-clock',     to: '/reports/outstanding' },
    ],
  });

  // Notifications — all roles
  items.push({ label: 'Notifications', icon: 'fas fa-bell', to: '/notifications', showBadge: true });

  // Settings — admin sees Company Settings + Users; others see only their Profile
  if (isAdmin) {
    items.push({
      label: 'Settings', icon: 'fas fa-gear',
      children: [
        { label: 'Company Settings', icon: 'fas fa-building',   to: '/settings/company' },
        { label: 'Users',            icon: 'fas fa-users-cog',  to: '/settings/users' },
      ],
    });
  } else {
    // Non-admin gets a direct link to their own profile
    items.push({ label: 'My Profile', icon: 'fas fa-user-circle', to: '/profile' });
  }

  return items;
};

// ── NavItem ───────────────────────────────────────────────────────
const NavItem = ({ item, onNavigate, unreadCount = 0 }) => {
  const location    = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children.some((c) => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(isChildActive);
  const badge = item.showBadge && unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null;

  if (!hasChildren) {
    return (
      <li className="nav-item">
        <NavLink
          to={item.to}
          end={item.exact}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <i className={`nav-icon ${item.icon}`} />
          <span>{item.label}</span>
          {badge && <span className="nav-notif-badge">{badge}</span>}
        </NavLink>
      </li>
    );
  }

  return (
    <li className={`nav-item has-submenu ${open ? 'submenu-open' : ''}`}>
      <button
        className={`nav-link nav-parent ${isChildActive ? 'child-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <i className={`nav-icon ${item.icon}`} />
        <span>{item.label}</span>
        <i className={`nav-chevron fas ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
      </button>
      <ul className={`submenu ${open ? 'submenu-visible' : ''}`}>
        {item.children.map((child) => (
          <li key={child.to} className="submenu-item">
            <NavLink
              to={child.to}
              className={({ isActive }) => `submenu-link ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <i className={`submenu-icon ${child.icon}`} />
              <span>{child.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  );
};

// ── NavBar ────────────────────────────────────────────────────────
const NavBar = ({ nav, setNav }) => {
  const { theme }  = useThemeStore();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const closeNav = () => setNav(false);

  const menuItems = buildMenu(user?.role);

  return (
    <>
      <div className={`nav-overlay ${nav ? 'overlay-visible' : ''}`} onClick={closeNav} />
      <nav className={`navbar theme-${theme} ${nav ? 'nav-open' : ''}`}>
        <div className="nav-brand">
          <NavLink to="/" className="brand-link" onClick={closeNav}>
            <img src={LogoDark} alt="Otelex Ltd" className="brand-logo-img" />
          </NavLink>
          <button className="nav-close-btn" onClick={closeNav} type="button">
            <i className="fas fa-xmark" />
          </button>
        </div>
        <span className="nav-section-label">MAIN MENU</span>
        <ul className="nav-list">
          {menuItems.map((item) => (
            <NavItem key={item.label} item={item} onNavigate={closeNav} unreadCount={unreadCount} />
          ))}
        </ul>
        <div className="nav-bottom">
          <div className="nav-divider" />
          <button className="nav-logout" onClick={logout} type="button">
            <i className="fas fa-right-from-bracket" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default NavBar;
