// components/NotificationPanel.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useThemeStore from '../stores/useThemeStore';
import useNotificationStore from '../stores/useNotificationStore';
import './NotificationPanel.css';

// ── Type → icon/colour mapping ─────────────────────────────────────
const TYPE_META = {
  'invoice.finalized':    { icon: 'fa-paper-plane',         color: '#1a56db' },
  'invoice.paid':         { icon: 'fa-circle-check',        color: '#10b981' },
  'invoice.cancelled':    { icon: 'fa-ban',                 color: '#ef4444' },
  'invoice.overdue_batch':{ icon: 'fa-triangle-exclamation',color: '#f59e0b' },
  'payment.received':     { icon: 'fa-money-bill-wave',     color: '#10b981' },
  'stock.low':            { icon: 'fa-box',                 color: '#f59e0b' },
  'quotation.accepted':   { icon: 'fa-file-pen',            color: '#8b5cf6' },
  'proforma.approved':    { icon: 'fa-file-circle-check',   color: '#8b5cf6' },
};

const getMeta = (type) => TYPE_META[type] || { icon: 'fa-bell', color: '#64748b' };

// Route the user to the relevant record when a notification is clicked
const getRoute = (modelType, modelId) => {
  if (!modelType || !modelId) return null;
  const map = {
    Invoice:      `/invoices/${modelId}`,
    Payment:      `/invoices`,          // payments live inside invoice detail
    Quotation:    `/quotations/${modelId}`,
    ProformaInvoice: `/proformas/${modelId}`,
    Product:      `/products/${modelId}`,
  };
  return map[modelType] || null;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// ── Panel ──────────────────────────────────────────────────────────
const NotificationPanel = ({ triggerRef }) => {
  const { theme }         = useThemeStore();
  const navigate          = useNavigate();
  const panelRef          = useRef(null);
  const {
    notifications, unreadCount, loading, meta, filter, panelOpen,
    closePanel, markRead, markAllRead, setFilter, fetchNotifications,
  } = useNotificationStore();

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  // Close on Escape
  useEffect(() => {
    if (!panelOpen) return;
    const h = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [panelOpen]);

  // Position panel below trigger
  const [pos, setPos] = React.useState({});
  useEffect(() => {
    if (!panelOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      position: 'fixed',
      top:   rect.bottom + 8,
      right: window.innerWidth - rect.right,
      zIndex: 8500,
    });
  }, [panelOpen]);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) await markRead([notif.id]);
    const route = getRoute(notif.model_type, notif.model_id);
    if (route) { navigate(route); closePanel(); }
  };

  const handleViewAll = () => {
    navigate('/notifications');
    closePanel();
  };

  if (!panelOpen) return null;

  return createPortal(
    <motion.div
      ref={panelRef}
      className={`np-panel theme-${theme}`}
      style={pos}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
    >
      {/* Header */}
      <div className="np-header">
        <div className="np-header-left">
          <h3 className="np-title">Notifications</h3>
          {unreadCount > 0 && (
            <span className="np-unread-pill">{unreadCount} new</span>
          )}
        </div>
        <div className="np-header-right">
          {unreadCount > 0 && (
            <button className="np-mark-all" onClick={markAllRead} type="button">
              Mark all read
            </button>
          )}
          <button className="np-close" onClick={closePanel} type="button">
            <i className="fas fa-xmark" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="np-tabs">
        {['all', 'unread'].map((f) => (
          <button
            key={f}
            type="button"
            className={`np-tab ${filter === f ? 'is-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="np-list">
        {loading && notifications.length === 0 && (
          <div className="np-loading">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`np-shimmer theme-${theme}`} />
            ))}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="np-empty">
            <i className="fas fa-bell-slash" />
            <p>{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
          </div>
        )}

        <AnimatePresence>
          {notifications.map((n, i) => {
            const meta = getMeta(n.type);
            return (
              <motion.div
                key={n.id}
                className={`np-item ${!n.is_read ? 'np-item-unread' : ''} theme-${theme}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleNotifClick(n)}
              >
                <div className="np-icon-wrap" style={{ background: `${meta.color}18`, color: meta.color }}>
                  <i className={`fas ${meta.icon}`} />
                </div>
                <div className="np-item-body">
                  <p className="np-item-title">{n.title}</p>
                  <p className="np-item-msg">{n.message}</p>
                  <span className="np-item-time">{timeAgo(n.created_at)}</span>
                </div>
                {!n.is_read && <span className="np-unread-dot" />}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="np-footer">
        <button className="np-view-all" onClick={handleViewAll} type="button">
          View all notifications <i className="fas fa-arrow-right" />
        </button>
      </div>
    </motion.div>,
    document.body
  );
};

export default NotificationPanel;
