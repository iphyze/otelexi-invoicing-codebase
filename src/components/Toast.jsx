// services/Toast.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import useToastStore from '../stores/useToastStore';
import './Toast.css';

const ICONS = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
const LABELS = { success: 'Success', error: 'Error', info: 'Info', warning: 'Warning' };
const DURATION = 5000;

const ToastItem = ({ toast, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [barActive, setBarActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Enter
    requestAnimationFrame(() => {
      setVisible(true);
      // Tiny delay so browser registers width:100% before we switch to width:0
      setTimeout(() => setBarActive(true), 50);
    });
    timerRef.current = setTimeout(handleClose, DURATION);
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleClose = useCallback(() => {
    clearTimeout(timerRef.current);
    setLeaving(true);
    setTimeout(() => onClose(toast.id), 340);
  }, [toast.id, onClose]);

  return (
    <div
      className={`toast-item toast-${toast.type} ${visible ? 'toast-in' : ''} ${leaving ? 'toast-out' : ''}`}
      role="alert" aria-live="assertive"
    >
      <div className="toast-accent" />
      <div className="toast-icon-wrap">
        <i className={`fas ${ICONS[toast.type] || ICONS.info}`} />
      </div>
      <div className="toast-content">
        <p className="toast-label">{LABELS[toast.type] || 'Notice'}</p>
        <p className="toast-message">{toast.message}</p>
      </div>
      <button className="toast-close-btn" onClick={handleClose} aria-label="Dismiss">
        <i className="fas fa-xmark" />
      </button>
      {/* Progress bar uses CSS transition so it's perfectly synced */}
      <div className="toast-progress">
        <div
          className="toast-progress-bar"
          style={{
            width: barActive ? '0%' : '100%',
            transition: barActive ? `width ${DURATION}ms linear` : 'none',
          }}
        />
      </div>
    </div>
  );
};

const Toast = () => {
  const { toasts, hideToast } = useToastStore();
  return createPortal(
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onClose={hideToast} />)}
    </div>,
    document.body
  );
};

export default Toast;