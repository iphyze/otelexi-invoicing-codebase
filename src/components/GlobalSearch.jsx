// components/GlobalSearch.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clientService from '../services/clientService';
import productService from '../services/productService';
import quotationService from '../services/quotationService';
import invoiceService from '../services/invoiceService';
import userService from '../services/userService';
import useAuthStore from '../stores/useAuthStore';
import './GlobalSearch.css';

// ── Entity config ─────────────────────────────────────────────────
// Each searcher returns normalised result objects.
// Only run entities the current role has access to.
const buildSearchers = (role) => {
  const isAdmin = ['super_admin', 'admin'].includes(role);
  const isSuperAdmin = role === 'super_admin';
  const isSales = role === 'sales';
  const isAccounting = role === 'accounting';

  return [
    // Clients — all roles
    {
      key: 'clients',
      label: 'Clients',
      icon: 'fa-users',
      color: '#1a56db',
      run: async (q) => {
        const res = await clientService.searchClients(q);
        return (res.data.data || []).slice(0, 4).map((c) => ({
          id: c.id,
          type: 'clients',
          icon: 'fa-building',
          title: c.company_name,
          sub: [c.city, c.phone].filter(Boolean).join(' · '),
          badge: c.is_active ? null : 'Inactive',
          to: `/clients/${c.id}`,
        }));
      },
    },

    // Products — admin and sales
    ...(isAdmin || isSales ? [{
      key: 'products',
      label: 'Products',
      icon: 'fa-boxes-stacked',
      color: '#10b981',
      run: async (q) => {
        const res = await productService.searchProducts(q);
        return (res.data.data || []).slice(0, 4).map((p) => ({
          id: p.id,
          type: 'products',
          icon: 'fa-box',
          title: p.name,
          sub: [p.sku, p.category_name].filter(Boolean).join(' · '),
          badge: p.stock_quantity <= (p.reorder_level || 0) ? 'Low Stock' : null,
          badgeCls: 'warning',
          to: `/products/${p.id}`,
        }));
      },
    }] : []),

    // Quotations — admin and sales
    ...(isAdmin || isSales ? [{
      key: 'quotations',
      label: 'Quotations',
      icon: 'fa-file-pen',
      color: '#8b5cf6',
      run: async (q) => {
        const res = await quotationService.searchQuotations(q);
        return (res.data.data || []).slice(0, 3).map((qt) => ({
          id: qt.id,
          type: 'quotations',
          icon: 'fa-file-pen',
          title: qt.quotation_number,
          sub: [qt.client?.company_name, qt.issue_date].filter(Boolean).join(' · '),
          badge: qt.status,
          to: `/quotations/${qt.id}`,
        }));
      },
    }] : []),

    // Invoices — all roles
    {
      key: 'invoices',
      label: 'Invoices',
      icon: 'fa-file-invoice',
      color: '#f59e0b',
      run: async (q) => {
        const res = await invoiceService.getInvoices({ search: q, limit: 4 });
        return (res.data.data || []).slice(0, 4).map((inv) => ({
          id: inv.id,
          type: 'invoices',
          icon: 'fa-file-invoice',
          title: inv.invoice_number,
          sub: [inv.client?.company_name || inv.client_name, inv.issue_date].filter(Boolean).join(' · '),
          badge: inv.status,
          to: `/invoices/${inv.id}`,
        }));
      },
    },

    // Users — admin only
    ...(isSuperAdmin ? [{
      key: 'users',
      label: 'Users',
      icon: 'fa-users-cog',
      color: '#06b6d4',
      run: async (q) => {
        const res = await userService.searchUsers(q);
        return (res.data.data || []).slice(0, 3).map((u) => ({
          id: u.id,
          type: 'users',
          icon: 'fa-user',
          title: u.name,
          sub: [u.email, u.role].filter(Boolean).join(' · '),
          badge: u.role,
          to: `/settings/users`,
        }));
      },
    }] : []),
  ];
};

// ── Status/role badge colour ──────────────────────────────────────
const BADGE_CLS = {
  draft: 'gs-badge-grey',
  sent: 'gs-badge-blue',
  accepted: 'gs-badge-green',
  approved: 'gs-badge-green',
  paid: 'gs-badge-green',
  partial: 'gs-badge-amber',
  overdue: 'gs-badge-red',
  credited: 'gs-badge-amber',
  reversed: 'gs-badge-grey',
  cancelled: 'gs-badge-grey',
  rejected: 'gs-badge-red',
  converted: 'gs-badge-purple',
  admin: 'gs-badge-purple',
  sales: 'gs-badge-blue',
  accounting: 'gs-badge-green',
  super_admin: 'gs-badge-blue',
  Inactive: 'gs-badge-red',
  'Low Stock': 'gs-badge-amber',
};

