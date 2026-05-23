import React, { useEffect, useState } from 'react';
import useThemeStore from '../../stores/useThemeStore';
import { formatCurrencyDecimals } from '../../utils/helper';

const RefundModal = ({ open, creditNote, invoice, onClose, onConfirm, loading }) => {
  const { theme } = useThemeStore();
  const [form, setForm] = useState({ amount: '', refund_date: '', payment_method: 'bank_transfer', reference: '', notes: '' });
  const [error, setError] = useState('');
  const available = Number(creditNote?.refundable_amount ?? creditNote?.amount ?? 0);

  useEffect(() => {
    if (open) {
      setForm({ amount: available ? available.toFixed(2) : '', refund_date: new Date().toISOString().slice(0, 10), payment_method: 'bank_transfer', reference: '', notes: '' });
      setError('');
    }
  }, [open, available]);

  if (!open || !creditNote) return null;

  const submit = () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0 || amount > available) {
      setError(`Enter an amount between 0.01 and ${formatCurrencyDecimals(available, invoice.currency)}.`);
      return;
    }
    setError('');
    onConfirm({ ...form, amount });
  };

  return (
    <div className="fin-modal-overlay" role="presentation">
      <div className={`fin-modal theme-${theme}`} role="dialog" aria-modal="true" aria-label="Process refund">
        <div className="fin-modal-head">
          <div><h2>Process Refund</h2><p>Record money returned against {creditNote.credit_note_number}.</p></div>
          <button type="button" className="fin-modal-close" onClick={onClose} disabled={loading}><i className="fas fa-xmark" /></button>
        </div>
        <div className="fin-modal-body">
          <div className="fin-field"><label>Refund Amount</label><input type="number" min="0.01" step="0.01" max={available} value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} /><small>Available for refund: {formatCurrencyDecimals(available, invoice.currency)}</small></div>
          <div className="fin-field"><label>Refund Date</label><input type="date" value={form.refund_date} onChange={(e) => setForm((v) => ({ ...v, refund_date: e.target.value }))} /></div>
          <div className="fin-field"><label>Refund Method</label><select value={form.payment_method} onChange={(e) => setForm((v) => ({ ...v, payment_method: e.target.value }))}><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="pos">POS</option><option value="other">Other</option></select></div>
          <div className="fin-field"><label>Reference (Optional)</label><input value={form.reference} onChange={(e) => setForm((v) => ({ ...v, reference: e.target.value }))} placeholder="Bank reference or approval number" /></div>
          <div className="fin-field"><label>Notes (Optional)</label><textarea value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} placeholder="Record any supporting detail for this refund..." /></div>
          {error && <span className="fin-error"><i className="fas fa-circle-exclamation" /> {error}</span>}
        </div>
        <div className="fin-modal-foot">
          <button type="button" className="fin-modal-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="fin-modal-btn danger" onClick={submit} disabled={loading}>{loading ? 'Processing...' : 'Process Refund'}</button>
        </div>
      </div>
    </div>
  );
};
export default RefundModal;
