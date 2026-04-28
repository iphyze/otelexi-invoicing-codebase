// pages/quotations/RejectModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';
import './RejectModal.css';

const RejectModal = ({ open, quotationNumber, onClose, onConfirm, loading }) => {
  const { theme } = useThemeStore();
  const [reason, setReason] = useState('');
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (open) {
      clearTimeout(timer.current);
      setReason('');
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
      setTimeout(() => inputRef.current?.focus(), 120);
    } else {
      setActive(false);
    }
  }, [open]);

  useEffect(() => {
    if (mounted && !active) {
      timer.current = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(timer.current);
    }
  }, [active, mounted]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, loading]);

  if (!mounted) return null;

  return createPortal(
    <div className={`rm-backdrop ${active ? 'rm-visible' : ''}`} onClick={() => !loading && onClose()}>
      <div
        className={`rm-panel theme-${theme} ${active ? 'rm-in' : 'rm-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rm-header">
          <div className="rm-header-icon">
            <i className="fas fa-circle-xmark" />
          </div>
          <div>
            <h4 className="rm-title">Reject Quotation</h4>
            <p className="rm-sub">{quotationNumber}</p>
          </div>
          <button className="rm-close" onClick={onClose} type="button" disabled={loading}>
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="rm-body">
          <label className="rm-label">Rejection Reason <span className="rm-opt">(optional)</span></label>
          <textarea
            ref={inputRef}
            className={`rm-textarea theme-${theme}`}
            placeholder="e.g. Budget constraints, items not available, pricing too high..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <p className="rm-note">
            <i className="fas fa-circle-info" />
            The reason will be logged in the activity trail. The client will not be notified automatically.
          </p>
        </div>

        <div className="rm-actions">
          <button className="rm-btn rm-cancel" onClick={onClose} disabled={loading} type="button">
            Cancel
          </button>
          <button className="rm-btn rm-confirm" onClick={() => onConfirm(reason)} disabled={loading} type="button">
            {loading
              ? <><span className="rm-spinner" /> Rejecting...</>
              : <><i className="fas fa-circle-xmark" /> Reject Quotation</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RejectModal;
