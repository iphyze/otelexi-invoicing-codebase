// pages/invoices/PaymentLinkModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';
import SelectInput from '../../components/SelectInput';
import './PaymentLinkModal.css';

const PROVIDERS = [
  { value: 'manual', label: 'Manual Payment Request', icon: 'fa-building-columns' },
  { value: 'paystack', label: 'Paystack Checkout', icon: 'fa-shield-halved' },
];

const EXPIRY_OPTIONS = [
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

const formatAmount = (amount, currency = 'NGN') => {
  const symbol = currency === 'USD' ? '$' : '₦';
  return `${symbol}${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
};

const PaymentLinkModal = ({ open, invoice, onClose, onConfirm, loading }) => {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const timer = useRef(null);
  const amountRef = useRef(null);
  const [form, setForm] = useState({ provider: 'manual', amount: '', expires_in_days: 7, send_email: true });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      clearTimeout(timer.current);
      setForm({ provider: 'manual', amount: '', expires_in_days: 7, send_email: true });
      setErrors({});
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
      setTimeout(() => amountRef.current?.focus(), 150);
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
    const handler = (event) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, loading, onClose]);

  if (!mounted) return null;

  const balanceDue = Number(invoice?.balance_due || 0);
  const currency = invoice?.currency || 'NGN';
  const provider = form.provider;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = () => {
    const amount = form.amount === '' ? balanceDue : Number(form.amount);
    const nextErrors = {};
    if (!amount || Number.isNaN(amount) || amount <= 0) nextErrors.amount = 'Enter a valid payment amount.';
    if (amount > balanceDue) nextErrors.amount = `Amount cannot exceed ${formatAmount(balanceDue, currency)}.`;
    if (!form.provider) nextErrors.provider = 'Select a payment provider.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    onConfirm({
      provider: form.provider,
      amount,
      expires_in_days: Number(form.expires_in_days || 7),
      send_email: Boolean(form.send_email),
    });
  };

  return createPortal(
    <div className={`plm-backdrop ${active ? 'plm-visible' : ''}`} onClick={() => !loading && onClose()}>
      <div className={`plm-panel theme-${theme} ${active ? 'plm-in' : 'plm-out'}`} onClick={(event) => event.stopPropagation()}>
        <div className="plm-header">
          <div className="plm-header-icon"><i className="fas fa-link" /></div>
          <div>
            <h4>Create Payment Request</h4>
            <p>{invoice?.invoice_number} · Balance due: {formatAmount(balanceDue, currency)}</p>
          </div>
          <button className="plm-close" type="button" disabled={loading} onClick={onClose}><i className="fas fa-xmark" /></button>
        </div>

        <div className="plm-body">
          <div className="plm-provider-grid">
            {PROVIDERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`plm-provider-card theme-${theme} ${provider === item.value ? 'active' : ''}`}
                onClick={() => setField('provider', item.value)}
              >
                <span><i className={`fas ${item.icon}`} /></span>
                <strong>{item.label}</strong>
                <small>{item.value === 'paystack' ? 'Create secure hosted checkout link.' : 'Email bank details and payment reference.'}</small>
              </button>
            ))}
          </div>
          {errors.provider && <span className="plm-error"><i className="fas fa-circle-exclamation" /> {errors.provider}</span>}

          <div className="plm-field">
            <label>Amount ({currency})</label>
            <div className="plm-amount-wrap">
              <span>{currency === 'USD' ? '$' : '₦'}</span>
              <input
                ref={amountRef}
                type="number"
                min="0.01"
                step="0.01"
                className={`theme-${theme} ${errors.amount ? 'has-error' : ''}`}
                placeholder={`Full balance ${formatAmount(balanceDue, currency)}`}
                value={form.amount}
                onChange={(event) => setField('amount', event.target.value)}
                onWheel={(event) => event.target.blur()}
              />
            </div>
            {errors.amount ? (
              <span className="plm-error"><i className="fas fa-circle-exclamation" /> {errors.amount}</span>
            ) : (
              <button type="button" className="plm-fill-btn" onClick={() => setField('amount', balanceDue.toFixed(2))}>
                <i className="fas fa-check-double" /> Use full balance
              </button>
            )}
          </div>

          <div className="plm-field">
            <label>Request Expiry</label>
            <SelectInput
              options={EXPIRY_OPTIONS}
              value={form.expires_in_days}
              onChange={(value) => setField('expires_in_days', Number(value))}
            />
          </div>

          <label className={`plm-check theme-${theme}`}>
            <input
              type="checkbox"
              checked={form.send_email}
              onChange={(event) => setField('send_email', event.target.checked)}
            />
            <span>
              <strong>Email this request to the customer now</strong>
              <small>The customer receives either Paystack checkout or manual bank-payment instructions.</small>
            </span>
          </label>

          {provider === 'paystack' && currency !== 'NGN' && (
            <div className="plm-note warning">
              <i className="fas fa-triangle-exclamation" /> Paystack is safest for NGN unless your Paystack account has confirmed support for this invoice currency.
            </div>
          )}
        </div>

        <div className="plm-actions">
          <button type="button" className="plm-btn ghost" disabled={loading} onClick={onClose}>Cancel</button>
          <button type="button" className="plm-btn primary" disabled={loading} onClick={handleSubmit}>
            {loading ? <><span className="plm-spinner" /> Creating...</> : <><i className="fas fa-link" /> Create Request</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentLinkModal;
