import React, { useEffect, useState } from 'react';
import useThemeStore from '../../stores/useThemeStore';

const ReverseInvoiceModal = ({ open, invoiceNumber, onClose, onConfirm, loading }) => {
  const { theme } = useThemeStore();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setError(''); } }, [open]);
  if (!open) return null;
  const submit = () => {
    if (reason.trim().length < 8) { setError('Please provide a clear reason of at least 8 characters.'); return; }
    setError(''); onConfirm(reason.trim());
  };
  return (
    <div className="fin-modal-overlay" role="presentation">
      <div className={`fin-modal theme-${theme}`} role="dialog" aria-modal="true" aria-label="Reverse invoice">
        <div className="fin-modal-head"><div><h2>Reverse Invoice</h2><p>Reverse {invoiceNumber} before payment. Any deducted stock will be restored.</p></div><button className="fin-modal-close" type="button" onClick={onClose} disabled={loading}><i className="fas fa-xmark" /></button></div>
        <div className="fin-modal-body">
          <div className="fin-check"><i className="fas fa-triangle-exclamation" /><span>This action is permanent and restricted to the Super Admin. Paid or credited invoices cannot be reversed here.</span></div>
          <div className="fin-field"><label>Reason for Reversal</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="State why this final invoice must be reversed..." /></div>
          {error && <span className="fin-error"><i className="fas fa-circle-exclamation" /> {error}</span>}
        </div>
        <div className="fin-modal-foot"><button type="button" className="fin-modal-btn" onClick={onClose} disabled={loading}>Cancel</button><button type="button" className="fin-modal-btn danger" onClick={submit} disabled={loading}>{loading ? 'Reversing...' : 'Reverse Invoice'}</button></div>
      </div>
    </div>
  );
};
export default ReverseInvoiceModal;
