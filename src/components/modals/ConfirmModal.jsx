// components/modals/ConfirmModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';
import './ConfirmModal.css';

const ICON_MAP = {
  danger: { icon: 'fa-triangle-exclamation', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  warning: { icon: 'fa-circle-exclamation', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  info: { icon: 'fa-circle-info', color: '#1a56db', bg: 'rgba(26,86,219,0.12)' },
  success: { icon: 'fa-circle-check', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  primary: { icon: 'fa-circle-check', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
};

const ConfirmModal = ({
  open,
  onClose,
  onCancel,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
  extraContent = null,
  closeOnBackdrop = true,
}) => {
  const { theme } = useThemeStore();

  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);

  // ── Open → mount + animate in ──────────────────────────────
  // ── Close → animate out, then unmount ─────────────────────
  useEffect(() => {
    if (open) {
      clearTimeout(timerRef.current);
      setMounted(true);
      // Double RAF: guarantees the browser paints the base (hidden) state
      // before we add the enter class — otherwise the transition is skipped.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
    } else {
      setActive(false);
    }
  }, [open]);

  // Unmount after exit transition finishes
  useEffect(() => {
    if (mounted && !active) {
      timerRef.current = setTimeout(() => setMounted(false), 270);
      return () => clearTimeout(timerRef.current);
    }
  }, [active, mounted]);

  // Safety cleanup
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClose = () => {
    if (loading) return;
    onClose?.(); // parent sets open=false → triggers exit animation above
  };

  const handleCancel = () => {
    if (loading) return;
    (onCancel || onClose)?.();
  };

  if (!mounted) return null;

  const { icon: defIcon, color, bg } = ICON_MAP[variant] || ICON_MAP.info;
  const iconClass = icon || defIcon;

  return createPortal(
    <div
      className={`cm-backdrop ${active ? 'cm-visible' : ''}`}
      onClick={closeOnBackdrop ? handleClose : undefined}
    >
      <div
        className={`cm-modal theme-${theme} ${active ? 'cm-modal-in' : 'cm-modal-out'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="cm-icon-wrap" style={{ background: bg }}>
          <i className={`fas ${iconClass}`} style={{ color }} />
        </div>

        <h3 className="cm-title">{title}</h3>
        {message && <p className="cm-message">{message}</p>}
        {extraContent && <div className="cm-extra-content">{extraContent}</div>}

        <div className="cm-actions">
          <button
            className="cm-btn cm-cancel"
            onClick={handleCancel}
            type="button"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`cm-btn cm-confirm variant-${variant}`}
            onClick={onConfirm}
            type="button"
            disabled={loading}
          >
            {loading
              ? <><span className="cm-spinner" /> Processing...</>
              : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;