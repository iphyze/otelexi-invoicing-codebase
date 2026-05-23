// pages/quotations/CreateQuotation.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import DocumentFormHero from '../../components/documents/DocumentFormHero';
import useThemeStore from '../../stores/useThemeStore';
import useQuotationStore from '../../stores/useQuotationStore';
import useToastStore from '../../stores/useToastStore';
import useClientStore from '../../stores/useClientStore';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import LineItemsBuilder, { EMPTY_ITEM, calcTotals } from './LineItemsBuilder';
import { ClientFormModal } from '../clients/ClientModals';
import './QuotationForm.css';

const CURRENCY_OPTS = [
  { value: 'NGN', label: '₦ Nigerian Naira (NGN)', icon: 'fa-money-bill' },
  { value: 'USD', label: '$ US Dollar (USD)',       icon: 'fa-dollar-sign' },
];

const validate = (form, items) => {
  const e = {};
  if (!form.client_id)    e.client_id   = 'Please select a client.';
  if (!form.issue_date)   e.issue_date  = 'Issue date is required.';
  if (items.length === 0) e.items       = 'At least one line item is required.';
  items.forEach((item, i) => {
    if (!item.description?.trim()) e[`item_${i}_desc`] = `Item ${i + 1}: description required.`;
    if (!item.quantity || Number(item.quantity) <= 0) e[`item_${i}_qty`] = `Item ${i + 1}: quantity must be positive.`;
    if (item.unit_price === '' || Number(item.unit_price) < 0) e[`item_${i}_price`] = `Item ${i + 1}: valid price required.`;
  });
  if (form.currency === 'USD' && (!form.exchange_rate || Number(form.exchange_rate) <= 0))
    e.exchange_rate = 'Exchange rate is required for USD quotations.';
  return e;
};

