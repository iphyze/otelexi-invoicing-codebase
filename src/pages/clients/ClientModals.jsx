// pages/clients/ClientModals.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';
import useClientStore from '../../stores/useClientStore';
import useToastStore from '../../stores/useToastStore';
import SelectInput from '../../components/SelectInput';
import './ClientModals.css';

// ── Options ───────────────────────────────────────────────────────

const CURRENCY_OPTIONS = [
  { value: 'NGN', label: '₦ Nigerian Naira (NGN)', icon: 'fa-money-bill' },
  { value: 'USD', label: '$ US Dollar (USD)', icon: 'fa-dollar-sign' },
];
const PAYMENT_OPTIONS = [
  { value: 'due_on_receipt', label: 'Due on Receipt', icon: 'fa-clock' },
  { value: 'net_7', label: 'Net 7 Days', icon: 'fa-calendar-days' },
];
const COUNTRY_OPTIONS = [
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'Ghana', label: 'Ghana' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Other', label: 'Other' },
];

// ── Toggle Switch ─────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, note }) => (
  <div className="cf-toggle-wrap">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`cf-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="cf-toggle-thumb" />
    </button>
    <div className="cf-toggle-text">
      <span className="cf-toggle-label">{label}</span>
      {note && <span className="cf-toggle-note">{note}</span>}
    </div>
  </div>
);

// ── Slide-over shell ──────────────────────────────────────────────

const SlideOver = ({ open, onClose, disabled = false, title, subtitle, children, theme }) => {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);

  // ── Open → mount + animate in ──────────────────────────────
  // ── Close → animate out, then unmount ─────────────────────
  useEffect(() => {
    if (open) {
      clearTimeout(timerRef.current);
      setMounted(true);
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
      timerRef.current = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timerRef.current);
    }
  }, [active, mounted]);

  // Safety cleanup
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Escape key — only when open and not disabled
  useEffect(() => {
    if (!open || disabled) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, disabled]);

  const handleBackdropClick = () => {
    if (disabled) return;
    onClose(); // parent sets open=false → triggers exit animation
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={`so-backdrop ${active ? 'so-visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`so-panel theme-${theme} ${active ? 'so-panel-in' : 'so-panel-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="so-header">
          <div>
            <h3 className="so-title">{title}</h3>
            {subtitle && <p className="so-subtitle">{subtitle}</p>}
          </div>
          <button
            className="so-close"
            onClick={() => { if (!disabled) onClose(); }}
            type="button"
            style={disabled ? { opacity: 0.3, pointerEvents: 'none' } : undefined}
          >
            <i className="fas fa-xmark" />
          </button>
        </div>
        <div className="so-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

// ── Field helpers ─────────────────────────────────────────────────

const Field = ({ label, required, error, children }) => (
  <div className="cf-field">
    {label && (
      <label className="cf-label">
        {label}{required && <span className="cf-required">*</span>}
      </label>
    )}
    {children}
    {error && <span className="cf-error"><i className="fas fa-circle-exclamation" /> {error}</span>}
  </div>
);

const Input = ({ error, ...props }) => (
  <input className={`cf-input ${error ? 'has-error' : ''}`} {...props} />
);

const Textarea = ({ error, ...props }) => (
  <textarea className={`cf-input cf-textarea ${error ? 'has-error' : ''}`} rows={3} {...props} />
);

// ── CLIENT FORM MODAL ─────────────────────────────────────────────

const EMPTY_CLIENT = {
  company_name: '', billing_address: '', shipping_address: '',
  city: '', state: '', country: 'Nigeria',
  email: '', phone: '', tax_id: '',
  currency: 'NGN', payment_terms: 'due_on_receipt',
};

const validateClient = (form) => {
  const e = {};
  if (!form.company_name.trim()) e.company_name = 'Company name is required.';
  if (!form.billing_address.trim()) e.billing_address = 'Billing address is required.';
  if (!form.city.trim()) e.city = 'City is required.';
  if (!form.state.trim()) e.state = 'State is required.';
  if (!form.phone.trim()) e.phone = 'Phone number is required.';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    e.email = 'Enter a valid email address.';
  return e;
};

export const ClientFormModal = ({ open, onClose, client = null }) => {
  const { theme } = useThemeStore();
  const { createClient, editClient } = useClientStore();
  const { showToast } = useToastStore();
  const isEdit = !!client;

  const [form, setForm] = useState({ ...EMPTY_CLIENT });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(client ? { ...EMPTY_CLIENT, ...client } : { ...EMPTY_CLIENT });
      setErrors({});
      setSameAddress(false);
    }
  }, [open, client]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleSameAddress = (checked) => {
    setSameAddress(checked);
    if (checked) setForm((f) => ({ ...f, shipping_address: f.billing_address }));
    else setForm((f) => ({ ...f, shipping_address: '' }));
  };

  const handleSubmit = async () => {
    const errs = validateClient(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      if (isEdit) payload.id = client.id;
      const res = isEdit ? await editClient(payload) : await createClient(payload);
      showToast(res.message || `Client ${isEdit ? 'updated' : 'created'} successfully.`, 'success');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Something went wrong.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      disabled={loading}
      title={isEdit ? 'Edit Client' : 'Add New Client'}
      subtitle={isEdit ? `Editing ${client?.company_name}` : 'Fill in the details below to add a new client.'}
      theme={theme}
    >
      <div className="cf-grid-2">
        <Field label="Company Name" required error={errors.company_name}>
          <Input placeholder="e.g. Acme Corporation" value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)} error={errors.company_name} />
        </Field>
        <Field label="Phone" required error={errors.phone}>
          <Input placeholder="+234 800 000 0000" value={form.phone}
            onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
        </Field>
      </div>

      <Field label="Email Address" error={errors.email}>
        <Input type="email" placeholder="contact@company.com" value={form.email}
          onChange={(e) => set('email', e.target.value)} error={errors.email} />
      </Field>

      <Field label="Billing Address" required error={errors.billing_address}>
        <Textarea placeholder="Full billing address..." value={form.billing_address}
          onChange={(e) => { set('billing_address', e.target.value); if (sameAddress) set('shipping_address', e.target.value); }}
          error={errors.billing_address} />
      </Field>

      <Toggle
        checked={sameAddress}
        onChange={handleSameAddress}
        label="Shipping address same as billing"
      />

      {!sameAddress && (
        <Field label="Shipping Address">
          <Textarea placeholder="Shipping address (if different)..." value={form.shipping_address}
            onChange={(e) => set('shipping_address', e.target.value)} />
        </Field>
      )}

      <div className="cf-grid-3">
        <Field label="City" required error={errors.city}>
          <Input placeholder="Lagos" value={form.city}
            onChange={(e) => set('city', e.target.value)} error={errors.city} />
        </Field>
        <Field label="State" required error={errors.state}>
          <Input placeholder="Lagos State" value={form.state}
            onChange={(e) => set('state', e.target.value)} error={errors.state} />
        </Field>
        <Field label="Country">
          <SelectInput options={COUNTRY_OPTIONS} value={form.country}
            onChange={(v) => set('country', v)} searchable />
        </Field>
      </div>

      <div className="cf-grid-2">
        <Field label="Currency">
          <SelectInput options={CURRENCY_OPTIONS} value={form.currency}
            onChange={(v) => set('currency', v)} />
        </Field>
        <Field label="Payment Terms">
          <SelectInput options={PAYMENT_OPTIONS} value={form.payment_terms}
            onChange={(v) => set('payment_terms', v)} />
        </Field>
      </div>

      <Field label="Tax ID / VAT Number">
        <Input placeholder="Client TIN or VAT number (optional)" value={form.tax_id}
          onChange={(e) => set('tax_id', e.target.value)} />
      </Field>

      <div className="cf-actions">
        <button className="cf-btn cf-cancel" onClick={onClose} disabled={loading} type="button">Cancel</button>
        <button className="cf-btn cf-submit" onClick={handleSubmit} disabled={loading} type="button">
          {loading ? <><span className="cf-spinner" /> Saving...</> : (isEdit ? 'Save Changes' : 'Create Client')}
        </button>
      </div>
    </SlideOver>
  );
};

