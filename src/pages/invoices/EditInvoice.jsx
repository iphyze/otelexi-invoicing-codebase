// pages/invoices/EditInvoice.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useInvoiceStore from '../../stores/useInvoiceStore';
import useToastStore from '../../stores/useToastStore';
import useClientStore from '../../stores/useClientStore';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import LineItemsBuilder, { EMPTY_ITEM, calcItem, calcTotals } from '../quotations/LineItemsBuilder';
import { ClientFormModal } from '../clients/ClientModals';
import '../quotations/QuotationForm.css';
import './InvoiceForm.css';

const CURRENCY_OPTS = [
  { value: 'NGN', label: '₦ Nigerian Naira (NGN)', icon: 'fa-money-bill' },
  { value: 'USD', label: '$ US Dollar (USD)',       icon: 'fa-dollar-sign' },
];
const TERMS_OPTS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_7',          label: 'Net 7 Days' },
];

const validate = (form, items) => {
  const e = {};
  if (!form.client_id)    e.client_id  = 'Please select a client.';
  if (!form.issue_date)   e.issue_date = 'Issue date is required.';
  if (items.length === 0) e.items      = 'At least one line item is required.';
  items.forEach((item, i) => {
    if (!item.description?.trim()) e[`item_${i}`] = `Item ${i+1}: description required.`;
    if (!item.quantity || Number(item.quantity) <= 0) e[`item_${i}_q`] = `Item ${i+1}: quantity must be positive.`;
    if (item.unit_price === '' || Number(item.unit_price) < 0) e[`item_${i}_p`] = `Item ${i+1}: valid price required.`;
  });
  if (form.currency === 'USD' && (!form.exchange_rate || Number(form.exchange_rate) <= 0))
    e.exchange_rate = 'Exchange rate required for USD invoices.';
  return e;
};

const apiItemToLocal = (item) => calcItem({
  product_id: item.product_id || null,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  tax_rate: item.tax_rate,
  discount_type: item.discount_type || 'none',
  discount_value: item.discount_value || 0,
  discount_amount: item.discount_amount || 0,
  tax_amount: item.tax_amount || 0,
  line_total: item.line_total || 0,
});

