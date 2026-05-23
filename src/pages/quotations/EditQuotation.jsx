// pages/quotations/EditQuotation.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import LineItemsBuilder, { EMPTY_ITEM, calcItem, calcTotals } from './LineItemsBuilder';
import { ClientFormModal } from '../clients/ClientModals';
import './QuotationForm.css';

const CURRENCY_OPTS = [
  { value: 'NGN', label: '₦ Nigerian Naira (NGN)', icon: 'fa-money-bill' },
  { value: 'USD', label: '$ US Dollar (USD)',       icon: 'fa-dollar-sign' },
];

const validate = (form, items) => {
  const e = {};
  if (!form.client_id)    e.client_id  = 'Please select a client.';
  if (!form.issue_date)   e.issue_date = 'Issue date is required.';
  if (items.length === 0) e.items      = 'At least one line item is required.';
  items.forEach((item, i) => {
    if (!item.description?.trim()) e[`item_${i}_desc`]  = `Item ${i + 1}: description required.`;
    if (!item.quantity || Number(item.quantity) <= 0) e[`item_${i}_qty`] = `Item ${i + 1}: quantity must be positive.`;
    if (item.unit_price === '' || Number(item.unit_price) < 0) e[`item_${i}_price`] = `Item ${i + 1}: valid price required.`;
  });
  if (form.currency === 'USD' && (!form.exchange_rate || Number(form.exchange_rate) <= 0))
    e.exchange_rate = 'Exchange rate is required for USD quotations.';
  return e;
};

// Map API item to local item shape (ensure calculated fields present)
const apiItemToLocal = (apiItem) => calcItem({
  product_id:     apiItem.product_id || null,
  description:    apiItem.description,
  quantity:       apiItem.quantity,
  unit_price:     apiItem.unit_price,
  tax_rate:       apiItem.tax_rate,
  discount_type:  apiItem.discount_type || 'none',
  discount_value: apiItem.discount_value || 0,
  discount_amount: apiItem.discount_amount || 0,
  tax_amount:     apiItem.tax_amount || 0,
  line_total:     apiItem.line_total || 0,
});

const EditQuotation = () => {
  const { id } = useParams();
  const { theme } = useThemeStore();
  const navigate  = useNavigate();
  const { showToast } = useToastStore();
  const { fetchSingleQuotation, editQuotation, selectedQuotation: quotation, singleLoading } = useQuotationStore();
  const { clients, fetchClients } = useClientStore();

  const [nav, setNav] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [form, setFormState] = useState({
    client_id: '', issue_date: '', currency: 'NGN',
    exchange_rate: '', discount_type: 'none', discount_value: 0, notes: '',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  useEffect(() => {
    document.title = 'Otelex | Edit Quotation';
    fetchClients({ limit: 200, status: 'active' });
    loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    setFetchError(null);
    try {
      const q = await fetchSingleQuotation(id);
      if (q.status !== 'draft') {
        showToast('Only draft quotations can be edited.', 'error');
        navigate(`/quotations/${id}`);
        return;
      }
      setFormState({
        client_id:      q.client?.id || '',
        issue_date:     q.issue_date,
        currency:       q.currency,
        exchange_rate:  q.exchange_rate !== 1 ? q.exchange_rate : '',
        discount_type:  q.discount_type,
        discount_value: q.discount_value,
        notes:          q.notes || '',
      });
      setItems(q.items.length > 0 ? q.items.map(apiItemToLocal) : [{ ...EMPTY_ITEM }]);
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Failed to load quotation.');
    }
  };

  const setField = (key, val) => {
    setFormState((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleClientChange = (clientId) => {
    setField('client_id', clientId);
    const client = clients.find((c) => c.id === Number(clientId));
    if (client) setField('currency', client.currency);
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

  const handleSave = async () => {
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

      const res = await editQuotation(id, payload);
      showToast(res.message || 'Quotation updated successfully.', 'success');
      navigate(`/quotations/${id}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update quotation.', 'error');
    } finally { setSaving(false); }
  };

  // ── Skeleton ──────────────────────────────────────────────────
  if (singleLoading) {
    return (
      <div className={`main-container theme-${theme}`}>
        <Header setNav={setNav} nav={nav} />
        <NavBar setNav={setNav} nav={nav} />
        <div className="page-content">
          <PageNav pageTitle="Edit Quotation" links={[{ label: 'Dashboard', to: '/' }, { label: 'Quotations', to: '/quotations' }, { label: 'Edit', active: true }]} />
          <div className={`qf-load-state theme-${theme}`}>
            <div className="qf-load-shimmer" />
            <div className="qf-load-shimmer" style={{ width: '60%' }} />
            <div className="qf-load-shimmer" style={{ width: '80%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={`main-container theme-${theme}`}>
        <Header setNav={setNav} nav={nav} />
        <NavBar setNav={setNav} nav={nav} />
        <div className="page-content">
          <div className={`qf-error-state theme-${theme}`}>
            <i className="fas fa-triangle-exclamation" />
            <h4>Failed to Load Quotation</h4>
            <p>{fetchError}</p>
            <button onClick={loadQuotation} type="button"><i className="fas fa-rotate-right" /> Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle={quotation ? `Edit ${quotation.quotation_number}` : 'Edit Quotation'}
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Quotations', to: '/quotations' },
            { label: quotation?.quotation_number || 'Edit', to: `/quotations/${id}` },
            { label: 'Edit', active: true },
          ]}
        />

        <DocumentFormHero type="quotation" mode="edit" documentNumber={quotation?.quotation_number || ''} />

        {quotation && (
          <div className="qf-edit-notice">
            <i className="fas fa-circle-info" />
            <span>Only <strong>draft</strong> quotations can be edited. This will replace all existing line items.</span>
          </div>
        )}

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
                  <button type="button" className="qf-new-btn" onClick={() => setClientModalOpen(true)} title="Add new client">
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

              {/* Currency */}
              <div className="qf-grid-2">
                <div className="qf-field">
                  <label className="qf-label">Currency</label>
                  <SelectInput options={CURRENCY_OPTS} value={form.currency} onChange={(v) => setField('currency', v)} />
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

          {/* ── Right: Summary ── */}
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
                <button className="qf-save-btn draft" onClick={handleSave} disabled={saving} type="button">
                  {saving
                    ? <><span className="qf-spinner" /> Saving...</>
                    : <><i className="fas fa-floppy-disk" /> Save Changes</>
                  }
                </button>
              </div>

              <button className="qf-cancel-link" onClick={() => navigate(`/quotations/${id}`)} type="button">
                <i className="fas fa-xmark" /> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

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

export default EditQuotation;
