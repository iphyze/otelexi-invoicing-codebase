import React, { useEffect, useState } from 'react';
import useThemeStore from '../../stores/useThemeStore';
import { formatCurrencyDecimals } from '../../utils/helper';

const CreditNoteModal = ({ open, invoice, onClose, onConfirm, loading }) => {
  const { theme } = useThemeStore();
  const available = Math.max(0, Number(invoice?.adjusted_total ?? invoice?.total_amount ?? 0));
  const [form, setForm] = useState({ amount: '', reason: '', restore_stock: false });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ amount: available ? String(available.toFixed(2)) : '', reason: '', restore_stock: false });
      setError('');
    }
  }, [open, available]);

  if (!open) return null;

  const submit = () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0 || amount > available) {
      setError(`Enter an amount between 0.01 and ${formatCurrencyDecimals(available, invoice.currency)}.`);
      return;
    }
    if (form.reason.trim().length < 8) {
      setError('Please provide a clear reason of at least 8 characters.');
      return;
    }
    setError('');
    onConfirm({ amount, reason: form.reason.trim(), restore_stock: form.restore_stock });
  };

  return (
    <div className="fin-modal-overlay" role="presentation">
      <div className={`fin-modal theme-${theme}`} role="dialog" aria-modal="true" aria-label="Issue credit note">
        <div className="fin-modal-head">
          <div>
            <h2>Issue Credit Note</h2>
            <p>Reduce the financial value of {invoice.invoice_number}. This is an auditable financial adjustment.</p>
          </div>
          <button type="button" className="fin-modal-close" onClick={onClose} disabled={loading}><i className="fas fa-xmark" /></button>
        </div>
        <div className="fin-modal-body">
          <div className="fin-field">
            <label>Credit Amount</label>
            <input type="number" min="0.01" step="0.01" max={available} value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} />
            <small>Maximum creditable value: {formatCurrencyDecimals(available, invoice.currency)}</small>
          </div>
          <div className="fin-field">
            <label>Reason for Credit Note</label>
            <textarea value={form.reason} onChange={(e) => setForm((v) => ({ ...v, reason: e.target.value }))} placeholder="State why this invoice amount is being credited..." />
          </div>
          <label className="fin-check">
            <input type="checkbox" checked={form.restore_stock} onChange={(e) => setForm((v) => ({ ...v, restore_stock: e.target.checked }))} />
            <span>Restore stock quantities. This is only allowed when issuing a full credit note for goods returned or invoice reversal due to defective supply.</span>
          </label>
          {error && <span className="fin-error"><i className="fas fa-circle-exclamation" /> {error}</span>}
        </div>
        <div className="fin-modal-foot">
          <button type="button" className="fin-modal-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="fin-modal-btn warning" onClick={submit} disabled={loading}>
            {loading ? 'Issuing...' : 'Issue Credit Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default CreditNoteModal;
