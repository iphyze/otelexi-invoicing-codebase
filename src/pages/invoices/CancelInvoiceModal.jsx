// pages/invoices/CancelInvoiceModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';

const CancelInvoiceModal = ({ open, invoiceNumber, onClose, onConfirm, loading }) => {
  const { theme } = useThemeStore();
  const [reason, setReason] = useState('');
  const [mounted, setMounted] = useState(false);
  const [active, setActive]   = useState(false);
  const inputRef = useRef(null);
  const timer    = useRef(null);

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
    const h = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, loading]);

  if (!mounted) return null;

  return createPortal(
    <div className={`rm-backdrop ${active ? 'rm-visible' : ''}`} onClick={() => !loading && onClose()}>
      <div className={`rm-panel theme-${theme} ${active ? 'rm-in' : 'rm-out'}`} onClick={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <div className="rm-header-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            <i className="fas fa-ban" />
          </div>
          <div>
            <h4 className="rm-title">Cancel Invoice</h4>
            <p className="rm-sub">{invoiceNumber}</p>
          </div>
          <button className="rm-close" onClick={onClose} type="button" disabled={loading}>
            <i className="fas fa-xmark" />
          </button>
        </div>
        <div className="rm-body">
          <div className="cancel-inv-warning">
            <i className="fas fa-triangle-exclamation" />
            <div>
              <strong>Admin-only action.</strong> If stock was previously deducted, it will be restored.
              Any partial payments on this invoice will <strong>not</strong> be automatically refunded —
              please process refunds manually.
            </div>
          </div>
          <label className="rm-label">Cancellation Reason <span className="rm-opt">(optional)</span></label>
          <textarea
            ref={inputRef}
            className={`rm-textarea theme-${theme}`}
            placeholder="e.g. Client cancelled the order..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={loading}
          />
        </div>
        <div className="rm-actions">
          <button className="rm-btn rm-cancel" onClick={onClose} disabled={loading} type="button">Go Back</button>
          <button className="rm-btn rm-confirm rm-danger" onClick={() => onConfirm(reason)} disabled={loading} type="button">
            {loading ? <><span className="rm-spinner" /> Cancelling...</> : <><i className="fas fa-ban" /> Cancel Invoice</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CancelInvoiceModal;
