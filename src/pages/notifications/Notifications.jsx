// pages/notifications/Notifications.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useNotificationStore from '../../stores/useNotificationStore';
import { getNotificationMeta, getNotificationRoute, notificationTimeAgo } from '../../utils/notificationDisplay';
import './Notifications.css';

// Group notifications by date
const groupByDate = (notifications) => {
  const groups = {};
  notifications.forEach((n) => {
    const date = new Date(n.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let key;
    if (date.toDateString() === today.toDateString())     key = 'Today';
    else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';
    else key = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
};

const Notifications = () => {
  const { theme }     = useThemeStore();
  const navigate      = useNavigate();
  const [nav, setNav] = useState(false);

  const {
    notifications, unreadCount, loading, meta, filter, markAllReadVersion,
    fetchNotifications, markRead, markAllRead, setFilter,
  } = useNotificationStore();

  const [page, setPage] = useState(1);
  const [allNotifs, setAllNotifs] = useState([]);
  const [fetching, setFetching]   = useState(false);
  const markAllSeenRef = useRef(markAllReadVersion);

  useEffect(() => {
    document.title = 'Otelex | Notifications';
    loadPage(1, filter);
  }, []);

  const loadPage = async (p, f = filter) => {
    setFetching(true);
    try {
      await fetchNotifications({ filter: f, page: p, limit: 20 });
    } finally { setFetching(false); }
  };

  // Keep the page live while preserving older pages the user already loaded.
  // The 5-second sync refreshes page 1; prepend genuinely new records and
  // refresh matching records so read state stays accurate.
  useEffect(() => {
    setAllNotifs((prev) => {
      if (page === 1) return notifications;

      const incomingById = new Map(notifications.map((n) => [n.id, n]));
      const previousIds = new Set(prev.map((n) => n.id));
      const newItems = notifications.filter((n) => !previousIds.has(n.id));
      const refreshedPrevious = prev.map((n) => incomingById.get(n.id) || n);

      return [...newItems, ...refreshedPrevious];
    });
  }, [notifications, page]);

  // Mark-all can be triggered from the page or the header panel. Reflect it
  // across every locally loaded page, not just the first 20 store records.
  useEffect(() => {
    if (markAllSeenRef.current === markAllReadVersion) return;
    markAllSeenRef.current = markAllReadVersion;

    setAllNotifs((prev) => filter === 'unread'
      ? []
      : prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        })));
  }, [markAllReadVersion, filter]);

  const handleFilterChange = async (f) => {
    setPage(1);
    setAllNotifs([]);
    setFetching(true);
    try {
      await setFilter(f);
    } finally {
      setFetching(false);
    }
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next);
  };

  const applyLocalRead = (ids) => {
    const idSet = new Set(ids.map(Number));
    setAllNotifs((prev) => filter === 'unread'
      ? prev.filter((n) => !idSet.has(Number(n.id)))
      : prev.map((n) => idSet.has(Number(n.id))
        ? { ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }
        : n));
  };

  const handleMarkRead = async (ids) => {
    const ok = await markRead(ids);
    if (ok) applyLocalRead(ids);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) await handleMarkRead([notif.id]);
    const route = getNotificationRoute(notif.model_type, notif.model_id);
    if (route) navigate(route);
  };

  const groups = groupByDate(allNotifs);
  const totalPages = meta?.total_pages || 1;

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Notifications"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Notifications', active: true }]}
        />

        <div className="notif-layout">
          {/* ── Sidebar ── */}
          <div className={`notif-sidebar theme-${theme}`}>
            <div className="notif-sidebar-section">
              <p className="notif-sidebar-label">Filter</p>
              {[
                { key: 'all',    icon: 'fa-list',          label: 'All Notifications' },
                { key: 'unread', icon: 'fa-circle',        label: 'Unread' },
              ].map((f) => (
                <button
                  key={f.key} type="button"
                  className={`notif-filter-btn ${filter === f.key ? 'is-active' : ''}`}
                  onClick={() => handleFilterChange(f.key)}
                >
                  <i className={`fas ${f.icon}`} />
                  <span>{f.label}</span>
                  {f.key === 'unread' && unreadCount > 0 && (
                    <span className="notif-filter-count">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={handleMarkAllRead} type="button">
                <i className="fas fa-check-double" /> Mark all as read
              </button>
            )}
          </div>

          {/* ── Main list ── */}
          <div className="notif-main">
            {/* Loading skeleton on first load */}
            {loading && allNotifs.length === 0 && (
              <div className="notif-loading">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`notif-shimmer theme-${theme}`} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && allNotifs.length === 0 && (
              <motion.div className={`notif-empty theme-${theme}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="notif-empty-icon">
                  <i className="fas fa-bell-slash" />
                </div>
                <h4>{filter === 'unread' ? 'All caught up!' : 'No notifications yet'}</h4>
                <p>{filter === 'unread'
                  ? 'You have no unread notifications.'
                  : 'Notifications about quotations, proformas, invoices, payments, deliveries, and stock will appear here.'
                }</p>
              </motion.div>
            )}

            {/* Grouped notification list */}
            <AnimatePresence>
              {Object.entries(groups).map(([dateLabel, items]) => (
                <div key={dateLabel} className="notif-group">
                  <div className="notif-date-label">
                    <span>{dateLabel}</span>
                  </div>

                  {items.map((n, i) => {
                    const meta    = getNotificationMeta(n.type);
                    const hasLink = !!getNotificationRoute(n.model_type, n.model_id);
                    return (
                      <motion.div
                        key={n.id}
                        className={`notif-item ${!n.is_read ? 'notif-unread' : ''} ${hasLink ? 'notif-clickable' : ''} theme-${theme}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => hasLink && handleItemClick(n)}
                      >
                        {/* Unread bar */}
                        {!n.is_read && <div className="notif-unread-bar" />}

                        <div className="notif-icon-wrap" style={{ background: `${meta.color}18`, color: meta.color }}>
                          <i className={`fas ${meta.icon}`} />
                        </div>

                        <div className="notif-item-body">
                          <div className="notif-item-top">
                            <span className="notif-item-title">{n.title}</span>
                            <span className="notif-item-time">{notificationTimeAgo(n.created_at, { long: true })}</span>
                          </div>
                          <p className="notif-item-msg">{n.message}</p>
                          <div className="notif-item-meta">
                            <span className="notif-type-badge" style={{ color: meta.color, background: `${meta.color}12` }}>
                              {meta.label}
                            </span>
                            {!n.is_read && (
                              <button
                                className="notif-mark-single"
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleMarkRead([n.id]); }}
                              >
                                Mark read
                              </button>
                            )}
                            {hasLink && (
                              <span className="notif-view-link">
                                View <i className="fas fa-arrow-right" />
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </AnimatePresence>

            {/* Load more */}
            {allNotifs.length > 0 && page < totalPages && (
              <div className="notif-load-more">
                <button className="notif-load-btn" onClick={handleLoadMore} disabled={fetching} type="button">
                  {fetching ? <><span className="notif-spinner" /> Loading...</> : 'Load more notifications'}
                </button>
              </div>
            )}

            {/* End of list */}
            {allNotifs.length > 0 && page >= totalPages && (
              <p className="notif-end-msg">You've seen all notifications.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
