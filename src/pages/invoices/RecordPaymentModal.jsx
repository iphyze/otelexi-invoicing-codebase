// pages/invoices/RecordPaymentModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';
import DatePicker from '../../components/DatePicker';

const METHOD_OPTS = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'fa-building-columns' },
  { value: 'cash',          label: 'Cash',          icon: 'fa-money-bills' },
  { value: 'pos',           label: 'POS',           icon: 'fa-credit-card' },
  { value: 'cheque',        label: 'Cheque',        icon: 'fa-file-invoice' },
  { value: 'online',        label: 'Online',        icon: 'fa-globe' },
];

const RecordPaymentModal = ({ open, invoice, onClose, onConfirm, loading }) => {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [active, setActive]   = useState(false);
  const timer = useRef(null);

  const [form, setForm] = useState({
    amount: '', payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer', reference: '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const amountRef = useRef(null);

  useEffect(() => {
    if (open) {
      clearTimeout(timer.current);
      setForm({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference: '', notes: '',
      });
      setErrors({});
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
      setTimeout(() => amountRef.current?.focus(), 120);
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

  const balanceDue = invoice?.balance_due || 0;
  const currency   = invoice?.currency || 'NGN';
  const sym        = currency === 'USD' ? '$' : '₦';

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleSubmit = () => {
    const errs = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0)        errs.amount = 'Amount must be a positive number.';
    if (amt > balanceDue)                              errs.amount = `Cannot exceed balance due (${sym}${balanceDue.toLocaleString()}).`;
    if (!form.payment_date)                            errs.payment_date = 'Payment date is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onConfirm({
      invoice_id:     invoice.id,
      amount:         amt,
      payment_date:   form.payment_date,
      payment_method: form.payment_method,
      reference:      form.reference || null,
      notes:          form.notes || null,
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`rm-backdrop ${active ? 'rm-visible' : ''}`} onClick={() => !loading && onClose()}>
      <div className={`rm-panel rpm-panel theme-${theme} ${active ? 'rm-in' : 'rm-out'}`} onClick={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <div className="rm-header-icon"><i className="fas fa-money-bill-wave" /></div>
          <div>
            <h4 className="rm-title">Record Payment</h4>
            <p className="rm-sub">{invoice?.invoice_number} · Balance: {sym}{Number(balanceDue).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          </div>
          <button className="rm-close" onClick={onClose} type="button" disabled={loading}><i className="fas fa-xmark" /></button>
        </div>

        <div className="rm-body rpm-body">
          {/* Amount */}
          <div className="rpm-field">
            <label className="rpm-label">Amount ({currency}) <span className="rm-req">*</span></label>
            <div className="rpm-amount-wrap">
              <span className="rpm-sym">{sym}</span>
              <input
                ref={amountRef}
                type="number" min="0.01" step="0.01"
                className={`rpm-input theme-${theme} ${errors.amount ? 'has-error' : ''}`}
                placeholder={`0.00 (max ${sym}${Number(balanceDue).toLocaleString()})`}
                value={form.amount}
                onChange={(e) => setField('amount', e.target.value)}
                onWheel={(e) => e.target.blur()}
              />
            </div>
            {errors.amount && <span className="rpm-error"><i className="fas fa-circle-exclamation" /> {errors.amount}</span>}
            <div className="rpm-balance-hint">
              <button type="button" className="rpm-full-btn" onClick={() => setField('amount', balanceDue.toFixed(2))}>
                <i className="fas fa-check-double" /> Pay full balance ({sym}{Number(balanceDue).toLocaleString('en-NG', { minimumFractionDigits: 2 })})
              </button>
            </div>
          </div>

          {/* Payment Date */}
          <div className="rpm-field">
            <DatePicker
              label="Payment Date"
              required
              value={form.payment_date}
              onChange={(v) => setField('payment_date', v)}
              error={errors.payment_date}
            />
          </div>

          {/* Method */}
          <div className="rpm-field">
            <label className="rpm-label">Payment Method <span className="rm-req">*</span></label>
            <div className="rpm-method-grid">
              {METHOD_OPTS.map((m) => (
                <button
                  key={m.value} type="button"
                  className={`rpm-method-btn ${form.payment_method === m.value ? 'is-active' : ''} theme-${theme}`}
                  onClick={() => setField('payment_method', m.value)}
                >
                  <i className={`fas ${m.icon}`} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div className="rpm-field">
            <label className="rpm-label">Reference <span className="rpm-opt">(optional)</span></label>
            <input
              type="text"
              className={`rpm-input theme-${theme}`}
              placeholder="e.g. TRF/2026/00412"
              value={form.reference}
              onChange={(e) => setField('reference', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="rpm-field">
            <label className="rpm-label">Notes <span className="rpm-opt">(optional)</span></label>
            <textarea
              className={`rpm-input rpm-textarea theme-${theme}`}
              placeholder="e.g. First instalment received."
              rows={2}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="rm-actions">
          <button className="rm-btn rm-cancel" onClick={onClose} disabled={loading} type="button">Cancel</button>
          <button className="rm-btn rm-confirm" onClick={handleSubmit} disabled={loading} type="button">
            {loading ? <><span className="rm-spinner" /> Recording...</> : <><i className="fas fa-money-bill-wave" /> Record Payment</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RecordPaymentModal;