/* ─────────────────────────────────────────────────────────────────
   Props:
   theme     — 'dark' | 'light'
   forceOpen — boolean  (mobile: skip trigger, open panel immediately)
   onClose   — callback (mobile: called when panel closes)
──────────────────────────────────────────────────────────────────── */
const GlobalSearch = ({ theme, forceOpen = false, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const abortRef = useRef(null);   // abort controller for in-flight requests

  const [open, setOpen] = useState(forceOpen);
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState([]);     // [{ key, label, color, items }]
  const [active, setActive] = useState(0);      // flat index
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);  // did we search at least once?

  const searchers = buildSearchers(user?.role);

  // Focus on mount when forceOpen
  useEffect(() => {
    if (forceOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [forceOpen]);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    if (forceOpen) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [forceOpen]);

  // Escape when forceOpen
  useEffect(() => {
    if (!forceOpen) return;
    const h = (e) => { if (e.key === 'Escape') closeSearch(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [forceOpen]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) closeSearch();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Debounced multi-entity search ─────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (!q) { setGroups([]); setActive(0); setSearched(false); setLoading(false); return; }

    // Cancel previous requests
    if (abortRef.current) abortRef.current.abort();

    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(false);

      try {
        // Run all searchers in parallel — individual failures don't stop others
        const results = await Promise.allSettled(
          searchers.map((s) => s.run(q))
        );

        const populated = [];
        results.forEach((res, i) => {
          if (res.status === 'fulfilled' && res.value.length > 0) {
            const s = searchers[i];
            populated.push({ key: s.key, label: s.label, color: s.color, items: res.value });
          }
        });

        setGroups(populated);
        setActive(0);
        setSearched(true);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Flat list of all items for keyboard nav
  const flat = groups.flatMap((g) => g.items);
  const totalResults = flat.length;

  const openSearch = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery('');
    setGroups([]);
    setActive(0);
    setSearched(false);
    setLoading(false);
    onClose?.();
  }, [onClose]);

  const goTo = (to) => { navigate(to); closeSearch(); };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
    } else if (e.key === 'Enter' && flat[active]) {
      goTo(flat[active].to);
    }
  };

  // Compute cumulative flat index per group for keyboard nav colouring
  let flatIdx = 0;

  const panel = (
    <div className={`gs-panel theme-${theme}`} ref={panelRef} role="dialog" aria-label="Global search">

      {/* ── Input row ── */}
      <div className={`gs-input-row theme-${theme}`}>
        <i className="fas fa-magnifying-glass gs-input-icon" />
        <input
          ref={inputRef}
          className={`gs-input theme-${theme}`}
          type="text"
          placeholder="Search clients, invoices, products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        {/* Loading indicator — animated bar below input */}
        {loading && <span className="gs-spinner" />}
        {query && !loading && (
          <button className="gs-clear" onClick={() => setQuery('')} type="button" aria-label="Clear">
            <i className="fas fa-xmark" />
          </button>
        )}
        <kbd className={`gs-esc theme-${theme}`} onClick={closeSearch} role="button" tabIndex={-1}>Esc</kbd>
      </div>

      {/* ── Loading bar ── */}
      {loading && <div className="gs-loading-bar"><div className="gs-loading-bar-fill" /></div>}

      {/* ── Scope chips (what we search) ── */}
      {!query && (
        <div className="gs-scope-row">
          {searchers.map((s) => (
            <span key={s.key} className="gs-scope-chip" style={{ borderColor: `${s.color}40`, color: s.color }}>
              <i className={`fas ${s.icon}`} /> {s.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      <div className="gs-results">
        {/* Empty / idle state */}
        {!query && (
          <div className="gs-hint">
            <i className="fas fa-magnifying-glass" />
            <div>
              <p>Search across {searchers.map((s) => s.label.toLowerCase()).join(', ')}.</p>
              <p className="gs-hint-sub">Type to start searching · Use ↑↓ to navigate · ↵ to open</p>
            </div>
          </div>
        )}

        {/* Loading shimmer */}
        {loading && query && (
          <div className="gs-shimmer-list">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`gs-shimmer-row theme-${theme}`}>
                <div className="gs-shimmer-icon" />
                <div className="gs-shimmer-lines">
                  <div className="gs-shimmer-line" style={{ width: `${55 + i * 10}%` }} />
                  <div className="gs-shimmer-line gs-shimmer-short" style={{ width: `${30 + i * 5}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && searched && totalResults === 0 && (
          <div className="gs-empty">
            <i className="fas fa-face-meh" />
            <p>No results for <strong>"{query}"</strong></p>
            <span>Try a different keyword.</span>
          </div>
        )}

        {/* Grouped results */}
        {!loading && groups.map((group) => (
          <div key={group.key} className="gs-group">
            <p className="gs-group-label" style={{ color: group.color }}>
              <i className={`fas ${searchers.find((s) => s.key === group.key)?.icon}`} />
              {group.label}
              <span className="gs-group-count">{group.items.length}</span>
            </p>
            {group.items.map((item) => {
              const idx = flatIdx++;
              const isAct = idx === active;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  className={`gs-item ${isAct ? 'is-active' : ''}`}
                  onClick={() => goTo(item.to)}
                  type="button"
                >
                  <div className="gs-item-icon" style={{ background: `${group.color}18`, color: group.color }}>
                    <i className={`fas ${item.icon}`} />
                  </div>
                  <div className="gs-item-text">
                    <span className="gs-item-title">{item.title}</span>
                    {item.sub && <span className="gs-item-sub">{item.sub}</span>}
                  </div>
                  {item.badge && (
                    <span className={`gs-badge ${BADGE_CLS[item.badge] || 'gs-badge-grey'}`}>
                      {item.badge}
                    </span>
                  )}
                  <i className="fas fa-arrow-right gs-item-arrow" />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      {totalResults > 0 && (
        <div className={`gs-footer theme-${theme}`}>
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
          <span className="gs-footer-count">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );

  if (forceOpen) {
    return (<><div className="gs-overlay" onClick={closeSearch} />{panel}</>);
  }

  return (
    <div className="gs-wrapper">
      <button className={`gs-trigger theme-${theme}`} onClick={openSearch} type="button" aria-label="Open search">
        <i className="fas fa-magnifying-glass gs-trigger-icon" />
        <span className="gs-trigger-text">Search anything...</span>
        <kbd className={`gs-shortcut theme-${theme}`}>⌘K</kbd>
      </button>
      {open && (<><div className="gs-overlay" onClick={closeSearch} />{panel}</>)}
    </div>
  );
};

export default GlobalSearch;