const EditInvoice = () => {
  const { id } = useParams();
  const { theme } = useThemeStore();
  const navigate  = useNavigate();
  const { showToast } = useToastStore();
  const { fetchSingleInvoice, editInvoice, selectedInvoice: invoice, singleLoading } = useInvoiceStore();
  const { clients, fetchClients } = useClientStore();

  const [nav, setNav] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [form, setFormState] = useState({
    client_id: '', issue_date: '', currency: 'NGN', exchange_rate: '',
    payment_terms: 'due_on_receipt', discount_type: 'none', discount_value: 0, notes: '',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  useEffect(() => {
    document.title = 'Otelex | Edit Invoice';
    fetchClients({ limit: 200, status: 'active' });
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    setFetchError(null);
    try {
      const inv = await fetchSingleInvoice(id);
      if (inv.status !== 'draft') {
        showToast('Only draft invoices can be edited.', 'error');
        navigate(`/invoices/${id}`);
        return;
      }
      setFormState({
        client_id:      inv.client?.id || '',
        issue_date:     inv.issue_date,
        currency:       inv.currency,
        exchange_rate:  inv.exchange_rate !== 1 ? inv.exchange_rate : '',
        payment_terms:  inv.payment_terms || 'due_on_receipt',
        discount_type:  inv.discount_type,
        discount_value: inv.discount_value,
        notes:          inv.notes || '',
      });
      setItems(inv.items?.length > 0 ? inv.items.map(apiItemToLocal) : [{ ...EMPTY_ITEM }]);
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Failed to load invoice.');
    }
  };

  const setField = (key, val) => {
    setFormState((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleClientChange = (clientId) => {
    setField('client_id', clientId);
    const client = clients.find((c) => c.id === Number(clientId));
    if (client) setFormState((f) => ({ ...f, client_id: clientId, currency: client.currency, payment_terms: client.payment_terms || 'due_on_receipt' }));
  };

  const dueDate = form.issue_date
    ? form.payment_terms === 'due_on_receipt'
      ? form.issue_date
      : new Date(new Date(form.issue_date).getTime() + 7 * 86400000).toISOString().split('T')[0]
    : '—';

  const totals = calcTotals(items, form.discount_type, form.discount_value);
  const clientOptions = clients.map((c) => ({ value: c.id, label: `${c.company_name} — ${c.city}`, icon: 'fa-building' }));

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
        payment_terms:  form.payment_terms,
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
      const res = await editInvoice(id, payload);
      showToast(res.message || 'Invoice updated successfully.', 'success');
      navigate(`/invoices/${id}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update invoice.', 'error');
    } finally { setSaving(false); }
  };

  if (singleLoading) return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} /><NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav pageTitle="Edit Invoice" links={[{ label: 'Dashboard', to: '/' }, { label: 'Invoices', to: '/invoices' }, { label: 'Edit', active: true }]} />
        <div className="qf-load-state">{[...Array(4)].map((_, i) => <div key={i} className="qf-load-shimmer" style={{ width: `${60 + i * 10}%` }} />)}</div>
      </div>
    </div>
  );

  if (fetchError) return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} /><NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <div className={`qf-error-state theme-${theme}`}>
          <i className="fas fa-triangle-exclamation" />
          <h4>Failed to Load Invoice</h4><p>{fetchError}</p>
          <button onClick={loadInvoice} type="button"><i className="fas fa-rotate-right" /> Retry</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />
      <div className="page-content">
        <PageNav
          pageTitle={invoice ? `Edit ${invoice.invoice_number}` : 'Edit Invoice'}
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Invoices', to: '/invoices' }, { label: invoice?.invoice_number || 'Edit', to: `/invoices/${id}` }, { label: 'Edit', active: true }]}
        />
        <div className="qf-edit-notice">
          <i className="fas fa-circle-info" />
          <span>Only <strong>draft</strong> invoices can be edited. Saving replaces all existing line items.</span>
        </div>

        <div className="qf-layout">
          <div className="qf-main">
            <div className={`qf-card theme-${theme}`}>
              <h3 className="qf-card-title"><i className="fas fa-file-invoice" /> Invoice Details</h3>
              <div className="qf-field">
                <label className="qf-label">Client <span className="qf-req">*</span></label>
                <div className="qf-client-row">
                  <div className="qf-client-select">
                    <SelectInput options={clientOptions} value={form.client_id} onChange={handleClientChange} placeholder="Select active client..." searchable error={errors.client_id} />
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
                  <button type="button" className="qf-new-btn" onClick={() => setClientModalOpen(true)}><i className="fas fa-plus" /> New</button>
                </div>
                {errors.client_id && <span className="qf-error"><i className="fas fa-circle-exclamation" /> {errors.client_id}</span>}
              </div>
              <div className="qf-grid-3">
                <div className="qf-field">
                  <DatePicker label="Issue Date" required value={form.issue_date} onChange={(v) => setField('issue_date', v)} error={errors.issue_date} />
                </div>
                <div className="qf-field">
                  <label className="qf-label">Payment Terms</label>
                  <SelectInput options={TERMS_OPTS} value={form.payment_terms} onChange={(v) => setField('payment_terms', v)} />
                </div>
                <div className="qf-field">
                  <label className="qf-label">Due Date <span className="qf-hint">Auto-calculated</span></label>
                  <DatePicker value={dueDate !== '—' ? dueDate : ''} onChange={() => {}} disabled placeholder="Auto-calculated" />
                </div>
              </div>
              <div className="qf-grid-2">
                <div className="qf-field">
                  <label className="qf-label">Currency</label>
                  <SelectInput options={CURRENCY_OPTS} value={form.currency} onChange={(v) => setField('currency', v)} />
                </div>
                {form.currency === 'USD' && (
                  <div className="qf-field">
                    <label className="qf-label">Exchange Rate <span className="qf-req">*</span></label>
                    <input type="number" min="1" step="0.01" className={`qf-input theme-${theme} ${errors.exchange_rate ? 'has-error' : ''}`}
                      placeholder="e.g. 1550.00" value={form.exchange_rate}
                      onChange={(e) => setField('exchange_rate', e.target.value)} onWheel={(e) => e.target.blur()} />
                    {errors.exchange_rate && <span className="qf-error"><i className="fas fa-circle-exclamation" /> {errors.exchange_rate}</span>}
                  </div>
                )}
              </div>
              <div className="qf-field">
                <label className="qf-label">Notes <span className="qf-hint">Optional</span></label>
                <textarea className={`qf-input qf-textarea theme-${theme}`} placeholder="Any notes or terms..." rows={3}
                  value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
              </div>
            </div>
            <div className={`qf-card theme-${theme}`}>
              <h3 className="qf-card-title"><i className="fas fa-list" /> Line Items</h3>
              {errors.items && <p className="qf-error qf-items-error"><i className="fas fa-circle-exclamation" /> {errors.items}</p>}
              <LineItemsBuilder items={items} onChange={setItems} docDiscountType={form.discount_type} docDiscountValue={form.discount_value}
                onDocDiscountChange={(key, val) => setField(key === 'discount_type' ? 'discount_type' : 'discount_value', val)} currency={form.currency} />
            </div>
          </div>
          <div className="qf-sidebar">
            <div className={`qf-card qf-sticky theme-${theme}`}>
              <h3 className="qf-card-title"><i className="fas fa-receipt" /> Summary</h3>
              <div className="qf-summary">
                <div className="qf-sum-row"><span>Subtotal</span><span>₦{Number(totals.subtotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>
                {totals.discount_amount > 0 && <div className="qf-sum-row qf-sum-disc"><span>Discount ({form.discount_value}%)</span><span>-₦{Number(totals.discount_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>}
                <div className="qf-sum-row"><span>VAT</span><span>₦{Number(totals.tax_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>
                <div className="qf-sum-divider" />
                <div className="qf-sum-row qf-sum-total"><span>Total</span><span>₦{Number(totals.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></div>
              </div>
              <div className="qf-info-chips">
                <div className="qf-info-chip"><i className="fas fa-calendar-plus" /><span>Issue: {form.issue_date || '—'}</span></div>
                <div className="qf-info-chip"><i className="fas fa-calendar-check" /><span>Due: {dueDate}</span></div>
                <div className="qf-info-chip"><i className="fas fa-clock" /><span>Terms: {form.payment_terms === 'net_7' ? 'Net 7 Days' : 'Due on Receipt'}</span></div>
                <div className="qf-info-chip"><i className="fas fa-list-ol" /><span>{items.length} item{items.length !== 1 ? 's' : ''}</span></div>
              </div>
              <div className="qf-actions">
                <button className="qf-save-btn draft" onClick={handleSave} disabled={saving} type="button">
                  {saving ? <><span className="qf-spinner" /> Saving...</> : <><i className="fas fa-floppy-disk" /> Save Changes</>}
                </button>
              </div>
              <button className="qf-cancel-link" onClick={() => navigate(`/invoices/${id}`)} type="button">
                <i className="fas fa-xmark" /> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <ClientFormModal open={clientModalOpen} onClose={() => { setClientModalOpen(false); fetchClients({ limit: 200, status: 'active' }); }} />
    </div>
  );
};

export default EditInvoice;