// ── CONTACT FORM MODAL ────────────────────────────────────────────

const EMPTY_CONTACT = {
  client_id: '', name: '', email: '', phone: '', position: '', is_primary: 0,
};

const validateContact = (form) => {
  const e = {};
  if (!form.client_id) e.client_id = 'Please select a client.';
  if (!form.name.trim()) e.name = 'Contact name is required.';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    e.email = 'Enter a valid email address.';
  return e;
};

export const ContactFormModal = ({ open, onClose, contact = null, preselectedClientId = null }) => {
  const { theme } = useThemeStore();
  const { createContact, editContact } = useClientStore();
  const { showToast } = useToastStore();
  const isEdit = !!contact;

  const [form, setFormState] = useState({ ...EMPTY_CONTACT });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientOptions, setClientOptions] = useState([]);
  const [clientSearching, setClientSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setFormState(contact
        ? { ...EMPTY_CONTACT, ...contact, is_primary: contact.is_primary ?? 0 }
        : { ...EMPTY_CONTACT, client_id: preselectedClientId || '' }
      );
      setErrors({});
    }
  }, [open, contact, preselectedClientId]);

  // Debounced client search
  useEffect(() => {
    if (!clientSearch) { setClientOptions([]); return; }
    const t = setTimeout(async () => {
      setClientSearching(true);
      try {
        const clientService = (await import('../../services/clientService')).default;
        const res = await clientService.searchClients(clientSearch);
        setClientOptions(res.data.data.map((c) => ({ value: c.id, label: `${c.company_name} — ${c.city}` })));
      } catch { setClientOptions([]); }
      finally { setClientSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [clientSearch]);

  const set = (key, val) => {
    setFormState((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleSubmit = async () => {
    const errs = validateContact(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = isEdit
        ? await editContact(contact.id, { ...form, client_id: Number(form.client_id) })
        : await createContact({ ...form, client_id: Number(form.client_id) });
      showToast(res.message || `Contact ${isEdit ? 'updated' : 'added'} successfully.`, 'success');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Something went wrong.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      disabled={loading}
      title={isEdit ? 'Edit Contact' : 'Add Contact Person'}
      subtitle="Contact persons are associated with a specific client."
      theme={theme}
    >
      {!preselectedClientId && (
        <>
          <Field label="Search Client" required error={errors.client_id}>
            <div className="cf-search-client-wrap">
              <i className="fas fa-magnifying-glass cf-search-client-icon" />
              <input
                className="cf-input cf-search-client-input"
                placeholder="Type client name to search..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              {clientSearching && <span className="cf-search-spinner" />}
            </div>
            {clientOptions.length > 0 && (
              <div className="cf-client-results">
                {clientOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`cf-client-result-item ${String(form.client_id) === String(opt.value) ? 'is-selected' : ''}`}
                    onClick={() => { set('client_id', opt.value); setClientSearch(''); setClientOptions([]); }}
                  >
                    <div className="cf-client-result-avatar">{opt.label[0]}</div>
                    <span>{opt.label}</span>
                    {String(form.client_id) === String(opt.value) && <i className="fas fa-check cf-client-check" />}
                  </button>
                ))}
              </div>
            )}
            {form.client_id && (
              <div className="cf-selected-client">
                <i className="fas fa-circle-check" style={{ color: '#10b981' }} />
                <span>Client selected (ID: {form.client_id})</span>
                <button type="button" onClick={() => set('client_id', '')} className="cf-deselect">Change</button>
              </div>
            )}
          </Field>
        </>
      )}

      <Field label="Contact Name" required error={errors.name}>
        <Input placeholder="Full name" value={form.name}
          onChange={(e) => set('name', e.target.value)} error={errors.name} />
      </Field>

      <div className="cf-grid-2">
        <Field label="Email" error={errors.email}>
          <Input type="email" placeholder="email@example.com" value={form.email}
            onChange={(e) => set('email', e.target.value)} error={errors.email} />
        </Field>
        <Field label="Phone">
          <Input placeholder="+234 800 000 0000" value={form.phone}
            onChange={(e) => set('phone', e.target.value)} />
        </Field>
      </div>

      <Field label="Position / Job Title">
        <Input placeholder="e.g. Procurement Manager" value={form.position}
          onChange={(e) => set('position', e.target.value)} />
      </Field>

      <Toggle
        checked={form.is_primary === 1}
        onChange={(v) => set('is_primary', v ? 1 : 0)}
        label="Set as primary contact"
        note="Setting this as primary will demote any existing primary contact."
      />

      <div className="cf-actions">
        <button className="cf-btn cf-cancel" onClick={onClose} disabled={loading} type="button">Cancel</button>
        <button className="cf-btn cf-submit" onClick={handleSubmit} disabled={loading} type="button">
          {loading ? <><span className="cf-spinner" /> Saving...</> : (isEdit ? 'Save Changes' : 'Add Contact')}
        </button>
      </div>
    </SlideOver>
  );
};

export default { ClientFormModal, ContactFormModal };