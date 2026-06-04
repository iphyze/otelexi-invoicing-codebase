// components/NavBar.jsx
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useThemeStore from '../stores/useThemeStore';
import useNotificationStore from '../stores/useNotificationStore';
import LogoDark from '../assets/images/otelexi/logo-dark.png';
import './NavBar.css';

// ── Builds menu dynamically based on user role ────────────────────
const buildMenu = (role) => {
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isSales = role === 'sales';
  const isAccounting = role === 'accounting';
  const canManageSalesDocuments = isSuperAdmin || isAdmin || isSales;
  const canManageOperations = isSuperAdmin || isAdmin;
  const canViewFinance = isSuperAdmin || isAdmin || isAccounting;
  const canViewInventoryHistory = isSuperAdmin || isAdmin || isAccounting;

  const items = [
    { label: 'Dashboard', icon: 'fas fa-gauge-high', to: '/', exact: true },
    { label: 'Clients', icon: 'fas fa-users', to: '/clients' },
  ];

  if (canManageOperations || isSales) {
    items.push({
      label: 'Products',
      icon: 'fas fa-boxes-stacked',
      children: [
        { label: 'Product List', icon: 'fas fa-list', to: '/products' },
        ...(canManageOperations ? [{ label: 'Categories', icon: 'fas fa-tags', to: '/products/categories' }] : []),
      ],
    });
  }

  if (canViewInventoryHistory) {
    items.push({
      label: 'Inventory',
      icon: 'fas fa-warehouse',
      children: [
        { label: 'Stock Movements', icon: 'fas fa-right-left', to: '/inventory/stock-movements' },
      ],
    });
  }

  if (canManageSalesDocuments) {
    items.push({
      label: 'Quotations',
      icon: 'fas fa-file-pen',
      children: [
        { label: 'All Quotations', icon: 'fas fa-list', to: '/quotations' },
        { label: 'New Quotation', icon: 'fas fa-plus', to: '/quotations/new' },
      ],
    });
    items.push({
      label: 'Proforma',
      icon: 'fas fa-file-circle-check',
      children: [
        { label: 'All Proformas', icon: 'fas fa-list', to: '/proformas' },
        { label: 'New Proforma', icon: 'fas fa-plus', to: '/proformas/new' },
      ],
    });
  }

  items.push({
    label: 'Invoices',
    icon: 'fas fa-file-invoice',
    children: [
      { label: 'All Invoices', icon: 'fas fa-list', to: '/invoices' },
      ...(canManageSalesDocuments ? [{ label: 'New Invoice', icon: 'fas fa-plus', to: '/invoices/new' }] : []),
    ],
  });

  items.push({
    label: 'Delivery Notes',
    icon: 'fas fa-truck-ramp-box',
    to: '/delivery-notes',
  });

  if (canViewFinance) {
    items.push({
      label: 'Payments',
      icon: 'fas fa-money-check-dollar',
      children: [
        { label: 'Received Payments', icon: 'fas fa-receipt', to: '/payments' },
        { label: 'Payment Requests', icon: 'fas fa-link', to: '/payment-links' },
        { label: 'Customer Portal', icon: 'fas fa-user-shield', to: '/customer-portal-links' },
      ],
    });
  }

  if (canViewFinance) {
    items.push({
      label: 'Reports',
      icon: 'fas fa-chart-line',
      children: [
        { label: 'Monthly Sales', icon: 'fas fa-chart-bar', to: '/reports/sales' },
        { label: 'Top Products', icon: 'fas fa-trophy', to: '/reports/top-products' },
        { label: 'VAT Report', icon: 'fas fa-percent', to: '/reports/vat' },
        { label: 'Staff Performance', icon: 'fas fa-user-tie', to: '/reports/staff' },
        { label: 'Outstanding', icon: 'fas fa-clock', to: '/reports/outstanding' },
        { label: 'Stock Levels', icon: 'fas fa-boxes-stacked', to: '/reports/stock-levels' },
      ],
    });
  }

  items.push({ label: 'Notifications', icon: 'fas fa-bell', to: '/notifications', showBadge: true });

  if (isSuperAdmin) {
    items.push({
      label: 'Administration',
      icon: 'fas fa-shield-halved',
      children: [
        { label: 'Audit Log', icon: 'fas fa-clipboard-list', to: '/admin/audit-logs' },
        { label: 'Users & Roles', icon: 'fas fa-users-gear', to: '/settings/users' },
        { label: 'Company Settings', icon: 'fas fa-building-lock', to: '/settings/company' },
      ],
    });
  }

  items.push({ label: 'My Profile', icon: 'fas fa-user-circle', to: '/profile' });

  return items;
};

// ── NavItem ───────────────────────────────────────────────────────
const NavItem = ({ item, onNavigate, unreadCount = 0 }) => {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children.some((child) => location.pathname.startsWith(child.to));
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
        onClick={() => setOpen((value) => !value)}
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
  const { theme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const closeNav = () => setNav(false);
  const logo = LogoDark;

  const handleLogout = async () => {
    closeNav();
    await logout();
    navigate('/login', { replace: true });
  };

  const menuItems = buildMenu(user?.role);

  return (
    <>
      <div className={`nav-overlay ${nav ? 'overlay-visible' : ''}`} onClick={closeNav} />
      <nav className={`navbar theme-${theme} ${nav ? 'nav-open' : ''}`}>
        <div className="nav-brand">
          <NavLink to="/" className="brand-link" onClick={closeNav}>
            <img src={logo} alt="Otelex Ltd" className="brand-logo-img" />
          </NavLink>
          <button className="nav-close-btn" onClick={closeNav} type="button" aria-label="Close navigation">
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
          <button className="nav-logout" onClick={handleLogout} type="button">
            <i className="fas fa-right-from-bracket" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default NavBar;