const CreateQuotation = () => {
  const { theme } = useThemeStore();
  const navigate  = useNavigate();
  const { showToast } = useToastStore();
  const { createQuotation } = useQuotationStore();
  const { clients, fetchClients, createClient } = useClientStore();

  const [nav, setNav] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [clientModalOpen, setClientModalOpen] = useState(false);

  const [form, setForm] = useState({
    client_id:      '',
    issue_date:     new Date().toISOString().split('T')[0],
    currency:       'NGN',
    exchange_rate:  '',
    discount_type:  'none',
    discount_value: 0,
    notes:          '',
  });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  // Load clients for the dropdown
  useEffect(() => {
    document.title = 'Otelex | New Quotation';
    fetchClients({ limit: 200, status: 'active' });
  }, []);

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  // When client selected, auto-set currency to client's currency
  const handleClientChange = (clientId) => {
    setField('client_id', clientId);
    const client = clients.find((c) => c.id === Number(clientId));
    if (client) setField('currency', client.currency);
    if (errors.client_id) setErrors((e) => ({ ...e, client_id: '' }));
  };

  const expiryDate = form.issue_date
    ? new Date(new Date(form.issue_date).getTime() + 14 * 86400000).toISOString().split('T')[0]
    : '—';

  const totals = calcTotals(items, form.discount_type, form.discount_value);

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.company_name} — ${c.city}`,
    icon: 'fa-building',
  }));

  const handleSave = async (andSend = false) => {
    const errs = validate(form, items);
    if (Object.keys(errs).length) { setErrors(errs); showToast('Please fix the errors below.', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        client_id:      Number(form.client_id),
        issue_date:     form.issue_date,
        currency:       form.currency,
        exchange_rate:  form.exchange_rate ? Number(form.exchange_rate) : 1,
        discount_type:  form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        notes:          form.notes || null,
        items: items.map((item, idx) => ({
          product_id:     item.product_id || null,
          description:    item.description,
          quantity:       Number(item.quantity),
          unit_price:     Number(item.unit_price),
          tax_rate:       Number(item.tax_rate),
          discount_type:  item.discount_type,
          discount_value: Number(item.discount_value) || 0,
          sort_order:     idx,
        })),
      };

      const res = await createQuotation(payload);
      showToast(res.message || 'Quotation created successfully.', 'success');
      navigate(`/quotations/${res.data.id}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create quotation.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="New Quotation"
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Quotations', to: '/quotations' },
            { label: 'New Quotation', active: true },
          ]}
        />

        <DocumentFormHero type="quotation" mode="create" />

        <div className="qf-layout">

          {/* ── Left: Form ── */}
          <div className="qf-main">

            {/* Header Card */}
            <div className={`qf-card theme-${theme}`}>
              <h3 className="qf-card-title"><i className="fas fa-file-pen" /> Quotation Details</h3>

              {/* Client */}
              <div className="qf-field">
                <label className="qf-label">Client <span className="qf-req">*</span></label>
                <div className="qf-client-row">
                  <div className="qf-client-select">
                    <SelectInput
                      options={clientOptions}
                      value={form.client_id}
                      onChange={handleClientChange}
                      placeholder="Select active client..."
                      searchable
                      error={errors.client_id}
                    />
                  </div>
                  {form.client_id && (
                    <button
                      type="button"
                      className="qf-clear-btn"
                      onClick={() => setField('client_id', '')}
                      title="Clear client selection"
                    >
                      <i className="fas fa-xmark" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="qf-new-btn"
                    onClick={() => setClientModalOpen(true)}
                    title="Add a new client without leaving this page"
                  >
                    <i className="fas fa-plus" /> New
                  </button>
                </div>
                {errors.client_id && <span className="qf-error"><i className="fas fa-circle-exclamation" /> {errors.client_id}</span>}
              </div>

              {/* Dates */}
              <div className="qf-grid-2">
                <div className="qf-field">
                  <DatePicker
                    label="Issue Date"
                    required
                    value={form.issue_date}
                    onChange={(v) => setField('issue_date', v)}
                    error={errors.issue_date}
                  />
                </div>
                <div className="qf-field">
                  <label className="qf-label">Expiry Date <span className="qf-hint">Auto (14 days)</span></label>
                  <DatePicker
                    value={expiryDate !== '—' ? expiryDate : ''}
                    onChange={() => {}}
                    disabled
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              {/* Currency + Exchange Rate */}
              <div className="qf-grid-2">
                <div className="qf-field">
                  <label className="qf-label">Currency</label>
                  <SelectInput
                    options={CURRENCY_OPTS}
                    value={form.currency}
                    onChange={(v) => setField('currency', v)}
                  />
                </div>
                {form.currency === 'USD' && (
                  <div className="qf-field">
                    <label className="qf-label">Exchange Rate (USD → NGN) <span className="qf-req">*</span></label>
                    <input
                      type="number" min="1" step="0.01"
                      className={`qf-input theme-${theme} ${errors.exchange_rate ? 'has-error' : ''}`}
                      placeholder="e.g. 1550.00"
                      value={form.exchange_rate}
                      onChange={(e) => setField('exchange_rate', e.target.value)}
                    />
                    {errors.exchange_rate && <span className="qf-error"><i className="fas fa-circle-exclamation" /> {errors.exchange_rate}</span>}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="qf-field">
                <label className="qf-label">Notes <span className="qf-hint">Optional</span></label>
                <textarea
                  className={`qf-input qf-textarea theme-${theme}`}
                  placeholder="Any notes or terms for the client..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                />
              </div>
            </div>

            {/* Line Items Card */}
            <div className={`qf-card theme-${theme}`}>
              <h3 className="qf-card-title"><i className="fas fa-list" /> Line Items</h3>
              {errors.items && <p className="qf-error qf-items-error"><i className="fas fa-circle-exclamation" /> {errors.items}</p>}
              <LineItemsBuilder
                items={items}
                onChange={setItems}
                docDiscountType={form.discount_type}
                docDiscountValue={form.discount_value}
                onDocDiscountChange={(key, val) => setField(key === 'discount_type' ? 'discount_type' : 'discount_value', val)}
                currency={form.currency}
              />
            </div>
          </div>

          {/* ── Right: Summary + Actions ── */}
          <div className="qf-sidebar">
            <div className={`qf-card qf-sticky theme-${theme}`}>
              <h3 className="qf-card-title"><i className="fas fa-receipt" /> Summary</h3>

              <div className="qf-summary">
                <div className="qf-sum-row">
                  <span>Subtotal</span>
                  <span>₦{Number(totals.subtotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                </div>
                {totals.discount_amount > 0 && (
                  <div className="qf-sum-row qf-sum-disc">
                    <span>Discount ({form.discount_value}%)</span>
                    <span>-₦{Number(totals.discount_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="qf-sum-row">
                  <span>VAT</span>
                  <span>₦{Number(totals.tax_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="qf-sum-divider" />
                <div className="qf-sum-row qf-sum-total">
                  <span>Total</span>
                  <span>₦{Number(totals.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="qf-info-chips">
                <div className="qf-info-chip">
                  <i className="fas fa-calendar-plus" />
                  <span>Issue: {form.issue_date || '—'}</span>
                </div>
                <div className="qf-info-chip">
                  <i className="fas fa-calendar-xmark" />
                  <span>Expires: {expiryDate}</span>
                </div>
                <div className="qf-info-chip">
                  <i className="fas fa-list-ol" />
                  <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="qf-actions">
                <button
                  className="qf-save-btn draft"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  type="button"
                >
                  {saving ? <><span className="qf-spinner" /> Saving...</> : <><i className="fas fa-floppy-disk" /> Save as Draft</>}
                </button>
              </div>

              <button
                className="qf-cancel-link"
                onClick={() => navigate('/quotations')}
                type="button"
              >
                <i className="fas fa-xmark" /> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline new client modal */}
      <ClientFormModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={(newClient) => {
          setClientModalOpen(false);
          fetchClients({ limit: 200, status: 'active' });
          handleClientChange(newClient.id);
          showToast('Client created and selected.', 'success');
        }}
      />
    </div>
  );
};

export default CreateQuotation;
